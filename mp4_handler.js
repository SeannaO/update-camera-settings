var ffmpeg = require('./ffmpeg');
var fs = require('fs');

function generateMp4Video( db, req, res ) {
    var begin = parseInt( req.query.begin );
    var end = parseInt( req.query.end );

    if ( isNaN(begin) || isNaN(end) ) {
        res.end("invalid interval");
        return;
    }

    var fileName = __dirname + "/tmp/" + begin + "_" + end + ".mp4";

    fs.exists( fileName, function(exists) {
        if (exists) {
            ffmpeg.sendStream( fileName, 0, req, res );
        } else {
            db.searchVideosByInterval( begin, end, function( err, videoList, offset ) {
                
                console.log(videoList);

                if (videoList.length == 0) {
                    
                    var formatedBegin = new Date(begin).toISOString();
                    var formatedEnd = new Date(end).toISOString();

                    res.end("couldn't find any video within " + formatedBegin + " and " + formatedEnd + "... :(");
                }
                else {
                    var fileList = videoList.map( function(video) {
                        return video.file;
                    });

                    ffmpeg.stitch( fileList, fileName, offset, function(mergedFile, error) {
                        if ( !error ) {
                            ffmpeg.sendStream( mergedFile, 0, req, res );
                        } else {
                            res.end("there was an error when trying to deliver the video... :(");
                        }
                    });
                }
            });    
        }
    });
}
//


//
function takeSnapshot( db, req, res ) {
    var time = parseInt(req.query.time);
    
    if ( isNaN(time) ) {
        res.end("invalid time");
        return;
    }

    db.searchVideoByTime( time, function( file, offset ) {
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
                    res.end( "sorry, no videos were recorded at " + (new Date(time)).toISOString() );
                }
            });
    });
}
//


//
exports.generateMp4Video = generateMp4Video;
exports.takeSnapshot = takeSnapshot;

