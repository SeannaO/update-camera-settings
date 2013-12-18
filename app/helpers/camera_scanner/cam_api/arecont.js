var request = require('request');

var baseUrl = 'http://{user}:{pass}@{ip}';
var rtspUrl = 'rtsp://{user}:{pass}@{ip}/h264.sdp?res={resolution}&fps={framerate}';

function Arecont( cam ){
	this.username = cam.username;
	this.password = cam.password;
	this.ip = cam.ip;
};

Arecont.prototype.getRtspUrl = function (profile ) {
	
	if (!profile) return;
	
	var dimensions = profile.resolution.split('x');
	var width = dimensions[0];
	var height = dimensions[1];
	
	var res = '';
	if (width > 1000 && height > 600) {
		res = 'full';
	} else {
		res = 'half';
	}

	return rtspUrl
		.replace('{user}', this.username)
		.replace('{pass}', this.password)
		.replace('{ip}', this.ip)
		.replace('{resolution}', res)
		.replace('{framerate}', profile.framerate);
};

Arecont.prototype.cameraUrl = function () {
	return baseUrl
		.replace('{user}', this.username)
		.replace('{pass}', this.password)
		.replace('{ip}', this.ip);
};

Arecont.prototype.setMotionParams = function(params){
	var urlParams= [];
	if (params.enabled){
		urlParams.push("motiondetect=" + (params.enabled ? "on" : "off") );
	}
	if (params.threshold){
		urlParams.push("mdlevelthreshold=" + params.threshold );
	}
	if (params.sensitivity){
		urlParams.push("mdsensitivity=" + params.sensitivity );
	}

	var url = this.cameraUrl() + "/get?" + urlParams.join("&");
	request({ 
		url: url,
		headers: {
			'User-Agent': 'nodejs'
		},
	}, function( error, response, body) {
			if (!error && body) {

			}else{

			}
		}
	);
};

Arecont.prototype.getParam = function(name){
	var value = "";
	var self = this;
	var digest = new Buffer(this.username + ":" + this.password).toString('base64');
	request({ 
		url: self.cameraUrl() + "/get?" + name + "&id=" + Date.now(),
		headers: {
			'User-Agent': 'nodejs',
			'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
			'Authorization': 'Basic ' + digest
		},
	}, function( error, response, body) {
		
			if (!error && body) {
				var ele = body.toString().split("=");
				value = ele[1];
				return value;
			}else{

			}
		}
	);
	
};

Arecont.prototype.getMotionParams = function(){

	return {
		enabled: this.isMotionEnabled(),
		threshold: parseInt(this.getParam("mdlevelthreshold")), 
		sensitivity: parseInt(this.getParam("mdsensitivity"))};
};

Arecont.prototype.isMotionEnabled = function(){
	return this.getParam("motiondetect") == "on" ? true : false
};

Arecont.prototype.setupMotionDetection = function(){
	if (!isMotionEnabled()){
		setMotionParams({enabled: true})
	}

};

Arecont.prototype.startListeningForMotionDetection = function(cb){
	var self = this;
	console.log(self.cameraUrl() + "/get?" + 'mdresult');
	self.process_id = setInterval(function(){
		result = self.getParam('mdresult');
		if (result !== 'no motion'){
			cb();
		}
	},100);
};

Arecont.prototype.stopListeningForMotionDetection = function(){
		clearInterval(this.process_id);
};


// exports.getRtspUrl = getRtspUrl;

module.exports = Arecont;