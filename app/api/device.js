var request = require('request');
var exec    = require('child_process').exec;
var os      = require('os');
var path    = require('path');
var fs      = require('fs-extra');
var uptime  = require('../helpers/uptime.js');

var QNAP_PORT = process.env.QNAP_PORT || 8085;
var CHECKIN_DATA_DIR = process.env.CHECKIN_DATA_DIR || '/share/CACHEDEV1_DATA/SolinkConnect/data/checkin/db';

module.exports = function( app, passport) {

	// - - -
	// gets json device info
	app.get('/device.json', passport.authenticate('basic', {session: false}), function(req, res) {
		
		getDeviceInfo( function(d) {
			d.uptime_ms = uptime.getUptime();
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

	app.get('/id', passport.authenticate('basic', {session: false}), function(req, res) {
		fs.readJson(path.join(CHECKIN_DATA_DIR, 'Registration.json'), function (err, reg) {
			if (err)
				res.status(503).json(err.message);
			else
				res.status(200).json(reg.deviceId);
		});
	});
};


var getQNAPInfo = function( cb ) {

	var modelRegex    = /<modelName>.*?CDATA\[(.*?)\].*?<\/modelName>/;
	var firmwareRegex = /<firmware>.*?CDATA\[(.*?)\].*?<\/version>/;

	var model    = '-';
	var firmware = '-';

	request({
		uri:      'http://localhost:' + QNAP_PORT + '/cgi-bin/sysinfoReq.cgi',
		timeout:  2*1000
	}, function( err, res, body) {
		if (!err && body) {

			var rModel = body.match( modelRegex );
			if (rModel && rModel[1]) {
				model = rModel[1];
			}

			var rFirmware = body.match( firmwareRegex );
			if ( rFirmware && rFirmware[1] ) {
				firmware = rFirmware[1];
			}
		}
	 	cb({
			model:     model,
			firmware:  firmware
		});
	});
};


var getDeviceInfo = function( cb ) {

		if (!cb) return;

		var localIp = process.env.IP;

		var list  = localIp.split('.');
		var subnet = list[list.length-1];

		exec('df -m ' + process.env.BASE_FOLDER + '|grep /', function (err, resp){
			
			var respList = resp.replace(/\s+/gm,' ').split(' ');
			var memUsed = parseInt(respList[2]) * 1024 * 1024;
			var memFree = parseInt(respList[3]) * 1024 * 1024;
			var memSize = memFree + memUsed;

			hostname = os.hostname();

			getQNAPInfo( function( qnap ) {
				cb({
					size:      memSize,
					used:      memUsed,
					model:     qnap.model,
					name:      hostname + ' ' + subnet,
					ip:        localIp,
					firmware:  qnap.firmware
				});
			});
		});	
}
