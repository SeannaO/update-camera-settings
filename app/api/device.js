var request = require('request');
var exec = require('child_process').exec;
var os = require('os');

module.exports = function( app, passport) {

	// - - -
	// gets json device info
	app.get('/device.json', passport.authenticate('basic', {session: false}), function(req, res) {
		
		getDeviceInfo( function(d) {
			res.status(200).json(d);
		});
	});


	// - - -
	// gets json device info
	app.get('/device/storage.json', passport.authenticate('basic', {session: false}), function(req, res) {

		getDeviceInfo( function(d) {
			res.status(200).json(d);
		});
	});

	// get timezone
	app.get('/device/tz.json', passport.authenticate('basic', {session: false}), function(req, res) {
	
		var gmt_re = /GMT[+-]\w+/;
		var tz_re = /\((\w+)\)/;
		var d = new Date();

		var gmt = gmt_re.exec(d);
		if (gmt && gmt.length > 0) gmt = gmt[0];
		else gmt = '';

		var tz = tz_re.exec(d);
		if (tz && tz.length > 1) tz = tz[1];
		else tz = '';

		var offset = d.getTimezoneOffset();

		var data = {
			gmt:         gmt,
			tz_name:     tz,
			utc_offset:  offset
		};

		res.json( data );
	});

};


var getDeviceInfo = function( cb ) {

		if (!cb) return;

		var localIp = process.env.IP;

		var list  = localIp.split('.');
		var subnet = list[list.length-1];

		exec('df -k ' + process.env.BASE_FOLDER + '|grep /', function (err, resp){
			
			var respList = resp.replace(/\s+/gm,' ').split(' ');
			var memUsed = parseInt(respList[2]) * 1024;
			var memFree = parseInt(respList[3]) * 1024;
			var memSize = memFree + memUsed;

			hostname = os.hostname();

			cb({
				size:     memSize,
				used:     memUsed,
				model:    'Connect over QNAP',
				name:     hostname + ' ' + subnet,
				ip:       localIp,
				version:  '-'
			});
		});	
}
