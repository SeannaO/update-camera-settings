//
// ffmpeg.js
//
// calls to ffmpeg
//

var path  = require('path');
var spawn = require('child_process').spawn;
var exec  = require('child_process').exec;


var TIMESCALE_BYTE_OFFSET = 16,
    DURATION_BYTE_OFFSET = 20,
    DURATION_BYTE_LENGTH = 4;

var MVHD_HEADER = [ 0x6D, 0x76, 0x68, 0x64 ];


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
 * getTotalDuration
 *
 * return total duration of ts files concatenation
 * by piping the concatenation to /dev/null
 * and parsing the total duration
 *
 * @param { array } files  array of files to be concatenated, full path
 * @param { Function } cb  callback( err, duration )
 * 		- err (String):  error message, null if none
 * 		- duration (Number):  total duration in millis
 */
var getTotalDuration = function( files, cb ) {

    var fileList = files.join('|');
    fileList = "concat:" + fileList;

	var opts = [
		'-y', 
		'-i', fileList, 
		'-codec', 'copy',
		'-an',
		'-fflags', '+igndts',
		'-f', 'mpegts',
		'/dev/null'
	];

	var child = spawn('./ffmpeg', opts);

	var durationRe = /time=(\d+):(\d+):(\d+).(\d+)/;

	var done = false;
	var buffer = '';

	child.stdout.on('end', function() {
		if (!done) {
			done = true;
			var m = durationRe.exec( buffer );
			if (!m || m.length < 5) {
				cb( 'could not parse duration');
			} else {
				var duration = ( m[1]*60*60 + m[2]*60 + m[3]*1 ) * 1000 + m[4]*1;
				cb( null, duration );
			}
		}
	});
	
	child.stderr.on('data', function(d) {
		buffer += d.toString();
	});
};
// - - end of getTotalDuration
// - - - - - - - - - - - - - - - - - - - -


/**
 * inMemoryStitch
 *
 * stitch TS files on the fly, piping the resulting stream to the response;
 * the resulting file can be either ts or fragmented mp4.
 *
 * for better compatibility with different players, the duration is being injected
 * in the mp4 mvhd header, making any timescale adjustment if necessary.
 *
 * @param { array } files  array of files to be concatenated, full path
 * @param { object } offset  contains total '.duration' of concatenated files and '.begin' offset, all in unix_ms
 * @param { object } req  request object // TODO: pass request params instead of request
 * @param { object } res  response object // TODO: use a callback instead of passing response directly
 */
var inMemoryStitch = function( files, offset, req, res ) {

    var fileList = files.join('|');
    fileList = "concat:" + fileList;

	var format = (req.query.format == 'mp4') ? 'mp4' : 'ts';

	var opts = [
		'-y', 
		'-i', fileList, 
		'-ss', offset.begin/1000, 
		'-t', offset.duration/1000,
		'-loglevel', 'quiet',
		'-c', 'copy', 
	];

	if (format == 'mp4') {
		opts.push(
			'-f', 'mp4',
			'-movflags', 'empty_moov+frag_keyframe+default_base_moof'
		);
	} else {
		opts.push(
			'-f', 'mpegts'
		);
	}

	opts.push('-');

	var child = spawn('./ffmpeg', opts);

	var begin = parseInt( req.query.begin, 10 );
	var end = parseInt( req.query.end, 10 );
	var camId = req.params.id;
	var streamId = req.query.stream;

	var filename = 'solinkVms_' + camId + '_' + begin + '_' + end + '.' + format;
	var contentType = (format == 'mp4') ? 'video/mp4' : 'video/MP2T';

	res.writeHead(200, {
		'Content-Type': contentType,
		'Content-disposition': 'attachment; filename=' + filename
	});
	
	var got_duration = false;
	var done = false;

	child.stdout.on('data', function(d) {

		// only inject duration if output format is mp4 
		// and duration hasn't been injected yet
		if (got_duration || format == 'ts') {
			return res.write(d);
		}

		// total duration, millis
		var duration = offset.duration;

		for (var i = 0; i < d.length - MVHD_HEADER.length; i++) {

			// duration has been injected, 
			// terminate loop
			if (got_duration) {
				break;
			}

			if (
				d[i + 0] == MVHD_HEADER[0] && 
				d[i + 1] == MVHD_HEADER[1] &&
				d[i + 2] == MVHD_HEADER[2] &&
				d[i + 3] == MVHD_HEADER[3] 
			) {
				got_duration = true;
				
				var timescale = ( d[TIMESCALE_BYTE_OFFSET + i + 0] << 24 ) +
					        ( d[TIMESCALE_BYTE_OFFSET + i + 1] << 16 ) +
					        ( d[TIMESCALE_BYTE_OFFSET + i + 2] << 8 ) +
					        ( d[TIMESCALE_BYTE_OFFSET + i + 3] << 0 );

				// according to mp4 specs:
				// duration_mvhd = duration_seconds * timescale
				duration = Math.round( duration * (timescale / 1000.0) );
				duration = duration.toString(16);

				if (duration.length > 2*DURATION_BYTE_LENGTH) {
					console.error('[ffmpeg.inMemoryStitch]  duration is greater than ' + 8*DURATION_BYTE_LENGTH + ' bits');
					if (!done) {
						done = true;
						return res.status(500).end('duration is more than ' + 8*DURATION_BYTE_LENGTH + ' bits: ' + duration);
					}
				}

				// fill with 0s to make sure duration has exactly DURATION_BYTE_LENGTH bytes
				while(duration.length < 2*DURATION_BYTE_LENGTH) {
					duration = '0' + duration;
				}

				var dur = new Buffer( duration, 'hex' );

				for (var k = 0; k < DURATION_BYTE_LENGTH; k++) {
					d[DURATION_BYTE_OFFSET + i + k] = dur[k];
				}
			}		
		}
		res.write(d);
	});

	child.stdout.on('end', function() {
		if (!done) {
			done = true;
			res.end();
		}
	});
};
// - - end of inMemStitch
// - - - - - - - - - - - - - - - - - - - -


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


/**
 * getDurationAndStitch
 *
 */
var getDurationAndStitch = function( files, offset, req, res ) {

	getTotalDuration( files, function(err, totalDuration) {
		if (err) {
			console.error('[ffmpeg.getDurationAndStitch]  ' + err);
			return res.status(500).end('error when determining duration');
		}

		// calculate duration of video to be downloaded
		offset.duration = totalDuration - offset.begin;

		inMemoryStitch( files, offset, req, res );
	});
};
// - - end of getDurationAndStitch
// - - - - - - - - - - - - - - - - - - - -


// exports
exports.calcDuration = calcDuration;
exports.makeThumb = makeThumb;
exports.inMemoryStitch = getDurationAndStitch;
exports.checkH264 = checkH264;
