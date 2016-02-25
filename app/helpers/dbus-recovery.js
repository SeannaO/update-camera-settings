'use strict';

var exec  = require('child_process').exec;

var restarting = false;

var RESTART_DBUS_CMD = {
	debian_wheezy:  'service dbus restart',
	qnap:           '/etc/init.d/avahi restart'
};

exports.restartDbus = function() {

	if (restarting) {
		return;
	}

	restarting = true;

	console.log('[dbus-recovery]  restarting dbus...');

	var dbusRestart = exec( RESTART_DBUS_CMD.qnap, function(err, stdout, stderr) {
		console.log('[dbus-recovery]  ' + stdout);
		if ( stderr ) { console.error('[dbus-recovery]  ' + stderr); }
		if ( err ) { console.error('[dbus-recovery]  ' + err); }
	});

	setTimeout( function() {
		console.log('[dbus-recovery]  dbus restarted; exiting vms...');
		process.exit();
	}, 15*1000);
};

