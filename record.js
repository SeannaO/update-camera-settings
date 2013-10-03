var ffmpeg = require('./ffmpeg.js');
var db = require('./db.js');
var fs = require('fs');
var path = require('path');
var watch = require('watch');

//var cam = "rtsp://admin:admin@192.168.215.83/video1enc1"
var cam = "http://localhost:1234"

db.setup();

var lastVideo = 0;


//
var setupWatcher = function( dir ) {

    var pending = [];
    
    watch.watchTree( dir, function(f, curr, prev) {
        
        if ( (typeof f == "object" && prev === null && curr === null) || pending.length > 0) {
            // Finished walking the tree
            var counter = 0;

            for (var i = 0; i < pending.length; i++) {
                
                var from = __dirname + "/videos/tmp/" + path.basename(pending[i].file);
                var to = __dirname + "/videos/" + pending[i].start + path.extname(pending[i].file);

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
                                    db.insertVideo( pendingVideo );
                                });
                            }
                        });

                        if (counter == pending.length) {
                            pending = [];
                            addNewVideosToPendingList( pending );
                        }                            
                    }

                      
                });
            }            
        } 
        else if ( pending.length == 0 && prev === null ) {
             addNewVideosToPendingList( pending );
             console.log( curr );
        }
        else {
        }
    });
}


var addNewVideosToPendingList = function( pending ) {
    fs.readdir( __dirname + "/videos/tmp", function(err, files) {
        if (err) {
            console.log("there was an error when trying to list files on tmp folder: " + err);
        } else {

            for (var i = 0; i < files.length; i++) {

                var file =  __dirname + "/videos/tmp/" + files[i];

                if ( path.extname(file) == '.ts' ) {

                    var fileInfo = fs.statSync( file );
                    var lastModified = ( new Date(fileInfo.mtime) ).getTime();
                    
                    ffmpeg.calcDuration( file, function(duration, f) {
                        
                        var video = {
                            cam: 0,
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


//
var recordContinuously = function() {

    var exec = require('child_process').exec;
    
    var child = exec( "ffmpeg -i " + cam + " -vcodec copy -an -map 0 -f segment -segment_time 10 -flags -global_header -segment_format mpegts '" +__dirname + "/videos/tmp/capture-%03d.ts'",
            function (error, stdout, stderr) {
                if (error !== null) {
                    error = true;
                    console.error('FFmpeg\'s  exec error: ' + error);
                    console.log(stderr);
                }
            }); 

    child.on('exit', function() {
        console.log( "ffmpeg terminated, restarting..." );
        recordContinuously();
    });

}


//
var recordToFile = function( cb ) {
    console.log("recording new file... ");

    var time = Date.now();
    var filename = __dirname + "/videos/" + time;

    var watcher = fs.watchFile("videos",
        function() {   
            time = Date.now();
            console.log("new changes detected : " + time );
            fs.unwatchFile("videos");
    });

    ffmpeg.recordRTSP(cam, filename, function( savedFile, error ) {
        if (!error) {
            console.log("file " + savedFile + " ready : " + time);
            db.insertVideo({
                cam: 0,
                file: savedFile,
                start: time,
                end: Date.now()
            });
        } else {
            fs.exists( savedFile, function(exists) {
                if (exists) {
                    fs.unlinkSync( savedFile );
                }
                console.log(Date.now() + " : ffmpeg error");
            });
        }
        cb();
    });
}


setupWatcher(__dirname + "/videos/tmp");
recordContinuously();

/*
// records files with overlapping to avoid gaps
setInterval( 
        function() {
            //recordToFile( function() {
                console.log("finished recording");
            //});
        }, 15000
);
*/


/*
// records one file after another
var record = function() {
    recordToFile( function() {
        record();    
    });
}
record();
*/


