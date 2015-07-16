'use strict';

var exec  = require('child_process').exec;
var spawn = require('child_process').spawn;
var os    = require('os');
var fs    = require('fs');

var nodeMemMonitorInterval = null,
	rtspMemMonitorInterval = null;


var getPercentageUsage = function(mem) {
	var percent = 100*( 1.0*mem / os.totalmem() );
	return percent;
};


// monitors memory usage of rtsp_grabber
// kills rtsp_grabber if memory usage is greater than max_mem
var launchRtspMemMonitor = function( max_mem, grabberProcess ) {

	if (!grabberProcess) {
		console.error('[rtspMemMonitor]  invalid process');
		return;
	}

	var pid = grabberProcess.pid;

	if (!pid) {
		console.error('[rtspMemMonitor]  invalid PID');
		return;
	}

	var re = /VmRSS:\s+(\d+)/;
	max_mem = max_mem || 50;
	clearInterval( rtspMemMonitorInterval );
	rtspMemMonitorInterval = setInterval( function() {
		fs.readFile( '/proc/' + pid + '/status', function(err, data) {
			if(err) {
				console.error(err);
				return;
			}
			var d = data.toString();
			var match = re.exec(d);
			
			if(!match || !match[1]) {
				console.error('[rtspMemMonitor]  could not find VmRss data');
				return;
			}

			var percent = getPercentageUsage( match[1]*1024 );
			if (percent > max_mem) {
				console.error('[rtspMemMonitor]  rtsp_grabber is getting memory hungry; killing process...');
				grabberProcess.kill();
			}
		});
	}, 5000);
};


// monitors node memory usage
// kills node if memory usage is greater than max_mem
var launchNodeMemMonitor = function( max_mem ) {
	max_mem = max_mem || 30;
	clearInterval( nodeMemMonitorInterval );
	nodeMemMonitorInterval = setInterval( function() {
		var memUsage = process.memoryUsage().rss;
		var percent = getPercentageUsage( memUsage );
		if (percent > max_mem) {
			console.error('[nodeMemMonitor]  node is getting memory hungry; exiting...');
			process.exit();
		}
	}, 5000);
};


var launch = function( opts ) {
	launchNodeMemMonitor( opts.nodeMaxMem || 30 );
	launchRtspMemMonitor( opts.rtspMaxMem || 50, opts.rtspChildProcess );
};

exports.launchRtspMemMonitor = launchRtspMemMonitor;
exports.launchNodeMemMonitor = launchNodeMemMonitor;
exports.launch = launch;
