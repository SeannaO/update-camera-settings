'use strict';

var exec  = require('child_process').exec;

var restarting = false;

// var RESTART_DBUS_CMD = 'service dbus restart';  // Debian Wheezy
var RESTART_DBUS_CMD = '/etc/init.d/avahi restart' // QNAP

exports.restartDbus = function() {

	if (restarting) {
		return;
	}

	restarting = true;

	console.log('[dbus-recovery]  restarting dbus...');
	console.log('[dbus-recovery]  executing:  ' + RESTART_DBUS_CMD);

	var dbusRestart = exec( RESTART_DBUS_CMD, function(err, stdout, stderr) {
		if ( stdout ) { console.log('[dbus-recovery]  ' + stdout); }
		if ( stderr ) { console.error('[dbus-recovery]  ' + stderr); }
		if ( err ) { console.error('[dbus-recovery]  ' + err); }
	});

	setTimeout( function() {
		console.log('[dbus-recovery]  command to restart dbus was executed; exiting vms...');
		process.exit();
	}, 15*1000);
};

