var request = require('request');
var http    = require('http');
var onvif   = require('./protocols/onvif.js');
var psia    = require('./protocols/psia.js');
var api     = require( './cam_api/api.js').api_list;
var zlib    = require('zlib');

var camList = Object.keys( api );

var busy = false;

var emitter = new (require('events').EventEmitter)();

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
	
	if (busy) {
		console.error('[scanner] scanner is busy');
		cb('busy');
		return;
	}

	busy = true;
	emitter.emit('status', {
		busy: true
	});

	foundCams = [];
	psiaScan( prefix, function(psia) {
		// console.log("ok, scanning onvif cameras now");
		onvifScan( prefix, function(onvif) {
			for(var i in psia){
			   var shared = false;
			   for (var j in onvif)
			       if (onvif[j].ip == psia[i].ip) {
			           shared = true;
			           break;
			       }
			   if(!shared) foundCams.push(psia[i])
			}
			foundCams = foundCams.concat(onvif);
			console.log("[scanner.scan] done scanning cameras");
			if (cb) {
				busy = false;
				emitter.emit('status', {
					busy: false
				});
				cb(foundCams);
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
	var lock = false;

	onvif.scan(prefix, emitter, 254, function(list) {
	
		if (lock) return;
		lock = true;

		var onvifCamList = [];
		
		
		if (list.length === 0) {
			if (cb) cb([]);
			return;
		}

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
					onvifCamList.push( cam );
					if (onvifCamList.length === list.length && cb) {
						cb(onvifCamList);
					}
				});
			});
		}
	});
};


var psiaScan = function( prefix, cb ) {

	console.log("scanning for psia cameras...");
	var lock = false;
	psia.scan(prefix, emitter, 0, function(list) {
		if (lock) {
			return;
		}
		lock = true;
		var psiaCamList = [];
		
		if (!list || list.length === 0) {
			if (cb) cb([]);
			return;
		}

		for (var c in list) {

			addCam( list[c], function( cam ) {
				cam.type = 'psia';
				psiaCamList.push( cam );
				if (psiaCamList.length === list.length && cb) {
					cb(psiaCamList);
					return;
				}
			});
		}

	});
};


module.exports.scan = scan;
module.exports.emitter = emitter;
