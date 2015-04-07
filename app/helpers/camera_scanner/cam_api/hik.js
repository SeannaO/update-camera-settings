var request     = require('request');
var xml2js      = require('xml2js').parseString;


var requestXML = 
	'<?xml version:"1.0" encoding="UTF-8"?><StreamingChannel xmlns="urn:psialliance-org" version="1.0">'
	+ '<id>{channel}</id>'
	+ '<channelName>Solink 01</channelName>'
	+ '<enabled>true</enabled>'
	+ ' <Video>'
	+	'<enabled>true</enabled>'
	+	'<videoInputChannelID>1</videoInputChannelID>'
	+	'<videoCodecType>H.264</videoCodecType>'
	+ 	'<videoResolutionWidth>{width}</videoResolutionWidth>'
	+ 	'<videoResolutionHeight>{height}</videoResolutionHeight>'
	+ 	'<videoQualityControlType>vbr</videoQualityControlType>'
	+ 	'<constantBitRate>512</constantBitRate>'
	+ 	'<vbrUpperCap>512</vbrUpperCap>'
	+ 	'<vbrLowerCap>32</vbrLowerCap>'
	+ 	'<fixedQuality>60</fixedQuality>'
	+ 	'<maxFrameRate>{fps}</maxFrameRate>'
	+ 	'</Video>'
	+ 	'</StreamingChannel>';

var configURL = 'http://{username}:{password}@{ip}/PSIA/Streaming/Channels/{channel}';

var rtsp_url = 'rtsp://{username}:{password}@{ip}/Streaming/Channels/{channel}';

var getResolutions = function( ip, username, password, channel, cb ) {

	var url = 'http://' + username + ':' + password + '@' + ip + '/streaming/channels/'+channel+'/capabilities';

	request({
		url: url,
		headers: {
			'User-Agent': 'nodejs'
		}
	}, function(err, res, body) {
			if(err) {
				if (cb) cb(err, []);
				return;
			}
			if(!body) {
				if(cb)	cb('empty response', []);
				return;
			}
			xml2js(body, function(err, data){
				if (body.indexOf('Invalid Operation') >= 0
					|| body.indexOf('Unauthorized') >= 0) {
					if(cb) cb('not authorized', []);
					return;
				}
				var resolutions = [];
				var fpsData = [];
				
				if (!data.StreamingChannel) {
					if(cb) cb('invalid response: no StreamingChannel tag', []);
					return;
				}

				data = data.StreamingChannel;
				if (!data.Video) {
					if(cb) cb('invalid response no Video tag', []);
					return;
				}

				data = data.Video[0];
				if (!data.videoResolutionWidth || !data.videoResolutionWidth[0]) {
					if(cb) cb('invalid response: no videoResolutionWidth tag', []);
					return;
				}

				// fps options
				if (!data.maxFrameRate || !data.maxFrameRate[0]) {
					data.fpsData.push( '1500' );
				}
				else {
					var fpsOpts = data.maxFrameRate[0]['$'];
					if(!fpsOpts || !fpsOpts.opt) {
						data.fpsData.push('1500');
					} else {
						fpsOpts = fpsOpts.opt;
						fpsOpts = fpsOpts.split(',');
						for(var i in fpsOpts) {
							fpsData.push( parseInt( fpsOpts[i] ) );
						}
					}
				}
				// --

				data = data.videoResolutionWidth[0]['$'];
				if (!data || !data.opt) {
					if(cb) cb('invalid response: no opt tag', []);
					return;
				}

				var values = data.opt;
				values = values.split(',');
				for(var i in values) {
					if (!values[i]) continue;
					values[i] = values[i].replace('*', 'x');
					resolutions.push({
						name:   values[i] + ' - ch ' + channel,
						value:  values[i]
					});
				}
				if (cb) cb(null, resolutions, fpsData);
			});
		}
	);
};

var Hik = function() {
	this.password;
	this.username;
	this.ip;

	this.resolution2channel   = {};
	this.fpsOptionsPerChannel = {};
};

Hik.prototype.apiName = function() {
	return 'hik';
};

