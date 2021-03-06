var request     = require('request');
var xml2js      = require('xml2js').parseString;
var net         = require('net');
var axis_motion = require('./axis_motion.js');
var async       = require('async');

var baseUrl = 'http://{user}:{pass}@{ip}/axis-cgi/param.cgi?action=';
var createProfileUrl = baseUrl + 'add&template=streamprofile&group=StreamProfile';
var configureStreamUrl = baseUrl 
	+ 'update&StreamProfile.{temp_profile}.Name={name}'
	+ '&StreamProfile.{temp_profile}.Description={description}' 
	+ '&StreamProfile.{temp_profile}.Parameters={parameters}';
var parametersString = "videocodec=h264&framerate={framerate}&resolution={resolution}";
//var rtspUrl = 'rtsp://{user}:{pass}@{ip}/axis-media/media.amp?{profile_name}&framerate={framerate}&resolution={resolution}';

var rtspUrl = 'rtsp://{user}:{pass}@{ip}/axis-media/media.amp?streamprofile={profile_name}&fps={framerate}&resolution={resolution}&compression={compression}&videocodec=h264&videomaxbitrate={max_bitrate}';

var rtspUrlEncoder = 'rtsp://{user}:{pass}@{ip}/axis-media/media.amp?streamprofile={profile_name}&fps={framerate}&resolution={resolution}&compression={compression}&videocodec=h264&videomaxbitrate={max_bitrate}&camera={camera_no}';

var listParamsUrl = baseUrl + 'list&group={group_name}';
var listAllParamsUrl = baseUrl + 'list';
var listResolutionsUrl = baseUrl + "listdefinitions%20&listformat=xmlschema&group=root.Properties.Image.Resolution";

var listNumberOfSourcesUrl = baseUrl + "listdefinitions%20&listformat=xmlschema&group=root.ImageSource.NbrOfSources";
var listSourceNameUrl = baseUrl + "listdefinitions%20&listformat=xmlschema&group=root.Image.I{source_number}.Name";
var listSourceResolutionsUrl = baseUrl + "listdefinitions%20&listformat=xmlschema&group=root.Image.I{source_number}.Appearance.Resolution";

var Axis = function() {
	this.cam = {};
};

// = = = = = = = = = = = = = = = =
// = = USING NATIVE MOTION NOW = = 
//
//
// if (Axis.server) {
// 	console.log('[Axis.js]  destroying Axis.server');
// 	Axis.server.close();
// 	Axis.server.destroy();
// }
//
// Axis.server = net.createServer(function(socket) { 
// });
// Axis.server.listen(8001, function() { 
// });
//


Axis.prototype.apiName = function() {
	return 'Axis';
};

Axis.prototype.checkForExistingProfile = function( profileName, cb ) {

	var self = this;

	var listUrl = baseUrl
		.replace('{user}', self.cam.user)
		.replace('{pass}', self.cam.password)
		.replace('{ip}', self.cam.ip) + 
		'list';

	request({ 
		url: listUrl,
		headers: {
			'User-Agent': 'nodejs'
		},
		timeout: 10000
	}, function( error, response, body) {
		if (!error && body) {

			var where =  body.indexOf('Name='+profileName + '');

			if (where < 0) {
				cb( where );
				return;
			}

			var profileSubstr = body.substr( where - 5, profileName.length + 10 );
			var profileId = profileSubstr.match(/.S\d+./);
			if (profileSubstr.length <= 0) {
				cb( -1 );
				return;
			}
			profileId = profileId[0];
			profileId = profileId.substr(2, profileId.length-3);
			cb( profileId );
		}
	}
	);
};


Axis.prototype.isProfileH264 = function( profileId, cb ){

	var self = this;

	if (profileId.indexOf('S') === -1) profileId = 'S' + profileId;

	var url = listParamsUrl
		.replace('{user}', self.cam.user)
		.replace('{pass}', self.cam.password)
		.replace('{ip}', self.cam.ip)
		.replace('{group_name}', 'StreamProfile.' + profileId);

	request({ 
		url: url,
		headers: {
			'User-Agent': 'nodejs'
		},
		timeout: 10000
	}, function( error, response, body) {
		if (!error && body) {

			var where =  body.indexOf('h264');
			if (cb) cb( where > -1 );
		}
	}
	);
};


