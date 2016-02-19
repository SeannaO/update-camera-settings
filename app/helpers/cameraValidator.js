'use strict';

function checkIP( ip ) {
	var re = /\d+\.\d+\.\d+\.\d+\b/;
	return re.test( ip );
}


function validateCamera( cam ) {

	if (!cam || typeof(cam) !== 'object') {
		return 'invalid camera object';
	}

	// validate IP
	var ip = cam.ip;

	if ( !checkIP( ip ) ) {
		return 'invalid ip';
	}

	// validate rtsp url for each stream
	if (cam.streams && cam.streams.length > 0) {
		for (var s in cam.streams) {

			if (!cam.streams[s] || typeof(cam.streams[s]) !== 'object') { 
				return 'invalid stream object'
			}

			var rtsp_url = cam.streams[s].url;
			
			if ( rtsp_url && !checkIP( rtsp_url ) ) {
				return 'invalid IP in rtsp url: ' + rtsp_url;
			}
		}
	}
}

exports.validate = validateCamera;
