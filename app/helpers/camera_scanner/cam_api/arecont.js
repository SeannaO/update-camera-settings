var request = require('request');

var baseUrl = 'http://{user}:{pass}@{ip}';
var rtspUrl = 'rtsp://{user}:{pass}@{ip}/h264.sdp?res={resolution}&fps={framerate}';

function Arecont( cam ){

	if (cam) {
		this.username = cam.username;
		this.password = cam.password;
		this.ip = cam.ip;
	}
}

Arecont.prototype.getRtspUrl = function (profile ) {

	var self = this;

	if (!profile) {
		console.log("[Arecont] ERROR - empty profile");
		return;
	}
	
	// var dimensions = profile.resolution.split('x');
	// var width = dimensions[0];
	// var height = dimensions[1];
	
	var res = '';
	// if (width > 1000 && height > 600) {
		res = 'full';
	// } else {
	// 	res = 'half';
	// }

	return rtspUrl
		.replace('{user}', this.username || '')
		.replace('{pass}', this.password || '')
		.replace('{ip}', this.ip)
		.replace('{resolution}', res)
		.replace('{framerate}', profile.framerate);
};

Arecont.prototype.cameraUrl = function () {
	return baseUrl
		.replace('{user}', this.username || '')
		.replace('{pass}', this.password || '')
		.replace('{ip}', this.ip);
};

Arecont.prototype.getResolutionOptions = function (cb) {
	// Basically just checking to see if the username and password are correct
	this.isMotionEnabled(function(error, enabled){
		if (error){
			cb(error, []);
		}else{
			cb(null, [{value:'full',name:'Full'},{value:'half', name:'Half'}]);
		}
	});
	
};

Arecont.prototype.getFrameRateRange = function () {
	return {min: 1, max: 30};
};

Arecont.prototype.getThresholdRange = function () {
	return {min: 2, max: 31};
};

Arecont.prototype.getVideoQualityRange = function () {
	return {min: 1, max: 21};
};

Arecont.prototype.getSensitivityRange = function () {
	return {min: 0, max: 100};
};


Arecont.prototype.setCameraParams = function(params) {
	
	this.ip = params.ip 							|| this.ip;
	this.username = params.username || params.user 	|| this.username;
	this.password = params.password 				|| this.password;
};

Arecont.prototype.setMotionThreshold = function(threshold, cb){
	var range = this.getThresholdRange();
	if (threshold > range.max && threshold < range.min){
		console.log("Error: threshold is out of range.");
		cb("Error: threshold is out of range.");
	}else{
		this.setParam("mdlevelthreshold", threshold, function(error, body){
			cb(error,body);
		});
	}
}

Arecont.prototype.setMotionSensitivity = function(sensitivity, cb){
	var range = this.getSensitivityRange();
	if (sensitivity > range.max && sensitivity < range.min){
		console.log("Error: sensitivity is out of range.");
		cb("Error: sensitivity is out of range.");
	}else{
		this.setParam("mdsensitivity", sensitivity, function(error, body){
			cb(error,body);
		});
	}
}

Arecont.prototype.setMotionParams = function(params, cb){
	var self = this;
	if (params.enabled === 'undefined'){
		if (params.threshold){
			self.setMotionThreshold(params.threshold,function(error, body){
				if (error){
					cb(error,body);
				}else{
					if (params.sensitivity){
						self.setMotionSensitivity(params.sensitivity,function(error, body){
							if (error){
								cb(error, body);
							}else{
								cb(null, "OK");
							}
						});
					}else{
						cb(null, "OK");
					}
				}
			})
		}else{
			if (params.sensitivity){
				self.setMotionSensitivity(params.sensitivity,function(error, body){
					if (error){
						cb(error, body);
					}else{
						cb(null, "OK");
					}
				});
			}else{
				cb(null, "OK");
			}
		}
	}else{
		self.setParam("motiondetect", (params.enabled ? "on" : "off"), function(error, body){
			if (error){
				cb(error,body);
			}else{
				if (params.threshold){
					self.setMotionThreshold(params.threshold,function(error, body){
						if (error){
							cb(error,body);
						}else{
							if (params.sensitivity){
								self.setMotionSensitivity(params.sensitivity,function(error, body){
									if (error){
										cb(error, body);
									}else{
										cb(null, "OK");
									}
								});
							}else{
								cb(null, "OK");
							}
						}
					})
				}else{
					cb(null, "OK");
				}				
			}

		});
	}
};

Arecont.prototype.getParam = function(name, cb){
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
//				console.log(body.toString());
				// console.log(body);
				var ele = body.toString().split("=");

				value = ele[1];
				// console.log(value);
				cb(error, value);
			}else{
				cb(error, '');
			}
		}
	);	
};

Arecont.prototype.setParam = function(key, value, cb){
	var url = this.cameraUrl() + "/set?" + key + "=" + value + "&id=" + Date.now();
	var digest = new Buffer(this.username + ":" + this.password).toString('base64');
	request({ 
		url: url,
		headers: {
			'User-Agent': 'nodejs',
			'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
			'Authorization': 'Basic ' + digest
		},
	}, function( error, response, body) {
				cb(error, body);
		}
	);
};

Arecont.prototype.getMotionParams = function(cb){
	var self = this;
	self.getParam("mdlevelthreshold",function(error, threshold){
		if (error){
			console.log(error);
			cb(error);
		}
		self.getParam("mdsensitivity",function(error, sensitivity){
			if (error){
				console.log(error);
				cb(error);
			}
			self.isMotionEnabled(function(error, enabled){
				cb({enabled: enabled, threshold: parseInt(threshold), sensitivity: parseInt(sensitivity)})
			});
		});
	});
};

Arecont.prototype.isMotionEnabled = function(cb) {
	this.getParam("motiondetect",function(error, value){
		if (error){
			console.log(error);
			cb(error, false);
		}else{
			cb(null, value == "on" ? true : false);
		}
	});
};

Arecont.prototype.setupMotionDetection = function(){
	setParam("mdzonesize", 2, function(error, body){
		if (error){
			console.log(error);	
		}
	});

	setParam("mddetail", 2, function(error, body){
		if (error){
			console.log(error);	
		}
	});
	setMotionParams({enabled: true});
};

Arecont.prototype.startListeningForMotionDetection = function(cb){
	var self = this;
	
	console.log(self.cameraUrl() + "/get?" + 'mdresult');
	
	self.process_id = setInterval(function(){
		self.getParam('mdresult',function(error, result){
			if (error){
				console.log(error);
				cb(error);
			}else if (result && result !== 'no motion'){
				cb(result);
			}else{
				cb('no motion');
			}
		});
	},100);
};

Arecont.prototype.stopListeningForMotionDetection = function(){
		clearInterval(this.process_id);
};

module.exports = Arecont;