Axis.prototype.createNewProfile = function( profile, cb ) {
	
	var self = this;

	var url = createProfileUrl
		.replace('{user}', self.cam.user)
		.replace('{pass}', self.cam.password)
		.replace('{ip}', self.cam.ip);

	request({ 
		url: url,
		headers: {
			'User-Agent': 'nodejs'
		},
		timeout: 10000
	}, function( error, response, body) {
		if (!error && body) {
			var profileId = body.match(/S\d+/);
			if (profileId && profileId.length <= 0) {
				if (cb) cb(-1);
			} else if(profileId){
				self.updateProfile( profileId[0], profile, function(id) {
					cb(id);
				});
			} else {
				cb(-1);
			}
		}
	}
	);
};


Axis.prototype.isMotionEnabled = function() {

	var self = this;
	
	return self.motion_enabled;
};

Axis.prototype.getMotionParams = function(cb) {
	
	var self = this;
	
	axis_motion.getMotionInfo( self.cam.ip, self.cam.user, self.cam.password, function( err, info ) {
		if (err) {
			cb({ enabled: self.isMotionEnabled() });
		} else {
			cb({
				enabled: self.isMotionEnabled(), 
				threshold: info.object_size, 
				sensitivity: info.sensitivity,
				x:0
			});
		}
	});
};


Axis.prototype.updateProfile = function(profileId, profile, cb) {

	var self = this;

	var id = parseInt( profileId.substr(1, profileId.length) );

	if (profileId.indexOf('S') === -1) profileId = 'S' + profileId;

	if (id > 7) {
		profileId = 'S7';
	}

	var params = parametersString
		.replace('{framerate}', profile.framerate || '15')
		.replace('{resolution}', profile.resolution || '800x600');

	params = encodeURIComponent( params );

	var url = configureStreamUrl
		.replace(/{user}/, self.cam.user)
		.replace(/{pass}/, self.cam.password)
		.replace(/{ip}/, self.cam.ip)
		.replace(/{temp_profile}/g, profileId)
		.replace(/{name}/, profile.name)
		.replace(/{description}/, profile.description)
		.replace(/{parameters}/, params);

	request({ 
		url: url,
		headers: {
			'User-Agent': 'nodejs'
		},
		timeout: 10000
	}, function( error, response, body) {
		if (!error) {
			cb( profileId );
		} else {
			cb(-1);
		}
	}
	);
};


Axis.prototype.createProfile = function( profile ) {

	var self = this;

	console.log('[Axis.createProfile] checking for existing profiles');

	if ( !profile ) {
		console.error('[Axis.createProfile] ERROR - empty profile');
		return;
	}

	profile.name = 'solink';

	self.checkForExistingProfile( profile.name, function( profileId ) {
		// console.log('[Axis.getRtspUrl] profile id: ' + profileId);
		if (profileId > -1) {
			self.isProfileH264(profileId, function(isH264) {
				if (!isH264) {
					// console.log('[Axis.getRtspUrl] profile is not h264; I will change that');
					self.updateProfile( profileId, profile, function(id) {
						// console.log('[Axis.getRtspUrl] now this profile is h264');
					});
				} 
			});
		} else {
			// console.log('[Axis.getRtspUrl] the camera does not have our profile yet. I will create a new one');
			self.createNewProfile( profile, function(id) {
				// console.log('[Axis.getRtspUrl] new profile created');
			});
		}
	});
};


Axis.prototype.getRtspUrl = function ( profile, cb ) {

	var self = this;

	if ( !profile ) {
		console.error('[Axis.getRtspUrl] ERROR - empty profile');
		if(cb) cb();
		return;
	}

	profile.name = 'solink';

	self.createProfile( profile );

	var isEncoder = !isNaN(profile.camera_no);

	if (!isEncoder) {
		var url = rtspUrl
			.replace('{user}', self.cam.user || '')
			.replace('{pass}', self.cam.password || '')
			.replace('{profile_name}', profile.name)
			.replace('{ip}', self.cam.ip)
			.replace('{resolution}', profile.resolution || '800x600')
			.replace('{framerate}', profile.framerate || '15')
			.replace('{compression}', 40)
			.replace('{max_bitrate}', 512);
		if(cb) cb(url);
	} else {
		var cam_no = parseInt(profile.camera_no) + 1;
		var url = rtspUrlEncoder
			.replace('{user}', self.cam.user || '')
			.replace('{pass}', self.cam.password || '')
			.replace('{profile_name}', profile.name)
			.replace('{ip}', self.cam.ip)
			.replace('{resolution}', profile.resolution || '800x600')
			.replace('{framerate}', profile.framerate || '15')
			.replace('{compression}', 40)
			.replace('{max_bitrate}', 512)
			.replace('{camera_no}', cam_no);
		if(cb) cb(url);
	}
};


