var request     = require('request');
var xml2js      = require('xml2js').parseString;

var rtsp_url = 'http://{username}:{password}@{ip}/Channels/{channel}';

var Hik = function() {
	this.password;
	this.username;
	this.ip;
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


Hik.prototype.getRtspUrl = function ( profile ) {

	return profile.suggested_url;
};


Hik.prototype.getResolutionOptions = function(cb) {

	if (!this.ip) {
		if(cb) cb('no ip');
		return;
	}


	request({
		url: 'http://' + this.username + ':' + this.password + '@' + this.ip + '/streaming/channels/1/capabilities',
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

				data = data.videoResolutionWidth[0]['$'];
				if (!data || !data.opt) {
					if(cb) cb('invalid response: no opt tag', []);
					return;
				}

				var values = data.opt;
				values = values.split(',');
				for(var i in values) {
					resolutions.push({
						name:   values[i],
						value:  values[i]
					});
				}
				console.error(data.opt);
				if (cb) cb(null, resolutions);
			});
		}
	);
};

Hik.prototype.setCameraParams = function(params) {

	this.password = params.password || this.password;
	this.username = params.username || this.username;
	this.ip       = params.ip || this.ip
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
