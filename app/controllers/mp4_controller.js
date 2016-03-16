var ffmpeg = require('./../helpers/ffmpeg');
var fs = require('fs');
var path = require('path');

var spawn = require('child_process').spawn;

// regex to extract basefolder from a segment's path
// structure of a segment path:
// 		<baseFolder>/<camera_id>/<stream_id>/videos/<yyyy-mm-dd>/<1234567890_12345>.ts
var baseFolderRegex = /(\S+)(\/[\w-]+\/[\w-]+\/videos\/[\d-]+\/\w+\.ts)/;

/**
 * Updates a segment path to use current baseFolder
 *   in case the folder was moved and the string contains the old path
 *
 * @param { segment_path } string  full path of a segment 
 * 		- example: "/home/solink/cameras/camera_id/stream_id/videos/1-1-2016/1231241231_21231.ts"
 * @return{ string }  updated path if successful, or empty string if regex failed
 */
var toCurrentBaseFolder = function( segment_path ) {

	var re = baseFolderRegex.exec( segment_path );

	if (!re || !re[2]) {
		console.error('[VideoDowload.toCurrentBaseFolder]  could not parse segment_path');
		return '';
	} else {
		var new_path = path.join(process.env['BASE_FOLDER'], re[2]);
		return new_path;
	}
};


function inMemorySnapshot( file, offset, precision, res, options, cb) {

	//	var child = spawn('ffmpeg', ['-y', '-i', file, '-vframes', '1', '-ss', '1', '-f', 'image2', '-loglevel', 'quiet', '-']);

	var size = "";
	
	if (typeof options === 'function') {
		cb = options;
		options = {};
	} else if ( !options ) {
		options = {};
	}

	var child;
	
	var scale = 'scale=-1:-1';

	if (options.size) {
		if (options.size.width) {
			scale = 'scale='+options.size.width+':-1';
		} else if (options.size.height) {
			scale = 'scale=-1:'+options.size.height;
		}
	}
	
	// console.log("===== snapshot precision: " + precision );
	// console.log("===== offset: " + offset );

	if (precision === 0) {
		child = spawn( './ffmpeg', 
					['-y',
					'-i', file,
					'-vframes', '1',
					// '-ss', offset,
					'-f', 'image2',
					'-vcodec', 'mjpeg',
					'-an',
					'-loglevel', 'quiet',
					'-vf', scale,
					'-'
					]);
	} else {
		child = spawn( './ffmpeg', 
					['-y',
					'-i', file,
					'-vframes', '1',
					'-ss', offset,
					'-f', 'image2',
					'-vcodec', 'mjpeg',
					'-an',
					'-loglevel', 'quiet',
					'-vf', scale,
					'-'
					]);
	}

	child.stderr.on('data', function (data) {
		console.error('inMem snapshot error: ' + data);
		res.end( 'there was an error, please try again' , 500);
	});
	
	res.writeHead(200, {
		'Content-Type': 'image/jpeg'
	});
	child.stdout.pipe( res );
	
	child.on('close', function(code) {
		if (cb) cb();
	});
	
	res.on('close', function() {
		
		if (cb) cb();

		if( child ) {
			child.kill();
		}
	});
}	



function inMemoryMp4Video( db, cam, begin, end, req, res ) {
    var camId = cam._id;
    
    begin = parseInt( begin, 10 );
    end = parseInt( end, 10 );

    if ( isNaN(begin) || isNaN(end) ) {
        var response = { success: false, error: "invalid interval" };
        res.end( response );
        return;
    }

	db.searchVideosByInterval( begin, end, function( err, videoList, offset ) {

		if (videoList.length === 0) {
			
			var formatedBegin = new Date(begin);
			var formatedEnd = new Date(end);
			
			res.end('no videos found');
		}
		else {
			var fileList = videoList.map( function(video) {
				return toCurrentBaseFolder(video.file);
			});

			ffmpeg.inMemoryStitch( fileList, offset, req, res );
		}
	});    
}


/*
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


function generateMp4Video( db, cam, streamId, begin, end, cb ) {

    var camId = cam._id;

    begin = parseInt( begin, 10 );
    end = parseInt( end, 10 );

    if ( isNaN(begin) || isNaN(end) ) {
        var response = { success: false, error: "invalid interval" };
        cb( response );
        return;
    }

    var fileName = cam.videosFolder + "/" + streamId + "/tmp/" + begin + "_" + end + ".mp4";

    fs.exists( fileName, function(exists) {
        if (exists) {
            var response = { success: true, file: fileName };
            cb( response );
        } else {
            
            db.searchVideosByInterval( begin, end, function( err, videoList, offset ) {

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
*/

//s
function takeSnapshot( db, cam, req, res, cb ) {
    var time = parseInt(req.query.time, 10);
    
	var width = parseInt(req.query.width, 10);
	var height = parseInt(req.query.height, 10);

	var precision = req.query.precision || 0;
	precision = parseInt(precision);

	var options = {};

	if ( !isNaN(width) && !isNaN(height) ) {
		options = {
			size: {
				width: width,
				height: height
			}
		};
	}

    var camId = cam._id;

    if ( isNaN(time) ) {
        res.end("invalid time",500);
		if (cb) cb();
        return;
    }

	var options = {};
	if (req.query.width) {
		options.size = {};
		options.size.width = req.query.width;
	} else if (req.query.height) {
		options.size = {};
		options.size.height = req.query.height;
	}

    db.searchVideoByTime( time, function( file, offset ) {
        
        // offset = Math.round( offset );
       
		// console.log("===== take snaspshot =====");
		// console.log("====== file: " + file );
		// console.log("====== offset: " + offset);
		// console.log("===== =====");

        fs.exists(file, function(exists) {
            if (exists) {
				inMemorySnapshot(file, offset, precision, res, options, function() {
					if (cb) cb();
				});
            } else {
				console.log('[takeSnapshot]  no such file: ' + file);
                res.json( 500, {error: "no videos were recorded at " + (new Date(time))} );
				if (cb) cb();
            }
        });
    });
    
}
//


//
//exports.generateMp4Video = generateMp4Video;
exports.takeSnapshot = takeSnapshot;
//exports.sendMp4Video = sendMp4Video;
//exports.sendMp4VideoForDownload = sendMp4VideoForDownload;
exports.inMemorySnapshot = inMemorySnapshot;
exports.inMemoryMp4Video = inMemoryMp4Video;
