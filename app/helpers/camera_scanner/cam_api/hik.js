var request = require('request');
var xml2js  = require('xml2js').parseString;
var async   = require('async');


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
	+ 	'<constantBitRate>{bitrate}</constantBitRate>'
	+ 	'<vbrUpperCap>{bitrate}</vbrUpperCap>'
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
		},
		timeout: 10000
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
				var bitrates = {};
				
				if (!data) {
					if(cb) { cb('could not parse response', []); }
					return;
				}

				if (!data.StreamingChannel) {
					if(cb) cb('invalid response: no StreamingChannel tag', []);
					return;
				}

				data = data.StreamingChannel;
				if (!data.Video) {
					if(cb) cb('invalid response no Video tag', []);
					return;
				}

				// resolutions
				data = data.Video[0];
				if (!data.videoResolutionWidth || !data.videoResolutionWidth[0]) {
					if(cb) cb('invalid response: no videoResolutionWidth tag', []);
					return;
				}

				// bitrate range
				if (!data.constantBitRate || !data.constantBitRate[0] || !data.constantBitRate[0]['$']) {
					console.error('[Hik]  no bitrate options found, using default 512');
					bitrates.min = '512';
					bitrate.max  = '512';
				} else {
					bitrates.min = data.constantBitRate[0]['$'].min || '512';
					bitrates.max = data.constantBitRate[0]['$'].max || '512';
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
				if (cb) cb(null, resolutions, fpsData, bitrates);
			});
		}
	);
};

var Hik = function() {
	this.password;
	this.username;
	this.ip;

	this.resolution2channel          = {};
	this.fpsOptionsPerChannel        = {};
	this.bitrateOptionsPerChannel    = {};
	this.resolutionOptionsPerChannel = {};
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


Hik.prototype.getNumberOfChannels = function( cb ) {

    if (!cb || typeof(cb) !== 'function') { cb = function() {}; }

    var url = 'http://' + this.username + ':' + this.password + '@' + this.ip + '/streaming/channels';

    request({
        url: url,
        headers: {
            'User-Agent': 'nodejs'
        },
        timeout: 10000
    }, function(err, res, body) {

        if ( err ) {
            return cb(err);
        } else if ( !body ) {
            return cb('empty response');
        } else if ( 
            body.indexOf('Invalid Operation') >= 0 ||
            body.indexOf('Unauthorized') >= 0 
        ) {
            return cb('not authorized');
        }

        var nChannels = (body.match(/<StreamingChannel /g) || []).length;
        
        cb( null, nChannels );
    });
};


Hik.prototype.getRtspUrl = function ( profile, cb ) {
	
	var self = this;

	// insert dummy resolution to handle empty resolution response during camera setup
	profile.resolution = profile.resolution || '800x600';

	var resolution = profile.resolution.split('x');

	self.getResolutionOptions( function(err) {

		if (err) { 
			console.error('[HIK.getRtspUrl]  error when getting resolutions from camera: ' + err);
		}

		var channel = profile.channel || self.resolution2channel[ profile.resolution ];

		if ( isNaN(channel) ) {
			console.error('[HIK.getRtspUrl]  could not determine a channel, using default 1');
			channel = 1; // default channel
		}

                if (channel < 1 || channel > self.nChannels) {
                    console.error('[HIK.getRtspUrl]  invalid channel: ' + channel + '; using default 1');
                    channel = 1;
                }

		var width   = resolution[0];
		var height  = resolution[1];
		var fps     = profile.framerate || 15;
		var bitrate = profile.bitrate || 512;

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

		if (minFps) { 
			fps = minFps; 
		} else { 
			console.error('[HIK.getRtspUrl]  could not resolve fps, using ' + fps); 
		}

		var url = rtsp_url
			.replace('{ip}', self.ip)
			.replace('{channel}', channel)
			.replace('{username}', self.username)
			.replace('{password}', self.password);

		self.configCamera({
			channel:  channel,
			width:    width,
			height:   height,
			bitrate:  bitrate,
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
		.replace(/{bitrate}/g, 	params.bitrate)
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

	var resolutions = [],
            bitrates;

	var error; 

        this.getNumberOfChannels( function( err, nChannels ) {

            if (err) {
                return cb(err, []);
            }

            if (nChannels == 0) {
                return cb('0 channels');
            }

            self.nChannels = nChannels;

            async.parallel([

                function(callback) {

                    getResolutions(self.ip, self.username, self.password, 1, function(err, res, fpsData, bps) {

                        for (var i in res) {
                            if (!currentResolutions[res[i].name]) {
                                currentResolutions[res[i].name] = true;
                                self.resolution2channel[ res[i].value ] = 1;
                                resolutions.push( res[i] );
                            }

                            self.addFpsOptions( 1, fpsData );
                            self.addBitrateOptions( 1, bps );
                            self.addResolutionOptions( 1, res );
                        }

                        bitrates = bps; // TODO: merge
                        callback(err);
                    });
                },

                function(callback) {

                    getResolutions(self.ip, self.username, self.password, 2, function(err, res, fpsData, bps) {

                        for (var i in res) {
                            if (!currentResolutions[res[i].name]) {
                                currentResolutions[res[i].name] = true;
                                self.resolution2channel[ res[i].value ] = 2;
                                resolutions.push( res[i] );
                            }
                        }

                        self.addFpsOptions( 2, fpsData );
                        self.addBitrateOptions( 2, bps );
                        self.addResolutionOptions( 2, res );
                        
                        bitrates = bps; // TODO: merge
                        callback(err);
                    });
                }
            ], 

            function( err ) {

                    if( err ) {
                        cb(error, []);
                    } else {
                        cb( null, resolutions, bitrates, {
                            nChannels:              self.nChannels,
                            resolutionsPerChannel:  self.resolutionOptionsPerChannel,
                            frameratePerChannel:    self.fpsOptionsPerChannel,
                            bitratesPerChannel:     self.bitrateOptionsPerChannel
                        });
                    }
                }
            );
        });
};


Hik.prototype.addResolutionOptions = function( channel, resolutionData ) {
    var self = this;

    self.resolutionOptionsPerChannel[channel] = [];
    for(var i in resolutionData) {
        self.resolutionOptionsPerChannel[channel].push( resolutionData[i] );
    }
};

Hik.prototype.addFpsOptions = function( channel, fpsData ) {
	var self = this;

	self.fpsOptionsPerChannel[channel] = [];
	for(var i in fpsData) {
		self.fpsOptionsPerChannel[channel].push( fpsData[i] );
	}
};


Hik.prototype.addBitrateOptions = function( channel, bitrateData ) {
	if (!bitrateData) { return; }

	this.bitrateOptionsPerChannel[channel] = {
		min:  bitrateData.min,
		max:  bitrateData.max
	};
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