Axis.prototype.setCameraParams = function(params) {

	this.cam.id       = params.id || this.cam.id;
	this.cam.ip       = params.ip || this.cam.ip;
	this.cam.user     = params.user || params.username || this.cam.user || '';
	this.cam.password = params.password || this.cam.password || '';

};


Axis.prototype.setMotionParams = function(params, cb){

	var self = this;
	// self.motion_enabled = params.enabled;

	if (!params.enabled) {
		cb();
		return;
	}

	self.object_size = self.threshold = params.threshold || self.object_size || 15;
	self.sensitivity = self.sensitivity = params.sensitivity || self.sensitivity || 50;

	var motion_params = {
		object_size: self.object_size,
		sensitivity: self.sensitivity
	};

	axis_motion.configureMotion( self.cam.ip, self.cam.user, self.cam.password, self.cam.id, motion_params, function( err ) {
		if (err) { 
			console.error( '[Axis.setMotionParams] error: ' + err );
		} else {
			self.motion_enabled = params.enabled;
		}
		if (cb) cb( err );
	});

};


Axis.prototype.setupMotionDetection = function(cam, cb){
	// start tcp server if not already started
	// on camera
	// enable motion
	// create a recipient
	// create a notifier
	if (cb) cb();
};


// 
// USING NATIVE MOTION
//
// Axis.prototype.startListeningForMotionDetection = function(cb){
//
// 	var self = this;
// 	
// 	self.motion_enabled = true;
//
// 	self.motionCallback = function(socket) {
//
// 		var self = this;
//
// 		try {
// 			var timestamp = Date.now()
// 				if ( socket.remoteAddress === self.cam.ip ) {
// 					console.log('[Axis.motionDetection] movement detected: ' + self.cam.ip);
// 					if(cb) cb(timestamp, {fd: socket.fd, highWaterMark: socket.highWaterMark}) ;
// 				}
// 		} catch(e) {
// 			console.error("[Axis.motionDetection] Error:" + e);
// 		}
// 	};
//
// 	if (self.motionCallbackWrapper) {
// 		Axis.server.removeListener('connection', self.motionCallbackWrapper);
// 	}
//
// 	self.motionCallbackWrapper = self.motionCallback.bind(self);
// 	Axis.server.on('connection', self.motionCallbackWrapper);
// };
//
//
// Axis.prototype.stopListeningForMotionDetection = function(){
// 	//poll
// 	//emit motion
// 	// clear events
// 	//
// 	var self = this;
// 	this.motion_enabled = false;
// 	if (self.motionCallbackWrapper) {
// 		Axis.server.removeListener('connection', self.motionCallbackWrapper);
// 	}
// };
//

Axis.prototype.getNumberOfSources = function (cb) {

	var self = this;
	var url = listNumberOfSourcesUrl
		.replace('{user}', self.cam.user || '')
		.replace('{pass}', self.cam.password || '')
		.replace('{ip}', self.cam.ip);

	var digest = new Buffer(self.cam.user + ":" + self.cam.password).toString('base64');

	request({ 
		url: url,
		headers: {
			'User-Agent': 'nodejs',
			'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
			'Authorization': 'Basic ' + digest			
		},
		timeout: 10000
	}, function( error, response, body) {
		if (!error && body && body.indexOf('nauthorized') > -1) {
			cb('not authorized', []);
			return;
		}
		if (!error && body)	{

			var srcDataBegin = body.indexOf('value');
			srcDataBegin = body.indexOf('"', srcDataBegin);
			var srcDataEnd = body.indexOf('"', srcDataBegin+1);

			var nSources = body.substring(srcDataBegin + 1, srcDataEnd);
			if ( isNaN(nSources) ) {
				if (cb) cb('could not find number of sources', 0);
				return;
			} 
			else {
				cb(null, nSources);
				return;
			}
		} else{
			cb(error, 0);
		}
	});
};


Axis.prototype.getCameraSourceName = function(camera_no, cb) {
	var self = this;
	var url = listSourceNameUrl
		.replace('{user}', self.cam.user || '')
		.replace('{pass}', self.cam.password || '')
		.replace('{ip}', self.cam.ip)
		.replace('{source_number}', camera_no);

	var digest = new Buffer(self.cam.user + ":" + self.cam.password).toString('base64');

	request({ 
		url: url,
		headers: {
			'User-Agent': 'nodejs',
			'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
			'Authorization': 'Basic ' + digest			
		},
		timeout: 10000
	}, function( error, response, body) {
		if (!error && body && body.indexOf('nauthorized') > -1) {
			cb('not authorized', '');
		}
		if (!error && body)	{

			var srcDataBegin = body.indexOf('value');
			srcDataBegin = body.indexOf('"', srcDataBegin);
			var srcDataEnd = body.indexOf('"', srcDataBegin+1);

			var sourceName = body.substring(srcDataBegin + 1, srcDataEnd);
			sourceName = sourceName || 'camera ' + camera_no;
			cb(null, sourceName);
		} else{
			cb(error, '');
		}
	});
};


