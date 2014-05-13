//
// ffmpeg.js
//
// calls to ffmpeg
//

var path  = require('path');
var spawn = require('child_process').spawn;
var exec  = require('child_process').exec;


/**
 * makeThumb
 *
 */
var makeThumb = function ( file, folder, resolution, cb ) { 
    
    var out = folder+"/" + path.basename(file, '.ts') + ".jpg"; 
     
     var child = exec("nice -n -10 ffmpeg -y -i " + file + " -vcodec mjpeg -vframes 1 -an -f rawvideo -t 2 -s 160x120 " + out,
             function( error, stdout, stderr ) {
                 if (error !== null) {
                     error = true;
                     console.error('FFmpeg\'s  exec error: ' + error);
                     console.error(stderr);
                 }
                 cb( out, error );
            });
};
// - - end of snapshot
// - - - - - - - - - - - - - - - - - - - -


/**
 * inMemoryStitch
 *
 */
var inMemoryStitch = function( files, offset, req, res ) {

    var spawn = require('child_process').spawn;

    var fileList = files.join('|');
    fileList = "concat:" + fileList;

	var child = spawn('ffmpeg', [
			'-y', 
			'-i', fileList, 
			'-ss', offset.begin/1000, 
			'-t', offset.duration/1000,
			// '-fflags', '+igndts',
			'-loglevel', 'quiet',
			'-c', 'copy', 
			// '-f', 'mp4',
			// '-bsf', 'h264_mp4toannexb',
			// '-flags' ,'+global_header',
			// '-bsv', 'dump_extra',
			'-f', 'mpegts',
			// '-frag_duration', '3600', 
			'-']);

	var begin = parseInt( req.query.begin, 10 );
	var end = parseInt( req.query.end, 10 );
	var filename = 'vms_' + begin + '_' + end + '.ts';

	res.writeHead(200, {
		// 'Content-Type': 'video/mp4',
		'Content-Type': 'video/MP2T',
		'Content-disposition': 'attachment; filename=' + filename
	});
	
	//var vData = new Buffer(50000000);
	//var l = 0;

	child.stdout.pipe( res );

	child.stderr.on('data', function(data) {
		
	});

	
	child.stdout.on('data', function(data) {
	});
};
// - - end of inMemStitch
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

	var child = spawn('nice', [
			'-n', '-5',
			'ffmpeg',
			'-y', 
			'-i', input
	]);
	
	var output = '';
	var re = /Duration: (\d+):(\d+):(\d+).(\d+)/;

	child.stderr.on('data', function(d) {
		output = output + d.toString();
	});
	child.on('close', function() {
		var duration_string = re.exec(output);
		var duration = 0;
		
		var err;

		if ( duration_string ) {
			duration = parseInt( duration_string[3] )
						+ parseInt( duration_string[4] ) / 100.0;
		}
		else {
			err = 'ffmpeg command error when calculating duration';
		}

		duration = duration * 1000; // converts to millis

		cb( err, duration, input );
	});
}
// - - end of calcDuration
// - - - - - - - - - - - - - - - - - - - -


/**
 * checkH264
 *
 */
var checkH264 = function( url, cb ) {
	var self = this;
	var timeout = 20000;

	var ffmpegProcess = spawn('ffmpeg', [
			'-rtsp_transport', 'tcp',
			'-i', url
	]);

	var ffmpegTimeout = setTimeout( function() {
		console.error('[ffmpeg.js:checkH264] H264 detection timed out');
		ffmpegProcess.kill();
		cb( false );
	}, timeout);
	
	var streamIndex = -1;	
	ffmpegProcess.stderr.on('data', function(data) {
		var msg = data.toString();
		if( streamIndex < 0 ) {
			streamIndex = msg.indexOf('Stream');
		}
		if ( streamIndex > 0 && msg.indexOf('h264') > streamIndex ) {
			clearTimeout( ffmpegTimeout );
			cb( true );
			ffmpegProcess.kill();
		}
	});
};
// - - end of checkH264
// - - - - - - - - - - - - - - - - - - - -


// exports
exports.calcDuration = calcDuration;
exports.makeThumb = makeThumb;
exports.inMemoryStitch = inMemoryStitch;
exports.checkH264 = checkH264;
