var onvif = require('./onvif.js');
var psia = require('./psia.js');


module.exports = function( app ) {

	app.get('/scan.json', function( req, res ) {
		
		scan('192.168.215', function(camList) {
			console.log(camList);
			res.end(JSON.stringify( camList) );
		});
	});

};


var scan = function(prefix, cb ) {
	
	var camList = [];
	psiaScan( prefix, function(list) {
		camList = camList.concat(list);
		console.log(list);
		onvifScan( prefix, function(list) {
			camList = camList.concat(list);
			console.log(list);
			if (cb) {
				cb(camList);
			}
		});
	});
};


var onvifScan = function( prefix, cb ) {
	console.log("scanning for onvif cameras...");

	onvif.scan('192.168.215', function(list) {
	
		var camList = [];

		console.log(':: found ' + list.length + ' onvif cameras:' );

		for (var c in list) {
			onvif.getRtspUrl(list[c], 0, function(err, response, ip) {

				if (response.indexOf('upported') !== -1) {
					console.log( '\t' + ip + " : does not support basic onvif actions" );
					camList.push({
						ip: ip,
						type: 'onvif',
						status: 'not_supported'
					});
				} else if (response.indexOf('uthorized') !== -1) {
					console.log( '\t' + ip + " : needs authentication" );
					camList.push({
						ip: ip,
						type: 'onvif',
						status: 'needs_authentication'
					});
				} else {
					console.log( '\t' + ip + " : success" );
					camList.push({
						ip: ip,
						type: 'onvif',
						status: 'ok'
					});					
				}

				if (camList.length === list.length && cb) {
					cb(camList) ;
				}
			});
		}
	});
};


var psiaScan = function( prefix, cb ) {

	console.log("scanning for psia cameras...");

	psia.scan(prefix, function(list) {

		var camList = [];

		console.log(':: found ' + list.length + ' psia cameras:' );
		
		for (var c in list) {
			
			var cam  = list[c];

			if ( cam.status === 'authentication') {
				console.log( '\t' + cam.ip + " : needs authentication" );
				camList.push({
					ip: cam.ip,
					type: 'psia',
					status: 'needs_authentication'
				});
			} else if ( cam.status === 'psia' ) {
				console.log( '\t' + cam.ip + " : psia ready" );
				camList.push({
					ip: cam.ip,
					type: 'psia',
					status: 'ok'
				});
			} else {
				console.log( '\t' + cam.ip + " : error" );
				camList.push({
					ip: cam.ip,
					type: 'psia',
					status: 'not_supported'
				});
			}
		}

		if (cb) {
			cb(camList);
		}
	});
};
