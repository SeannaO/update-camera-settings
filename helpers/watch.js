var sys = require('util')
  , fs = require('fs')
  , path = require('path')
  , events = require('events')
  ;

function Watch() {
}

Watch.prototype.walk = function(dir, options, callback) {
    var self = this;

  if (!callback) {callback = options; options = {}}
  if (!callback.files) callback.files = {};
  if (!callback.pending) callback.pending = 0;
  callback.pending += 1;
  fs.stat(dir, function (err, stat) {
    if (err) return callback(err);
    callback.files[dir] = stat;
    fs.readdir(dir, function (err, files) {
      if (err) return callback(err);
      callback.pending -= 1;
      files.forEach(function (f, index) {
        f = path.join(dir, f);
        callback.pending += 1;
        fs.stat(f, function (err, stat) {
          var enoent = false
            , done = false;

          if (err) {
            if (err.code !== 'ENOENT') {
              return callback(err);
            } else {
              enoent = true;
            }
          }
          callback.pending -= 1;
          done = callback.pending === 0;
          if (!enoent) {
            if (options.ignoreDotFiles && path.basename(f)[0] === '.') return done && callback(null, callback.files);
            if (options.filter && options.filter(f, stat)) return done && callback(null, callback.files);
            callback.files[f] = stat;
            if (stat.isDirectory()) self.walk(f, options, callback);
            done = callback.pending === 0;
            if (done) callback(null, callback.files);
          }
        })
      })
      if (callback.pending === 0) callback(null, callback.files);
    })
    if (callback.pending === 0) callback(null, callback.files);
  })

}

Watch.prototype.watchTree = function ( root, options, callback ) {
  if (!callback) {callback = options; options = {}}
  this.walk(root, options, function (err, files) {
    if (err) throw err;
    var fileWatcher = function (f) {
      fs.watchFile(f, options, function (c, p) {
        // Check if anything actually changed in stat
        if (files[f] && !files[f].isDirectory() && c.nlink !== 0 && files[f].mtime.getTime() == c.mtime.getTime()) return;
        files[f] = c;
        if (!files[f].isDirectory()) callback(f, c, p);
        else {
          fs.readdir(f, function (err, nfiles) {
            if (err) return;
            nfiles.forEach(function (b) {
              var file = path.join(f, b);
              if (!files[file] && (options.ignoreDotFiles !== true || b[0] != '.')) {
                fs.stat(file, function (err, stat) {
                  callback(file, stat, null);
                  files[file] = stat;
                  fileWatcher(file);
                })
              }
            })
          })
        }
        if (c.nlink === 0) {
          // unwatch removed files.
          delete files[f]
          fs.unwatchFile(f);
        }
      })
    }
    fileWatcher(root);
    for (var i in files) {
      fileWatcher(i);
    }
    callback(files, null, null);
  })
}

Watch.prototype.createMonitor = function (root, options, cb) {
  if (!cb) {cb = options; options = {}}
  var monitor = new events.EventEmitter();

  var prevFile = {file: null,action: null};
  exports.watchTree(root, options, function (f, curr, prev) {
    if (typeof f == "object" && prev == null && curr === null) {
      monitor.files = f;
      return cb(monitor);
    }
    if (prev === null && (prevFile.file != f || prevFile.action != "created")) {
      prevFile = { file: f, action: "created" };
      return monitor.emit("created", f, curr);
    }
    if (curr.nlink === 0 && (prevFile.file != f || prevFile.action != "removed")) {
      prevFile = { file: f, action: "removed" };
      return monitor.emit("removed", f, curr);
    }
    if (prevFile.file != null) {
      prevFile = {file: null,action: null};
    } else {
      monitor.emit("changed", f, curr, prev);
    }
  })
}

module.exports = Watch;
