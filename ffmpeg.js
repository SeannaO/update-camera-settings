var ffmpeg = require('fluent-ffmpeg');
var fs = require('fs');
var path = require('path');

var Metalib = ffmpeg.Metadata;


/**
 * convertFromTsToMp4
 *
 */
var convertFromTsToMp4 = function( tsFile, cb ) {
    
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
}
// - - - - - - - - - - - - - - - - - - - -


/**
 * snapshot
 *
 */
var snapshot = function ( file, offset, cb ) { 

    console.log("taking a snapshot of: " + file + " offset: " + offset);
    
    var ext = path.extname(file);
    console.log("file: " + file);
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
        var proc = new ffmpeg({ source: file })
              .withSize('640x480')
              .takeScreenshots({
                count: 1,
                filename: path.basename(file) + "_" + offset + "_" +  Date.now(),
                timemarks: [ ""+offset ]
              }, 'tmp', function(err, filenames) {
                if(err){
                    cb("");
                    console.log(err.message);
                }
                else {
                    cb( filenames[0] );
                     console.log('snapshots were saved');
                }
            });    
    }
}
// - - - - - - - - - - - - - - - - - - - -


/**
 * stitch
 *
 */
var stitch = function( files, out, offset, cb ) {
    
    var exec = require('child_process').exec;

    var fileList = files.join('|');
    fileList = "concat:" + fileList;
    
    console.log("* * * offset * * *");
    console.log(offset);
    console.log("* * *");

    var child = exec('ffmpeg -y  -i "' + fileList + '" -ss ' + offset.begin/1000 + ' -t ' + offset.duration/1000 + ' -c copy ' + out,
            function (error, stdout, stderr) {
                if (error !== null) {
                    error = true;
                    console.error('FFmpeg\'s  exec error: ' + error);
                    console.log(stderr);
                }
                cb( out, error );
            });
}
// - - - - - - - - - - - - - - - - - - - -


/**
 * recordRTSPts
 *
 */
function recordRTSPts (input, out, cb) {

    var error = false;
    
    var fileName = out + ".ts"

	var util = require('util'),
			exec = require('child_process').exec,
			//rate = 4, // Video FPS rate.
			quality = 'qvga', // Quality of the image
			extraparams = '-b:v 32k';

    // -c copy: faster
    // -c:v libx264 - converts to h264
    var child = exec('ffmpeg -y -i ' + input + ' -preset ultrafast -c:v libx264 -an -t 30 -f mpegts ' + fileName,
		function (error, stdout, stderr) {
            
			if (error !== null) {
                error = true;
				console.error('FFmpeg\'s ' + out + ' exec error: ' + error);
                console.log(stderr);
			}
            cb(fileName, error);
	    }
    );

}
// - - - - - - - - - - - - - - - - - - - -


/**
 * calcDuration
 *
 */
function calcDuration(input, cb) {

    var metaObject = new Metalib(input, function(metadata, err) {
        // console.log(require('util').inspect(metadata, false, null));
        cb( metadata.durationsec, input );
    });    
}
// - - - - - - - - - - - - - - - - - - - -


/**
 * recordRTSP
 *
 */
function recordRTSP (input, out, cb) {

    var error = false;

    var fileName = out + ".mp4"
	var util = require('util'),
			exec = require('child_process').exec,
			quality = 'qvga',
			extraparams = '-b:v 32k';

    var child = exec('ffmpeg -y -i ' + input + ' -preset ultrafast -c:v libx264 -an -t 30 ' + fileName,

		function (error, stdout, stderr) {
            
			if (error !== null) {
                error = true;
				console.error('FFmpeg\'s ' + out + ' exec error: ' + error);
			}
            cb(fileName, error);
	    }
    );

    /*
	child.on('exit', function (code) {
        cb(error);
	});
	child.on('SIGTERM', function() {
        cb(error);
	});
    */
}
// - - - - - - - - - - - - - - - - - - - -


/**
 * sendFlashStream
 *
 */
var sendFlashStream = function(req, res) {
    res.contentType('video/mp4');
    var pathToMovie = './test_video.mp4'; 
    var proc = new ffmpeg({ source: pathToMovie, nolog: true })
        .usingPreset('flash')
        .writeToStream(res, function(retcode, error){
            console.log('file has been converted succesfully');
        });
}
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
    if (range != null) {
        start = parseInt(range.slice(range.indexOf('bytes=')+6,
                    range.indexOf('-')));
        end = parseInt(range.slice(range.indexOf('-')+1,
                    range.length));
    }
    if (isNaN(end) || end == 0) end = stat.size-1;
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
}
// - - - - - - - - - - - - - - - - - - - -


/**
 * sendStreamDirectly
 *
 */
var sendStreamDirectly = function(file, offset, req, res) {
    
    console.log("file: " + file);
    //file = "tmp/0.mp4"
    fs.exists(file, function(exists) {
        if (!exists) {
            console.log("sendStream: couldn't find video " + file + "." );
            res.end("couldn't find any recordings within this range :(");
        }
        else {
            
            var stat = fs.statSync(file+"");
            var total = parseInt( stat.size );
            
            if (req.headers['range']) {
                
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
}
// - - - - - - - - - - - - - - - - - - - -



// exports

exports.recordRTSPts = recordRTSPts
exports.sendFlashStream = sendFlashStream
exports.sendWebMStream = sendWebMStream
exports.sendStream = sendStreamDirectly
exports.recordRTSP = recordRTSP
exports.snapshot = snapshot
exports.stitch = stitch
exports.calcDuration = calcDuration

