'use strict';

var exec           = require('child_process').exec;
var spawn          = require('child_process').spawn;
var MemoryMonitors = require('./memory-monitors.js');


var grabberProcess          = null,
	restartRecordingTimeout = null;


var launchRtspGrabber = function( cb ) {

	exec('killall -9 rtsp_grabber', function( error, stdout, stderr) {
		console.log('[rtspGrabber] launching rtsp_grabber');

		if (grabberProcess) {
			grabberProcess.removeAllListeners();
		}

		grabberProcess = spawn('./rtsp_grabber');
		
		// (re)launch rtsp_grabber mem monitor
		MemoryMonitors.launchRtspMemMonitor( 50, grabberProcess );

		grabberProcess.once('exit', function(code) {

			console.error('[rtspGrabber] rtsp_grabber exited; relaunching...');
			launchRtspGrabber( cb );
			console.log('[rtspGrabber] rtsp_grabber relaunched'); 

			clearTimeout(restartRecordingTimeout);
			restartRecordingTimeout = setTimeout( function() {
				console.log('[app] restarting recorder');
				if (cb) { cb(); }
			}, 1000);
		});
	});
};

exports.launch = launchRtspGrabber;