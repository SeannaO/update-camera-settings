//
// ffmpeg.js
//
// calls to ffmpeg
//

var ffmpeg = require('fluent-ffmpeg');
var fs = require('fs');
var path = require('path');


/**
 * convertFromTsToMp4
 *
 */
var convertFromTsToMp4 = function( tsFile, cb ) {
    
    console.log("- - - convertFromTsToMp4 - - -");
    console.log("file: " + tsFile);
    console.log("- - -");

    var exec = require('child_process').exec;

    var mp4File = __dirname + "/tmp/" + path.basename(tsFile, '.ts') + ".mp4"; 

    var child = exec('ffmpeg -y  -i ' + tsFile + ' -c copy ' + mp4File,
            function (error, stdout, stderr) {
                if (error !== null) {
                    error = true;
                    console.error('FFmpeg\'s  exec error: ' + error);
                    console.log(stderr);
                }
                cb( mp4File, error );
            });    
};
// - - end of convertFromTsToMp4
// - - - - - - - - - - - - - - - - - - - -


/**
 * makeThumb
 *
 */
var makeThumb = function ( file, folder, resolution, cb ) { 
    
    var exec = require('child_process').exec;

    var out = folder+"/" + path.basename(file, '.ts') + ".jpg"; 
     
     var child = exec("ffmpeg -y -i " + file + " -vcodec mjpeg -vframes 1 -an -f rawvideo -t 2 -s 320x240 " + out,
             function( error, stdout, stderr ) {
                 if (error !== null) {
                     error = true;
                     console.error('FFmpeg\'s  exec error: ' + error);
                     console.log(stderr);
                 }
                 cb( out, error );
            });
};
// - - end of snapshot
// - - - - - - - - - - - - - - - - - - - -


/**
 * snapshot
 *
 */
var snapshot = function ( file, outFolder, offset, cb ) { 

    var ext = path.extname(file);

    if (ext == ".ts") {
        convertFromTsToMp4( file, function( mp4file, error ) {
            if (error) {
                console.log("error while trying to take snapshot: " + snapshot);
            } else {
                snapshot(mp4file, offset, cb);
            }
        });
    } 
    else {
        var Metalib = ffmpeg.Metadata;
        var metaObject = new Metalib(file, function(metadata, err) {
//            console.log(require('util').inspect(metadata, false, null));
            var resolution = metadata.video.resolution;

            var proc = new ffmpeg({ source: file })
              .withSize(resolution.w + 'x' + resolution.h)
              .takeScreenshots({
                count: 1,
                filename: path.basename(file) + "_" + offset + "_" +  Date.now(),
                timemarks: [ "" + offset ]
              }, outFolder, function(err, filenames) {
                if(err){
                    cb("");
                    console.log(err.message);
                }
                else {
                    cb( filenames[0] );
                     console.log('snapshots were saved');
                }
            });    
            
        });
    }
};
// - - end of snapshot
// - - - - - - - - - - - - - - - - - - - -


var smartSnapshot = function( file, outFolder, offset, options, cb ) {

	if ( typeof options === "function" ) {
		cb = options;
		options = {};
	}
	
	var size = "";

	if (options.size) {
		size = ' -s ' + options.size.width + 'x' + options.size.height;
		console.log(size);

	}

    var exec = require('child_process').exec;

    var out = outFolder + "/" + path.basename(file, '.ts') + "_" + offset + ".jpg"; 
    
	var child = exec('ffmpeg -i ' + file + ' -vframes 1 -ss ' + offset + ' ' + size + ' ' + out, 
   // var child = exec("ffmpeg -y -i " + file + " -vcodec mjpeg -vframes 1 -an -f rawvideo -t 2 -ss " + offset + " -s 640x480 " + out,
		function( error, stdout, stderr ) {
			cb( "", true );
			if (error !== null) {
				error = true;
				console.error('FFmpeg\'s  exec error: ' + error);
				console.log(stderr);
			}
			cb( out, error );
		}
	);    
};


/**
 * inMemoryStitch
 *
 */
var inMemoryStitch = function( files, offset, req, res ) {
    
    console.log("- - - in mem stitch - - -");
    console.log("offset: " + offset);
    console.log("- - -");

    var spawn = require('child_process').spawn;

    var fileList = files.join('|');
    fileList = "concat:" + fileList;

	var child = spawn('ffmpeg', [
			'-y', 
			'-i', fileList, 
			'-ss', offset.begin/1000, 
			'-t', offset.duration/1000, 
			'-c', 'copy', 
			'-f', 'mp4',
			'-frag_duration', '10', 
			'hello.mp4']);

	res.writeHead(200, {'Content-Type': 'video/mp4'});
	child.stdout.pipe( res );
	
	child.stderr.on('data', function(data) {
		//console.log(data.toString());
		//console.log("error");
	});

		
	child.stdout.on('data', function(data) {
		//console.log(data.toString());
		//console.log("success");
	});

	child.on('close', function(code) {
		console.log( 'ffmpeg stitch process closed with code: ' + code );
	});
	
	req.on('close', function() {
		console.log('connection closed');
		if( child ) {
			console.log('killing ffmpeg stitch process');
			child.kill();
		}
	});
};
// - - end of inMemStitch
// - - - - - - - - - - - - - - - - - - - -



/**
 * stitch
 *
 */
