var ffmpeg = require('./ffmpeg.js');
var fs = require('fs');
var path = require('path');
var Watch = require('./watch');

function RecordModel( datastore, camera ) {
    
    console.log("record constructor");

    this.rtsp = camera.rtsp;
    this.db = datastore;
    this.camId = camera._id;
    this.lastVideo = 0;
    this.watch = new Watch();
    this.folder = __dirname + "/cameras/" + camera._id;

    this.ffmpegCommand = "ffmpeg -rtsp_transport tcp -i " + this.rtsp + " -vcodec copy -an -map 0 -f segment -segment_time 10 -bsf dump_extra -flags -global_header -segment_format mpegts '" + this.folder + "/videos/tmp/capture-%03d.ts'"
    
    this.setupFolderSync(__dirname + "/cameras");
    this.setupFolderSync(this.folder);
    this.setupFolderSync(this.folder + "/videos");
    this.setupFolderSync(this.folder + "/videos/tmp");

    this.setupWatcher( this.folder + "/videos/tmp" );

    console.log("camera: " + camera.name);
    console.log("folder: " + this.folder);
    console.log("rtsp: " + this.rtsp);
    //console.log("ffmpeg: " + this.ffmpegCommand);

}


RecordModel.prototype.updateCameraInfo = function( camera ) {
    this.rtsp = camera.rtsp;
    this.camId = camera._id;
}


RecordModel.prototype.stopRecording = function() {
    
    if (this.ffmpegProcess) {
        console.log("killing ffmpeg process: " + this.ffmpegProcess.pid);

        this.ffmpegProcess.removeAllListeners('exit');
        this.ffmpegProcess.kill();
        var exec = require('child_process').exec;
        exec("kill -s 9 " + this.ffmpegProcess.pid, function(err) {console.log(err)});
        
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

    this.watch.watchTree( dir, function(f, curr, prev) {
        
        if ( (typeof f == "object" && prev === null && curr === null) || pending.length > 0) {
            
            var counter = 0;

            for (var i = 0; i < pending.length; i++) {
                
                var from = self.folder + "/videos/tmp/" + path.basename(pending[i].file);
                var to = self.folder + "/videos/" + pending[i].start + path.extname(pending[i].file);

                var pendingVideo = pending[i];
                
                counter++;
                fs.exists( from, function(exists) {
                    if (exists) {
                        fs.rename( from, to, function(err) { 
                            if (err) {
                                console.log("error when moving file: " + err);
                            }
                            else {
                                console.log("new video segment");
                                pendingVideo.file = to;

                                fs.exists(to, function(exists) {
                                    if (exists) {
                                        ffmpeg.calcDuration( to, function(duration) {
                                            pendingVideo.start = pendingVideo.end - 1000 * duration;
                                            
                                            if ( Math.abs(pendingVideo.start - self.lastVideo) < 2 * 1000 * duration ) {
                                                pendingVideo.start = self.lastVideo;
                                                pendingVideo.end = pendingVideo.start + duration*1000;
                                            }

                                            self.lastVideo = pendingVideo.end;
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
                    } else {
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
            // console.log( curr );
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

    if (self.rtsp.indexOf("rtsp") >= 0) {
        this.ffmpegProcess = exec( "ffmpeg -rtsp_transport tcp -i " + self.rtsp + " -vcodec copy -an -map 0 -f segment -segment_time 10 -bsf dump_extra -flags -global_header -segment_format mpegts '" + self.folder + "/videos/tmp/capture-%03d.ts'",
                function (error, stdout, stderr) {
                    if (error !== null) {
                        error = true;
                        console.error('FFmpeg\'s  exec error: ' + stderr);
                        //console.log(stderr);
                    }
                }); 

        this.ffmpegProcess.on('exit', function() {
            console.log( "ffmpeg terminated, restarting..." );
            self.recordContinuously();
        });
 
    } else if (self.rtsp.indexOf("http") >= 0) {
        this.ffmpegProcess = exec( "ffmpeg -i " + self.rtsp + " -vcodec copy -an -map 0 -f segment -segment_time 10 -bsf dump_extra -flags -global_header -segment_format mpegts '" + self.folder + "/videos/tmp/capture-%03d.ts'",
                function (error, stdout, stderr) {
                    if (error !== null) {
                        error = true;
                        console.error('FFmpeg\'s  exec error: ' + stderr);
                        //console.log(stderr);
                    }
                }); 

        this.ffmpegProcess.on('exit', function() {
            console.log( "ffmpeg terminated, restarting..." );
            self.recordContinuously();
        });   
    }
}
// - - -

module.exports = RecordModel;
