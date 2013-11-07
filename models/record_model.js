var ffmpeg = require('./../helpers/ffmpeg.js');
var fs = require('fs');
var path = require('path');
var Watch = require('./../helpers/watch');
var pending = [];
var lastEndTime = 0;
var exec = require('child_process').exec;

var events = require('events');

function RecordModel( datastore, camera ) {

    this.rtsp = camera.rtsp;
    this.db = datastore;
    this.camId = camera._id;
    this.lastVideo = 0;
    this.watch = new Watch();
    this.folder = "";
    
    this.setupFolders( camera );

    this.setupWatcher( this.folder + "/videos/tmp" );

    console.log("record constructor");    
    console.log("camera: " + camera.name);
    console.log("folder: " + this.folder);
    console.log("rtsp: " + this.rtsp);

    events.EventEmitter.call(this);
   
}

RecordModel.super_ = events.EventEmitter;
RecordModel.prototype = Object.create(events.EventEmitter.prototype, {
    constructor: {
        value: RecordModel,
        enumerable: false
    }
});


RecordModel.prototype.setupFolders = function( camera ) {

    this.folder = camera.videosFolder;
   
    this.setupFolderSync(this.folder);
    this.setupFolderSync(this.folder + "/tmp");
    this.setupFolderSync(this.folder + "/videos");
    this.setupFolderSync(this.folder + "/videos/tmp");
    this.setupFolderSync(this.folder + "/thumbs");
 
    var tmpFolder = this.folder + "/videos/tmp";
    fs.readdirSync(tmpFolder).forEach(function(file, index){

        var curPath = tmpFolder + "/" + file;

        if(fs.statSync(curPath).isDirectory()) { 
            deleteFolderRecursive(curPath);

        } else { 
            fs.unlinkSync(curPath);
        }
    });
};

RecordModel.prototype.updateCameraInfo = function( camera ) {
    this.rtsp = camera.rtsp;
    this.camId = camera._id;
};


RecordModel.prototype.stopRecording = function() {
    
    if (this.ffmpegProcess) {
        console.log("killing ffmpeg process: " + this.ffmpegProcess.pid);

        this.ffmpegProcess.removeAllListeners('exit');
        this.ffmpegProcess.kill();
        var exec = require('child_process').exec;
        exec("kill -s 9 " + this.ffmpegProcess.pid, function(err) {console.log(err);});
        
    }
};


RecordModel.prototype.startRecording = function() {    
    this.recordContinuously();
};



RecordModel.prototype.setupFolderSync = function(folder) {

    if ( fs.existsSync(folder) ){
        return true;
    } else {
        fs.mkdirSync(folder);
        return false;
    }
};


moveFilesSync = function( recordModel, pendingList, cb ) {

    var pendingVideo = pendingList.shift();

    if (!pendingVideo) {

        cb();
        return;
    } else {

        var self = recordModel;
        var from = self.folder + "/videos/tmp/" + path.basename( pendingVideo.file );
        var to = self.folder + "/videos/" + pendingVideo.start + path.extname( pendingVideo.file );

        fs.exists( from, function(exists) {
            if (exists) {
                fs.rename( from, to, function(err) { 
                    if (err) {
                        console.log("error when moving file: " + err);
                    }
                    else {
                        pendingVideo.file = to;
                        ffmpeg.makeThumb( to, self.folder + "/thumbs", {width: 160, height: 120}, function() {
                            self.emit('chunk', {
                                chunk: to
                            });   
                        });
                        self.db.insertVideo( pendingVideo );
                    }                        
                    moveFilesSync( recordModel, pendingList, cb );
                });
            } else {
                moveFilesSync( recordModel, pendingList, cb );
            }
        });
    }
};


// - -
// 
RecordModel.prototype.setupWatcher = function( dir ) {
    
    console.log("** setupWacher");
    console.log("watching " + dir);

    var self = this;

    this.watch.watchTree( dir, function(f, curr, prev) {

        if ( typeof f == "object"  && prev === null && curr === null ) {
            //
        } else if (prev === null) {

            self.addNewVideosToPendingList( function() {
                moveFilesSync( self, pending, function() {
                    //
                });
            });
        }
    });
};
// - - -

RecordModel.prototype.addNewVideosToPendingListSync = function( files, cb ) {

    var self = this;
    var file = files.shift();

    if (file) {
        
        file = self.folder + "/videos/tmp/" + file;

        fs.exists(file, function(exists) {

            if ( exists && path.extname(file) === '.ts' ) {

                try {
                    var fileInfo = fs.statSync( file );
                    var lastModified = ( new Date(fileInfo.mtime) ).getTime();

                    ffmpeg.calcDuration( file, function(duration, f) {

                        var start =  lastModified - duration;
                        var end = lastModified;

                        var video = {
                            cam: self.camId,
                            start: start,
                            end: end,
                            file: file
                        };

                        pending.push( video );

                        lastEndTime = end;

                        self.addNewVideosToPendingListSync( files, cb );
                    });
                } catch(err) {
                }
            } else {
                 self.addNewVideosToPendingListSync( files, cb );
            }
        });  
    } else {
        cb();
    }
};


// - -
//
RecordModel.prototype.addNewVideosToPendingList = function( cb ) {

    var self = this;

    fs.readdir( self.folder + "/videos/tmp", function(err, files) {
        var dir = self.folder + "/videos/tmp/";
        files.sort(function(a, b) {
               return fs.statSync(dir + b).mtime.getTime() - 
                      fs.statSync(dir + a).mtime.getTime();
           });
        
        files.shift();
            
        if (err) {

            console.log("there was an error when trying to list files on tmp folder: " + err);
            cb();
        } else {
            
            self.addNewVideosToPendingListSync( files, function() {
                cb();
            });
        }
    });
};
// - - -


// - -
//
RecordModel.prototype.recordContinuously = function() {

    var self = this;

    if (self.rtsp.indexOf("rtsp") >= 0) {
        this.ffmpegProcess = exec( "ffmpeg -rtsp_transport tcp -fflags +igndts -i " + self.rtsp + " -vcodec copy -an -map 0 -f segment -segment_time 10 -bsf dump_extra -flags -global_header -segment_format mpegts '" + self.folder + "/videos/tmp/capture-%03d.ts'",
                function (error, stdout, stderr) {
                    if (error !== null) {
                        error = true;
                    }
                }); 

        this.ffmpegProcess.on('exit', function() {
            self.recordContinuously();
        });
 
    } else if (self.rtsp.indexOf("http") >= 0) {
        this.ffmpegProcess = exec( "ffmpeg -i " + self.rtsp + " -vcodec copy -an -map 0 -f segment -segment_time 10 -bsf dump_extra -flags -global_header -segment_format mpegts '" + self.folder + "/videos/tmp/capture-%03d.ts'",
                function (error, stdout, stderr) {
                    if (error !== null) {
                        error = true;
                        console.error('FFmpeg\'s  exec error: ' + stderr);
                    }
                }); 

        this.ffmpegProcess.on('exit', function() {
            console.log( "ffmpeg terminated, restarting..." );
            self.recordContinuously();
        });   
    }
};
// - - -

module.exports = RecordModel;

