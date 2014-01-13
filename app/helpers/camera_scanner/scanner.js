var request = require('request');
var http = require('http');
var onvif = require('./protocols/onvif.js');
var psia = require('./protocols/psia.js');
var api = require( './cam_api/api.js').api_list;
var zlib = require('zlib');

var camList = Object.keys( api );

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

	var req = request( options, 
		function (error, response, body) {
			if ( !error && response.headers['www-authenticate'] ) {
				
				var realm = response.headers['www-authenticate'];

				for (var i in camList) {
					if ( realm.toLowerCase().indexOf( camList[i] ) != -1 ) {
						if (cb) cb( camList[i] );
						return;
					}
				}
			}
		}
	);

	var buffer = [];
	var gunzip = zlib.createGunzip();
	
	req.on('response', function(res) {
		var encoding = res.headers['content-encoding'];
		if (encoding === 'gzip') {
			res.pipe( gunzip );	
		} else {
			if (cb) cb('unknown');
		}		
	});

	gunzip.on('data', function(data) {
            buffer.push(data.toString());
        }
	).on("end", function() {
			
		buffer.join('');

		for (var i in camList) {
			if ( buffer.toString().toLowerCase().indexOf( camList[i] ) != -1 ) {
				if (cb) cb( camList[i] );
				return;
			}
		}		

		if (cb) cb('unknown');

        }
	).on("error", function(e) {
            if(cb) cb('unknown');
        }
	);
};


var scan = function(prefix, cb ) {
	
	var camList = [];
	psiaScan( prefix, function(psia) {
		onvifScan( prefix, function(onvif) {
			for(var i in psia){
			   var shared = false;
			   for (var j in onvif)
			       if (onvif[j].ip == psia[i].ip) {
			           shared = true;
			           break;
			       }
			   if(!shared) camList.push(psia[i])
			}
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

	detectCamByHttpResponse( cam.ip, response, function( manufacturer ) {
		cam.manufacturer = manufacturer;
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
					status = 'not supported';
				} else if (response.indexOf('uthorized') !== -1) {
					status = 'unauthorized';
				} else {
					status = 'missing camera stream(s)';
				}

				var new_cam = {
					ip: ip,
					type: 'onvif',
					status: status
				};

				addCam( new_cam, response, function( cam ) {
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



module.exports.scan = scan;
