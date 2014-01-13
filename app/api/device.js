var request = require('request');

var storage_url = '';
var device_url = '';

if (process.env['NODE_ENV'] === 'development') {
	device_url = 'https://192.168.215.129/cp/SystemInfo?v=2';
	storage_url = 'https://Administrator:password@192.168.215.129/cp/StorageInfo?v=2';
} else {
	
	var password = process.env['PASSWORD'];
	var user = process.env['USER'];

	device_url = 'https://localhost/cp/SystemInfo?v=2';
	storage_url = 'https://' + user + ':' + password + '@localhost/cp/StorageInfo?v=2';
}


module.exports = function( app, passport) {
	
	// - - -
	// gets json device info
	app.get('/device.json', passport.authenticate('basic', {session: false}), function(req, res) {
		request({ 
			method: 'GET',
			strictSSL: false,
			uri: device_url,
			timeout: 5000
			}, function (error, response, body) {
				if (error){
					res.json({ success: false, error: error });
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
		request({ 
			method: 'GET',
			strictSSL: false,
			uri: storage_url,
			timeout: 5000
			}, function (error, response, body) {
				if (error){
					res.json({ success: false, error: error });
				}else{
					res.writeHead(200, {'Content-Type': 'application/json'});
					res.end(body)
				}
			}
		);
	});	

};

