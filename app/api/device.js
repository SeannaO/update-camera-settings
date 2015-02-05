var request = require('request');

module.exports = function( app, passport) {

	if (process.env['NODE_ENV'] === 'development') {
		device_url = 'https://192.168.215.129/cp/SystemInfo?v=2';
		storage_url = 'https://Administrator:password@192.168.215.129/cp/StorageInfo?v=2';
	} else {
		
		var password = process.env['PASSWORD'];
		var user = process.env['USER'];

		device_url = 'https://localhost/cp/SystemInfo?v=2';
		storage_url = 'https://' + user + ':' + password + '@localhost/cp/StorageInfo?v=2';
	}

	
	// - - -
	// gets json device info
	app.get('/device.json', passport.authenticate('basic', {session: false}), function(req, res) {
		
		var device_url = '';

		if (process.env['NODE_ENV'] === 'development') {
			device_url = 'https://192.168.215.129/cp/SystemInfo?v=2';
		} else {
			device_url = 'https://localhost/cp/SystemInfo?v=2';
		}


		request({ 
			method: 'GET',
			strictSSL: false,
			uri: device_url,
			timeout: 5000
			}, function (error, response, body) {
				if (error){
					console.error("*** getCamera within device.json: ");
					console.error( error ) ;
					console.error("* * *");
					res.status(422).json({ success: false, error: error });
				}else{
					res.writeHead(200, {'Content-Type': 'application/json'});
					res.end(body)
				}
			}
		);
	});

	// - - -
	// gets json device info
	app.get('/device/storage.json', passport.authenticate('basic', {session: false}), function(req, res) {

		var storage_url = '';

		if (process.env['NODE_ENV'] === 'development') {
			storage_url = 'https://Administrator:password@192.168.215.129/cp/StorageInfo?v=2';
		} else {
			
			var password = process.env['PASSWORD'];
			var user = process.env['USER'];

			storage_url = 'https://' + user + ':' + password + '@localhost/cp/StorageInfo?v=2';
		}
	
		request({ 
			method: 'GET',
			strictSSL: false,
			uri: storage_url,
			timeout: 5000
			}, function (error, response, body) {
				if (error){
					console.error("*** getCamera within /device/storage.json: ");
					console.error( error ) ;
					console.error("* * *");
					res.status(422).json({ success: false, error: error });
				}else{
					res.writeHead(200, {'Content-Type': 'application/json'});
					res.end(body)
				}
			}
		);
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

