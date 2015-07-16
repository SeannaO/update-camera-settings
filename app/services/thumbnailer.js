'use strict';

var exec  = require('child_process').exec;
var spawn = require('child_process').spawn;

var thumbnailerProcess = null;

var launchThumbnailer = function() {

	exec('killall -9 thumbnailer', function( error, stdout, stderr) {

		console.log('[thumbnailer] launching thumbnailer');
		thumbnailerProcess = spawn('./thumbnailer');
		thumbnailerProcess.on('exit', function() {
			console.error('[thumbnailer] relaunching thumbaniler');
			launchThumbnailer();	
		});
	});
};

exports.launch = launchThumbnailer;