var stitch = function( files, out, offset, cb ) {
    
    console.log("- - - stitch - - -");
    console.log("offset: " + offset);
    console.log("out: " + out);
    console.log("- - -");

    var exec = require('child_process').exec;

    var fileList = files.join('|');
    fileList = "concat:" + fileList;
    
    console.log(fileList);
    console.log(offset);

    var child = exec('ffmpeg -y -i "' + fileList + '" -ss ' + offset.begin/1000 + ' -t ' + offset.duration/1000 + ' -c copy ' + out,
            function (error, stdout, stderr) {
                if (error !== null) {
                    error = true;
                    console.error('FFmpeg\'s  exec error: ' + error);
                    console.log(stderr);
                }
                cb( out, error );
            });
};
// - - end of stitch
// - - - - - - - - - - - - - - - - - - - -



/**
 * calcDurations
 *
 */
function calcDurationOfMultipleFiles(list, cb) {
}


/**
 * calcDuration
 *
 */
function calcDuration(input, cb) {

    var Metalib = ffmpeg.Metadata;

    //fs.exists(input, function(exists) {
    //    if(exists) {
            var metaObject = new Metalib(input, function(metadata, err) {
                
                var duration = 1000 * parseFloat( metadata.durationraw.split(':')[2] );
                cb( duration, input );
            });
     //   } else {
     //       cb( 0, input );
     //   }

   // });
      
}
// - - end of calcDuration
// - - - - - - - - - - - - - - - - - - - -


/**
 * sendWebMStream
 *
 */
var sendWebMStream = function(req, res) {
    var movie = './test_video.mp4';

    var stat = fs.statSync(movie);

    var start = 0;
    var end = 0;
    var range = req.header('Range');
    if (range !== null) {
        start = parseInt( range.slice(range.indexOf('bytes=')+6,
                    range.indexOf('-')), 10 );
        end = parseInt( range.slice(range.indexOf('-')+1,
                    range.length), 10 );
    }
    if (isNaN(end) || end === 0) end = stat.size-1;
    if (start > end) return;

    var duration = (end / 1024) * 8 / 1024;

    res.writeHead(206, { 
        'Connection':'close',
        'Content-Type':'video/mp4',
        'Content-Length':end - start,
        'Content-Range':'bytes '+start+'-'+end+'/'+stat.size,
        'Transfer-Encoding':'chunked'
    });

    var proc = new ffmpeg({ source: movie, nolog: true })
        //.addOptions(['-c:v copy'])
        //.addOptions(['-probesize 900000', '-analyzeduration 0', '-minrate 1024k', '-maxrate 1024k', '-bufsize 1835k', ' -c:v libvpx'])
        .usingPreset('podcast')
        .writeToStream(res, function(retcode, error){
            if (!error){
                console.log('file has been converted succesfully',retcode);
            }else{
                console.log('file conversion error',error);
            }
        });
};
// - - end of sendWebMStream
// - - - - - - - - - - - - - - - - - - - -


/**
 * sendMp4File
 *
 */
var sendMp4File = function(file, offset, req, res) {
    
    console.log("- - - sendMp4VFile - - -");
    console.log("offset: " + offset);
    console.log("file: " + file);
    console.log("- - -");
    
    fs.exists(file, function(exists) {
        if (!exists) {
            console.log("sendStream: couldn't find video " + file + "." );
            res.end("couldn't find any recordings within this range :(");
        }
        else {

            var stat = fs.stat(file+"", function(err, stat) { 
				var total = parseInt( stat.size, 10 );

				console.log('ALL: ' + total);
				//res.writeHead(200, { 'Content-Length': total, 'Content-Type': 'video/mp4' });
				//fs.createReadStream(file).pipe(res);
				res.sendfile(file);
			});
		}
    });
};
// - - end of sendMp4File
// - - - - - - - - - - - - - - - - - - - -



/**
 * sendMp4Stream
 *
 */
var sendMp4Stream = function(file, offset, req, res) {
    
    console.log("- - - sendMp4Stream - - -");
    console.log("offset: " + offset);
    console.log("file: " + file);
    console.log("- - -");
    
    fs.exists(file, function(exists) {
        if (!exists) {
            console.log("sendStream: couldn't find video " + file + "." );
            res.end("couldn't find any recordings within this range :(");
        }
        else {
            
            var stat = fs.statSync(file+"");
            var total = parseInt( stat.size, 10 );
            
            if (req.headers.range) {
                
                var range = req.headers.range;
                var parts = range.replace(/bytes=/, "").split("-");
                var partialstart = parts[0];
                var partialend = parts[1];

                var start = parseInt(partialstart, 10);
                var end = partialend ? parseInt(partialend, 10) : total-1;

                var chunksize = (end-start)+1;

                console.log('RANGE: ' + start + ' - ' + end + ' = ' + chunksize);

                var fileStream = fs.createReadStream(file, {start: start, end: end});

                res.writeHead(206, { 
                    'Content-Range': 'bytes ' + start + '-' + end + '/' + total, 
                    'Accept-Ranges': 'bytes', 
                    'Content-Length': chunksize, 
                    'Content-Type': 'video/mp4' 
                });

                fileStream.pipe(res, function() {
                    console.log("pipe finished");
                });



            } else {
                console.log('ALL: ' + total);
                res.writeHead(200, { 'Content-Length': total, 'Content-Type': 'video/mp4' });
                fs.createReadStream(file).pipe(res);
            }
        } 
    });
};
// - - end of sendMp4Stream
// - - - - - - - - - - - - - - - - - - - -


// exports
exports.sendWebMStream = sendWebMStream;
exports.sendStream = sendMp4Stream;
exports.snapshot = snapshot;
exports.stitch = stitch;
exports.calcDuration = calcDuration;
exports.makeThumb = makeThumb;
exports.smartSnapshot = smartSnapshot;
exports.sendMp4File = sendMp4File;
exports.inMemoryStitch = inMemoryStitch;
