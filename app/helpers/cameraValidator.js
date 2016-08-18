'use strict';

var _ = require('lodash');


/**
 * Checks if IP does not contain non-numeric chars
 *   TODO: perform full validation
 *
 * @param { ip } String  IP address
 * @return { boolean }  false if IP contains non-numeric chars or is not composed of 4 groups of digits; true otherwise 
 */
function checkIP( ip ) {
	var re = /\d+\.\d+\.\d+\.\d+\b/;
	return re.test( ip );
}


/**
 * Validate camera;
 *   checks if camera and streams are objects,
 *   make sure IPs do not contain non numeric chars,
 *   as such invalid IPs may cause a segfault on QNAP devices
 *
 * @param { cam } Object  camera object
 * @return { String }  message when there's error, null if no errors were found 
 */
function validateCamera( cam ) {

	if (!cam || typeof(cam) !== 'object') {
		return 'invalid camera object';
	}

	// validate IP
	var ip = cam.ip;

	if ( !checkIP( ip ) ) {
		return 'invalid ip';
	}

          if (cam.name) { 
              cam.name = _.trim( cam.name );
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
			} else if ( rtsp_url ) {
                                  cam.streams[s].url = _.trim( cam.streams[s].url );
                              }

                              if ( cam.streams[s].name ) {
                                  cam.streams[s].name = _.trim( cam.streams[s].name );
                              }
		}
	}

	if (cam.spotMonitorStreams && cam.spotMonitorStreams.length > 0) {
		for (var s in cam.spotMonitorStreams) {

			if (!cam.spotMonitorStreams[s] || typeof(cam.spotMonitorStreams[s]) !== 'object') { 
				return 'invalid spotMonitorStream object'
			}

			var rtsp_url = cam.spotMonitorStreams[s].url;
			
			if ( rtsp_url && !checkIP( rtsp_url ) ) {
				return 'invalid IP in rtsp url: ' + rtsp_url;
			} else if ( rtsp_url ) {
                                  cam.spotMonitorStreams[s].url = _.trim( cam.spotMonitorStreams[s].url );
                              }

                              if ( cam.spotMonitorStreams[s].name ) {
                                  cam.spotMonitorStreams[s].name = _.trim( cam.spotMonitorStreams[s].name );
                              }
		}
	}
}

exports.validate = validateCamera;