Hik.prototype.checkForExistingProfile = function( profileName, cb ) {
};


Hik.prototype.isProfileH264 = function( profileId, cb ){

};


Hik.prototype.updateProfile = function(profileId, profile, cb) {

};


Hik.prototype.getRtspUrl = function ( profile, cb ) {
	
	var self = this;

	var resolution = profile.resolution.split('x');

	self.getResolutionOptions( function() {
		var channel = self.resolution2channel[ profile.resolution ];
		var width = resolution[0];
		var height = resolution[1];
		var fps = profile.framerate || 15;

		fps *= 100;

		var minDiff,
			minFps;

		var fpsOpts = self.fpsOptionsPerChannel[channel];

		for (var i in fpsOpts) {
			var diff = Math.abs( fps - fpsOpts[i] );

			if (isNaN(minDiff) || diff < minDiff) {
				minFps  = fpsOpts[i];
				minDiff = diff;
			}
		}

		fps = minFps;

		var url = rtsp_url
			.replace('{ip}', self.ip)
			.replace('{channel}', channel)
			.replace('{username}', self.username)
			.replace('{password}', self.password);

		self.configCamera({
			channel:  channel,
			width:    width,
			height:   height,
			fps:      fps
		}, function(err, body) {
			if(cb) cb(url);
		});
	});
};


Hik.prototype.configCamera = function(params, cb) {

	var xml = requestXML
		.replace('{channel}', 	params.channel)
		.replace('{width}', 	params.width)
		.replace('{height}', 	params.height)
		.replace('{fps}', 		params.fps);

	var url = configURL
		.replace('{username}', 	this.username)
		.replace('{password}', 	this.password)
		.replace('{ip}', 		this.ip)
		.replace('{channel}', 	params.channel);
		
    request({ 
            method: 'PUT', 
			body: xml,
			headers: {
				'Content-Type': "text/xml; charset=utf-8",
			},
			uri: url,
            timeout: 5000
        }, function (error, response, body) {
			if(cb) cb( error, body );
		});
};

Hik.prototype.getResolutionOptions = function(cb) {

	var self = this;

	if (!this.ip) {
		if(cb) cb('no ip');
		return;
	}
	
	var currentResolutions = {};

	var resolutions = [];
	var error; 

	getResolutions(this.ip, this.username, this.password, 1, function(err, res, fpsData) {
		for (var i in res) {
			if (!currentResolutions[res[i].name]) {
				currentResolutions[res[i].name] = true;
				self.resolution2channel[ res[i].value ] = 1;
				resolutions.push( res[i] );
			}

			self.addFpsOptions( 1, fpsData );
		}
		error = error || err;
		getResolutions(self.ip, self.username, self.password, 2, function(err, res, fpsData) {
			for (var i in res) {
				if (!currentResolutions[res[i].name]) {
					currentResolutions[res[i].name] = true;
					self.resolution2channel[ res[i].value ] = 2;
					resolutions.push( res[i] );
				}

			}

			self.addFpsOptions( 2, fpsData );

			error = error || err;
			if( res.length == 0 && error ) {
				cb(error, []);
			} else {
				cb( null, resolutions );
			}
		});
	});

};

Hik.prototype.addFpsOptions = function( channel, fpsData ) {
	var self = this;

	self.fpsOptionsPerChannel[channel] = [];
	for(var i in fpsData) {
		self.fpsOptionsPerChannel[channel].push( fpsData[i] );
	}
};

Hik.prototype.setCameraParams = function(params) {

	this.password = params.password || this.password;
	this.username = params.username || this.username;
	this.ip       = params.ip || this.ip;
};



Hik.prototype.getFrameRateRange = function() {
	return 0;
};

Hik.prototype.getVideoQualityRange = function() {
	return 0;
};

Hik.prototype.setMotionParams = function(params){

};


Hik.prototype.setupMotionDetection = function(cam){
};


Hik.prototype.startListeningForMotionDetection = function(cam, cb){
};


Hik.prototype.stopListeningForMotionDetection = function(){
};


module.exports = Hik;
