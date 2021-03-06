var EventEmitter = require('events').EventEmitter;
var util = require('util');
var fs = require('fs');
var path = require('path');

// file: the location of sqlite
var FileBackup = function( file, options, cb) {
	options = options || {};
	//options: interval, backupLimit
	this.file = file;
	this.backupInterval = options.backupInterval || 300000; // 5 minutes
	this.purgeInterval = options.purgeInterval || 600000; // 10 minutes
	this.backupLimit = options.backupLimit || 5;
	this.backupProcess = null;
	this.purgeProcess = null;
	this.backupFolder = options.backupFolder || path.dirname(file) + "/backup";
	this.backups = [];
	this.setup(cb);
	this.purging= false;
	// load the list of backups into memory
};

util.inherits(FileBackup, EventEmitter);

FileBackup.prototype.setup = function(cb) {
	var self = this;
	this.backups = [];
	fs.exists( this.backupFolder, function(exists) {
		if (exists) {
			fs.readdir(self.backupFolder, function(err, list) {
				if (err){
					if (cb) cb(err);
				}else{
					var filename = path.basename(self.file);
					self.backups = list.filter(function(ele){
						return (ele.substr(0,filename.length) == filename);
					}).map(function(ele) {
						var re = /([\d]+).backup/;
						matches = re.exec(ele);
						// if matches is empty, 'matches[1]' will crash the code
						var time = matches ? parseInt(matches[1], 10) : -1;
						return { name:ele, time: time }; 
					}).sort(function(a, b) {
						return a.time - b.time;
					});
					if (cb) cb(self);
				}
			});
		} else {
			fs.mkdir(self.backupFolder, function(e) {
				if (cb) cb(self);
			});
		}
	}); 
};


FileBackup.prototype.launch = function() {

	var self = this;
	self.purgeProcess = setInterval( function(){
		if (!self.purging){
			self.purgeOldBackup();
		}
	}, self.purgeInterval);
	self.backupProcess = setInterval( function(){
		self.backup();
	}, self.backupInterval);	
};

FileBackup.prototype.isRunning = function() {
    return this.backupProcess && this.purgeProcess;
};

FileBackup.prototype.stop = function() {

    // console.log("Clearing Scheduler for camera:" + camera.name);
    clearInterval(this.purgeProcess);
    this.purgeProcess = null;
    clearInterval(this.backupProcess);
    this.backupProcess = null;
};


FileBackup.prototype.purgeOldBackup = function() {
	var self = this;
	if (self.backups.length > self.backupLimit){
		self.purging = true
		var backup = self.backups.shift();
		console.log("purging: " + self.backupFolder + "/" + backup.name)
		fs.unlink(self.backupFolder + "/" + backup.name, function(err){
			if (err){
				console.log("Error while purging backup: ");
				console.error(err);
			}
			self.purgeOldBackup();
		});
	}else{
		self.purging = false;
	}
};				

FileBackup.prototype.backup = function(cb) {
	console.log("backing up");
	var self = this;
	var timestamp = new Date().getTime();
	var backup_name = path.basename(this.file) + "_" + timestamp + ".backup";
	var backup = { name:backup_name, time:timestamp};
	self.backups.push(backup);
	copyFile(this.file, this.backupFolder + "/" + backup_name, function(err) { 
		if (err) {
			console.error("[FileBackup]: error when moving file: " + err);
			self.emit("error", err);
			if (cb) cb();
		}
		else {
			self.emit("backup", backup);
			if (cb) cb();
		}
	});

	function copyFile(source, target, cb) {
		var cbCalled = false;

		var rd = fs.createReadStream(source);
		rd.on("error", function(err) {
			done(err);
		});

		var wr = fs.createWriteStream(target);
		wr.on("error", function(err) {
			done(err);
		});
		wr.on("close", function(ex) {
			done();
		});
		rd.pipe(wr);

		function done(err) {
			if (!cbCalled) {
				cb(err);
				cbCalled = true;
			}
		}
	}
};

// restores the most recent backup
FileBackup.prototype.restore = function(cb) {
	var self = this;
	var backup = self.backups.pop();
	if (backup){
		fs.rename(this.backupFolder + "/" + backup.name, this.file, function(err) { 
			if (err) {
				console.error("[FileBackup]: error when restoring backup: " + this.backupFolder + "/" + backup.name);
				console.error(err);
				self.emit("error", err);
				if (cb) cb(err);
			}
			else {
				self.emit("restore", backup);
				if (cb) cb(null, backup);
			}
		});		
	}else{
		self.emit("no backups");
		cb("empty");
	}

};

module.exports = FileBackup;