Axis.prototype.getResolutionOptions = function(cb) {

	var self = this;
	self.getNumberOfSources(function(err, nSources) {
		if (nSources > 1) {
			var sourcesNumbers = [];
			for (var i = 0; i < nSources; i++) {
				sourcesNumbers.push(i);
			}
			async.map(sourcesNumbers, self.getCameraSourceName.bind(self), function(err, result) {
				var sourceNames = result;
				async.map(sourcesNumbers, self.getResolutionOptionsForEncoderCamera.bind(self), function(err, result) {
					var cameraResolutions = [];
					for (var i in sourcesNumbers) {
						cameraResolutions.push({
							name: sourceNames[i],
							camera_no: i,
							resolutions: result[i]
						});
					}

					cb(err, cameraResolutions);
				});
			});
		} else {
			self.getResolutionOptionsForSingleCamera( cb );
		}
	});
};


Axis.prototype.getResolutionOptionsForEncoderCamera = function (camera_no, cb) {

	var self = this;
	var url;
		url = listResolutionsUrl
		.replace('{user}', self.cam.user || '')
		.replace('{pass}', self.cam.password || '')
		.replace('{ip}', self.cam.ip);

		// url = listSourceResolutionsUrl 
		// .replace('{user}', self.cam.user || '')
		// .replace('{pass}', self.cam.password || '')
		// .replace('{ip}', self.cam.ip)
		// .replace('{source_number}', camera_no);

	var digest = new Buffer(self.cam.user + ":" + self.cam.password).toString('base64');

	request({ 
		url: url,
		headers: {
			'User-Agent': 'nodejs',
			'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
			'Authorization': 'Basic ' + digest			
		},
		timeout: 10000
	}, function( error, response, body) {
		if (!error && body && body.indexOf('nauthorized') > -1) {
			cb('not authorized', []);
		}
		if (!error && body)	{

			var resDataBegin = body.indexOf('value');
			resDataBegin = body.indexOf('"', resDataBegin);
			resDataEnd = body.indexOf('"', resDataBegin+1);

			var resolutions = body.substring(resDataBegin + 1, resDataEnd);
			resolutions = resolutions.split(',');

			if (!resolutions) {
				if (cb) cb('no resolutions found', []);
				return;
			} 
			else {
				var re = /(\d+)x(\d+)/
				var output = resolutions.map( function(res) {
					return { value: res, name: res }
				});	
				cb(null, output);
			}
		} else{
			cb(error, []);
		}
	});
};


Axis.prototype.getResolutionOptionsForSingleCamera = function ( cb ) {

	var self = this;
	var url;
		url = listResolutionsUrl
		.replace('{user}', self.cam.user || '')
		.replace('{pass}', self.cam.password || '')
		.replace('{ip}', self.cam.ip);

	var digest = new Buffer(self.cam.user + ":" + self.cam.password).toString('base64');

	request({ 
		url: url,
		headers: {
			'User-Agent': 'nodejs',
			'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
			'Authorization': 'Basic ' + digest			
		},
		timeout: 10000
	}, function( error, response, body) {
		if (!error && body && body.indexOf('nauthorized') > -1) {
			cb('not authorized', []);
			return;
		}
		if (!error && body)	{

			var resDataBegin = body.indexOf('value');
			resDataBegin = body.indexOf('"', resDataBegin);
			resDataEnd = body.indexOf('"', resDataBegin+1);
			
			var resolutions = body.substring(resDataBegin + 1, resDataEnd);
			resolutions = resolutions.split(',');

			if (!resolutions) {
				if (cb) cb('no resolutions found', []);
				return;
			} 
			else {
				var re = /(\d+)x(\d+)/
				var output = resolutions.map( function(res) {
					return { value: res, name: res }
				});	
				cb(null, output);
			}
		} else{
			cb(error, []);
		}
	});
};


Axis.prototype.getFrameRateRange = function () {
	return {min: 1, max: 30};
};

Axis.prototype.getThresholdRange = function () {
	return {min: 2, max: 31};
};

Axis.prototype.getVideoQualityRange = function () {
	return {min: 0, max: 100};
};

Axis.prototype.getSensitivityRange = function () {
	return {min: 0, max: 100};
};


module.exports = Axis;
