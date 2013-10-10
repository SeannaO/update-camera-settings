var ffmpeg = require('./ffmpeg');
var fs = require('fs');


function sendMp4Video( file, req, res ) {
     fs.exists( file, function(exists) {
         if (exists) {
            ffmpeg.sendStream( file, 0, req, res );
         } else {
             res.end("couldn't find this file");
         }
     });
}

function generateMp4Video( db, camId, begin, end, cb ) {
    var begin = parseInt( begin );
    var end = parseInt( end );

    if ( isNaN(begin) || isNaN(end) ) {
        var response = {success: false, error: "invalid interval"};
        cb( response );
        return;
    }

    var fileName = __dirname + "/tmp/" + camId + "_" + begin + "_" + end + ".mp4";

    fs.exists( fileName, function(exists) {
        if (exists) {
            var response = { success: true, file: fileName };
            cb( response );
        } else {
            db.searchVideosByInterval( camId, begin, end, function( err, videoList, offset ) {
                
                console.log(videoList);

                if (videoList.length == 0) {
                    
                    var formatedBegin = new Date(begin);
                    var formatedEnd = new Date(end);
                    
                    var response = { success: false, error: "couldn't find any recording between " + formatedBegin + " and " + formatedEnd + "... :(" };
                    cb(response);
                }
                else {
                    var fileList = videoList.map( function(video) {
                        return video.file;
                    });

                    ffmpeg.stitch( fileList, fileName, offset, function(mergedFile, error) {
                        if ( !error ) {
                            var response = { success: true, file: mergedFile };
                            cb( response );
                        } else {
                            var response = { success: false, error: error };
                            cb( response );
                        }
                    });
                }
            });    
        }
    });
}
//


//
function takeSnapshot( db, camId, req, res ) {
    var time = parseInt(req.query.time);
    
    if ( isNaN(time) ) {
        res.end("invalid time");
        return;
    }

    db.searchVideoByTime( camId, time, function( file, offset ) {
        offset = Math.round( offset );
        console.log( "taking snapshot of: " + file );
        
        fs.exists(file, function(exists) {
            if (exists) {
                ffmpeg.snapshot(file, offset, function(fileName) {
                    res.sendfile("tmp/" + fileName,
                        {},
                        function() {
                            console.log("file " + fileName + " sent");
                            fs.unlink( __dirname + '/tmp/' + fileName  );
                        });
                });
                } else {
                    res.end( "sorry, no videos were recorded at " + (new Date(time)) );
                }
            });
    });
}
//


//
exports.generateMp4Video = generateMp4Video;
exports.takeSnapshot = takeSnapshot;
exports.sendMp4Video = sendMp4Video;
