var ffmpeg = require('./../helpers/ffmpeg');
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


function sendMp4VideoForDownload( file, req, res ) {
     fs.exists( file, function(exists) {
         if (exists) {
            ffmpeg.sendMp4File( file, 0, req, res );
         } else {
             res.end("couldn't find this file");
         }
     });
}


function generateMp4Video( db, cam, begin, end, cb ) {

    var camId = cam._id;
    
    console.log("generateMp4Video");
    console.log("camId: " + camId);

    begin = parseInt( begin, 10 );
    end = parseInt( end, 10 );

    if ( isNaN(begin) || isNaN(end) ) {
        var response = { success: false, error: "invalid interval" };
        cb( response );
        return;
    }

    var fileName = cam.videosFolder + "/tmp/" + camId + "_" + begin + "_" + end + ".mp4";

    fs.exists( fileName, function(exists) {
        if (exists) {
            var response = { success: true, file: fileName };
            cb( response );
        } else {
            db.searchVideosByInterval( begin, end, function( err, videoList, offset ) {
                
                //console.log(videoList);
                console.log("** offset **");
                console.log(offset);

                if (videoList.length === 0) {
                    
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
function takeSnapshot( db, cam, req, res ) {
    var time = parseInt(req.query.time, 10);
    
	var width = parseInt(req.query.width, 10);
	var height = parseInt(req.query.height, 10);
	
	var options = {};

	if ( !isNaN(width) && !isNaN(height) ) {
		options = {
			size: {
				width: width,
				height: height
			}
		};
	}

	console.log(":::::::::::::::::::");
	console.log( options );

    var camId = cam._id;

    if ( isNaN(time) ) {
        res.end("invalid time");
        return;
    }

    db.searchVideoByTime( time, function( file, offset ) {
        
        offset = Math.round( offset );
        console.log( "taking snapshot of: " + file );
        
        fs.exists(file, function(exists) {
            if (exists) {
                ffmpeg.smartSnapshot( file, cam.videosFolder + "/tmp", offset, options, function(fileName, error) {
                    res.sendfile( fileName,
                        {},
                        function() {
                            fs.unlink( fileName );
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
exports.sendMp4VideoForDownload = sendMp4VideoForDownload;
