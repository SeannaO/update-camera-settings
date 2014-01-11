var request = require('request');

module.exports = function( app, passport) {
	
	// - - -
	// gets json device info
	app.get('/device.json', passport.authenticate('basic', {session: false}), function(req, res) {
		request({ 
			method: 'GET',
			strictSSL: false,
			uri: 'https://192.168.215.129/cp/SystemInfo?v=2',
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
			uri: 'https://Administrator:password@192.168.215.129/cp/StorageInfo?v=2',
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

