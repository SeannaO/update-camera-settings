var ffmpeg = require('./ffmpeg.js');
//var db = require('./nedb.js');
var fs = require('fs');
var path = require('path');
var watch = require('watch');

var lastVideo = 0;
var ffmpegProcess;

function RecordModel( datastore, camera ) {
    
    this.rtsp = camera.rtsp;
    this.db = datastore;
    this.camId = camera._id;

    this.folder = __dirname + "/cameras/" + camera._id;
    
    this.setupFolderSync(__dirname + "/cameras");
    this.setupFolderSync(this.folder);
    this.setupFolderSync(this.folder + "/videos");
    this.setupFolderSync(this.folder + "/videos/tmp");

    console.log("record constructor");
    this.setupWatcher( this.folder + "/videos/tmp" );
}


RecordModel.prototype.stopRecording = function() {

    if (this.ffmpegProcess) {
        this.ffmpegProcess.removeAllListeners('exit'); 
        this.ffmpegProcess.kill();
    }
}


RecordModel.prototype.startRecording = function() {    
    this.recordContinuously();
}



RecordModel.prototype.setupFolderSync = function(folder) {

    if ( fs.existsSync(folder) ){
        return true;
    } else {
        fs.mkdirSync(folder);
        return false;
    }
}


// - -
// 
RecordModel.prototype.setupWatcher = function( dir ) {

    var pending = [];
    
    console.log("watching " + dir);
    var self = this;

    watch.watchTree( dir, function(f, curr, prev) {
        
        if ( (typeof f == "object" && prev === null && curr === null) || pending.length > 0) {
            
            var counter = 0;

            for (var i = 0; i < pending.length; i++) {
                
                var from = self.folder + "/videos/tmp/" + path.basename(pending[i].file);
                var to = self.folder + "/videos/" + pending[i].start + path.extname(pending[i].file);

                var pendingVideo = pending[i];
                
                counter++;

                fs.rename( from, to, function(err) { 
                    if (err) {
                        console.log("error when moving file: " + err);
                    }
                    else {

                        pendingVideo.file = to;

                        fs.exists(to, function(exists) {
                            if (exists) {
                                ffmpeg.calcDuration( to, function(duration) {
                                    pendingVideo.start = pendingVideo.end - 1000 * duration;
                                    
                                    if ( Math.abs(pendingVideo.start - lastVideo) < 2 * 1000 * duration ) {
                                        pendingVideo.start = lastVideo;
                                        pendingVideo.end = pendingVideo.start + duration*1000;
                                    }

                                    lastVideo = pendingVideo.end;
                                    self.db.insertVideo( pendingVideo );
                                });
                            }
                        });

                        if (counter == pending.length) {
                            pending = [];
                            self.addNewVideosToPendingList( pending );
                        }                            
                    }
                });
            }            
        } 
        else if ( pending.length == 0 && prev === null ) {
             self.addNewVideosToPendingList( pending );
             console.log( curr );
        }
        else {
        }
    });
}
// - - -


// - -
//
RecordModel.prototype.addNewVideosToPendingList = function( pending ) {
    
    var self = this;

    fs.readdir( self.folder + "/videos/tmp", function(err, files) {
        if (err) {
            console.log("there was an error when trying to list files on tmp folder: " + err);
        } else {

            for (var i = 0; i < files.length; i++) {

                var file =  self.folder + "/videos/tmp/" + files[i];

                if ( path.extname(file) == '.ts' ) {

                    var fileInfo = fs.statSync( file );
                    var lastModified = ( new Date(fileInfo.mtime) ).getTime();
                    
                    ffmpeg.calcDuration( file, function(duration, f) {
                        
                        var video = {
                            cam: self.camId,
                            start: lastModified - duration*1000,
                            end: lastModified,
                            file: file
                        }

                        console.log("adding video to pending list");
                        console.log(video);
                        pending.push( video ); 
                    });
                }
            }
        }
    });
}
// - - -


// - -
//
RecordModel.prototype.recordContinuously = function() {

    console.log("record...");

    var exec = require('child_process').exec;
    var self = this;

    this.ffmpegProcess = exec( "ffmpeg -rtsp_transport tcp -i " + self.rtsp + " -vcodec copy -an -map 0 -f segment -segment_time 10 -bsf dump_extra -flags -global_header -segment_format mpegts '" + self.folder + "/videos/tmp/capture-%03d.ts'",
            function (error, stdout, stderr) {
                if (error !== null) {
                    error = true;
                    console.error('FFmpeg\'s  exec error: ' + stderr);
                    //console.log(stderr);
                }
            }); 

    this.ffmpegProcess.on('exit', function() {
        console.log( "ffmpeg -rtsp_transport tcp -i " + self.rtsp + " -vcodec copy -an -map 0 -f segment -segment_time 10 -bsf dump_extra -flags -global_header -segment_format mpegts '" + self.folder + "/videos/tmp/capture-%03d.ts'");
        console.log( "ffmpeg terminated, restarting..." );
        recordContinuously();
    });
}
// - - -

module.exports = RecordModel;
