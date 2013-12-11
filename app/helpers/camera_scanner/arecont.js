var request = require('request');

var digest = new Buffer("admin:admin").toString('base64');


function setMotion( cb ) {

	var options = {
		url: 'http://admin:admin@192.168.215.117/get?mdresult&id='+Date.now(),
		headers: {
			'User-Agent': 'nodejs',
			'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
			'Authorization': 'Basic ' + digest
		}
	};

	request( options,
		function (error, response, body) {
			if (!error && response.statusCode == 200) {
				console.log(Date.now() + " : " + body.toString());
			} else {
				console.log(response.headers);
				console.log(error);
				console.log(response.statusCode);
			}
			if(cb) cb();
		}
	);
}


function getMotion( cb ) {

	var options = {
		url: 'http://admin:admin@192.168.215.117/get?mdresult&id='+Date.now(),
		headers: {
			'User-Agent': 'nodejs',
			'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
			'Authorization': 'Basic ' + digest
		}
	};

	request( options,
		function (error, response, body) {
			if (!error && response.statusCode == 200) {
				console.log(Date.now() + " : " + body.toString());
			} else {
				console.log(response.headers);
				console.log(error);
				console.log(response.statusCode);
			}
			if(cb) cb();
		}
	);
}

function pollForMotion() {
	getMotion( function() {
		pollForMotion();
	});
}

pollForMotion();
