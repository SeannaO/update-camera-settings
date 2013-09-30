var ffmpeg = require('./ffmpeg.js');
var db = require('./db.js');
var fs = require('fs');
var path = require('path');
var watch = require('watch');
//var cam = "rtsp://admin:admin@192.168.215.83/video1enc1"
var cam = "http://localhost:1234"

db.setup();


//
var setupWatcher = function( dir ) {

    var pending = [];
    
    var watcher = fs.watchFile( dir, function(curr, prev) {   
        
        console.log("new changes detected: " + Date.now() );
        //
        if (pending.length == 0 && curr.size > prev.size ) {
             addNewVideosToPendingList( pending );
             console.log(pending);
        }
        else {
            var counter = 0;

            for (var i = 0; i < pending.length; i++) {
                
                var from = __dirname + "/videos/tmp/" + path.basename(pending[i].file);
                var to = __dirname + "/videos/" + pending[i].start + path.extname(pending[i].file);
                
                console.log("moving file " + from + " to " + to);

                var pendingVideo = pending[i];
                
                counter++;

                fs.rename( from, to, function(err) { 
                    if (err) {
                        console.log("error when moving file: " + err);
                    }
                    else {
                        console.log("moved video");
                        console.log(pendingVideo);
                        pendingVideo.file = to;

                        fs.exists(to, function(exists) {
                            if (exists) {
                                ffmpeg.calcDuration( to, function(duration) {
                                    pendingVideo.start = pendingVideo.end - duration*1000,
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
    });
}


var addNewVideosToPendingList = function( pending ) {
    fs.readdir( __dirname + "/videos/tmp", function(err, files) {
        if (err) {
            console.log("there was an error when trying to list files on tmp folder: " + err);
        } else {
            console.log("files on tmp folder: ");
            console.log(files);
            for (var i = 0; i < files.length; i++) {
                var file =  __dirname + "/videos/tmp/" + files[i];
                console.log("adding " + files);
                console.log( path.extname(file) );
                if ( path.extname(file) == '.ts' ) {
                    var fileInfo = fs.statSync( file );
                    var lastModified = ( new Date(fileInfo.mtime) ).getTime();
                    
                    ffmpeg.calcDuration( file, function(duration, f) {
                        console.log("duration: " + duration);
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
var recordContinuously = function( cb ) {
            
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


