var onvif = require('./protocols/onvif.js');
var psia = require('./protocols/psia.js');

var request = require('request');

var api = require( './cam_api/api.js').api;
var camList = Object.keys( api );


module.exports = function( app, prefix ) {
	
	app.get('/scan.json', function( req, res ) {
		scan(prefix, function( camlist ) {
			console.log('camera scanner: ');
			console.log( camlist );
			res.json( camlist );
		});
	});

	app.get('/rtsp_url', function( req, res ) {
		
		var manufacturer = req.query.manufacturer;

		var ip = req.query.ip;
		var user = req.query.user;
		var pass = req.query.pass;
		
		var resolution = req.query.res || '1280x960';
		var framerate = req.query.fps || '30';
		var quality = req.query.q || '5';
		
		if ( camList.indexOf( manufacturer ) > -1 ) {

			var rtspUrl = require('./cam_api/'+api[manufacturer]).getRtspUrl({
				ip: ip,
				user: user,
				password: pass
			}, {
				name: 'solink',
				description: 'profile for solink vms',
				resolution: resolution,
				framerate: framerate
			});

			res.json( {
				url: rtspUrl 
			});
		} else {
			res.json({
				error: 'unknown manufacturer'
			});
		}
	});
};



var detectCamByHttpResponse = function( ip, response, cb ) {

	if ( typeof response === 'function' ) {
		cb = response;
		response = '';
	} else if ( response !== '') {
		for (var i in camList) {
			if ( response.toLowerCase().indexOf( camList[i] ) != -1 ) {
				if (cb) cb( camList[i] );
				return;
			}
		}
	}

	var options = {
		url: 'http://' + ip,
		headers: {
			'User-Agent': 'nodejs'
		}
	};

	request( options,
		function (error, response, body) {

			if ( !error && response.headers['www-authenticate'] ) {
				
				var realm = response.headers['www-authenticate'];
				
				for (var i in camList) {
					if ( realm.toLowerCase().indexOf( camList[i] ) != -1 ) {
						if (cb) cb( camList[i] );
						return;
					}
				}
			} else if ( !error && response.body !== '' ) {

				console.log( response.body );
				for (var i in camList) {
					if ( response.body.toLowerCase().indexOf( camList[i] ) != -1 ) {
						if (cb) cb( camList[i] );
						return;
					}
				}				
			} else {

				if (cb) cb( 'unkwnown' );
			}
			if (cb) cb('unknwon');
		}
	);
};


var scan = function(prefix, cb ) {
	
	var camList = [];
	psiaScan( prefix, function(psia) {
		camList = camList.concat(psia);
		onvifScan( prefix, function(onvif) {
			camList = camList.concat(onvif);
			if (cb) {
				cb(camList);
			}
		});
	});
};


var addCam = function( cam, response, cb ) {

	if ( typeof response === 'function' ) {
		cb = response;
		response = '';
	}

	detectCamByHttpResponse( cam.ip, response, function( name ) {
		cam.name = name;
		if (cb) cb( cam );
	});
};


var onvifScan = function( prefix, cb ) {
	console.log("scanning for onvif cameras...");

	onvif.scan(prefix, function(list) {
	
		var camList = [];
		
		for (var c in list) {
			onvif.getRtspUrl(list[c], 0, function(err, response, ip) {

				var status = '';

				if (response.indexOf('upported') !== -1) {
					status = 'not_supported';
				} else if (response.indexOf('uthorized') !== -1) {
					status = 'auth';
				} else {
					status = 'ok';
				}

				var c = {
					ip: ip,
					type: 'onvif',
					status: status
				};

				addCam( c, response, function( cam ) {
					camList.push( cam );
					if (camList.length === list.length && cb) {
						cb(camList);
					}
				});
			});
		}
	});
};


var psiaScan = function( prefix, cb ) {

	console.log("scanning for psia cameras...");

	psia.scan(prefix, function(list) {

		var camList = [];
		
		for (var c in list) {

			addCam( list[c], function( cam ) {
				cam.type = 'psia';
				camList.push( cam );
				if (camList.length === list.length && cb) {
					cb(camList);
					return;
				}
			});
		}

	});
};



