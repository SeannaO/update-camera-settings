var request = require('request');
var api = require( './cam_api/api.js').api;
var camList = Object.keys( api );

module.exports = function( options ) {
			
		var manufacturer = options.manufacturer;

		var ip = options.ip;
		var user = options.user;
		var pass = options.password;
		
		var resolution = options.res || '1280x960';
		var framerate = options.framerate || '30';
		var quality = options.quality || '5';
		
		if ( camList.indexOf( options.manufacturer ) > -1 ) {

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

			return {
				url: rtspUrl 
			};
		} else {
			return {
				error: 'unknown manufacturer'
			};
		}
};
