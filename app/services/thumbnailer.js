'use strict';

var exec  = require('child_process').exec;
var spawn = require('child_process').spawn;

var dbusRecovery = require('../helpers/dbus-recovery');

var thumbnailerProcess = null;

var launchThumbnailer = function() {

	exec('killall -9 thumbnailer', function( error, stdout, stderr) {

		console.log('[thumbnailer]  launching thumbnailer');
		thumbnailerProcess = spawn('./thumbnailer');

		thumbnailerProcess.stderr.on('data', function(d) {

			if (!d) return;
			var err = d.toString();
			console.error('[thumbnailer]  ' + err);

			if ( err.indexOf('dbus connection error') >= 0) {
				dbusRecovery.restartDbus();
			}
		});

		thumbnailerProcess.once('exit', function() {
			console.error('[thumbnailer]  relaunching thumbnailer');
			launchThumbnailer();	
		});
	});
};

exports.launch = launchThumbnailer;
