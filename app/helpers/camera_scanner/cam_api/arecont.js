var request = require('request');

var baseUrl = 'http://{user}:{pass}@{ip}';
var rtspUrl = 'rtsp://{user}:{pass}@{ip}/h264.sdp?res={resolution}&fps={framerate}&qp=32';

function Arecont( cam ){

	if (cam) {
		this.username = cam.username;
		this.password = cam.password;
		this.ip = cam.ip;
	}
}

Arecont.prototype.apiName = function() {
	return 'Arecont';
};

Arecont.prototype.getRtspUrl = function (profile, cb ) {

	var self = this;

	if (!profile) {
		console.error("[Arecont] ERROR - empty profile");
		cb();
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

	var url = rtspUrl
		.replace('{user}', this.username || '')
		.replace('{pass}', this.password || '')
		.replace('{ip}', this.ip)
		.replace('{resolution}', res)
		.replace('{framerate}', profile.framerate);
	if(cb) cb(url);
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
	return {min: 16, max: 36};
};

Arecont.prototype.getSensitivityRange = function () {
	return {min: 0, max: 100};
};


Arecont.prototype.setCameraParams = function(params) {
	
	this.ip = params.ip 							|| this.ip;
	this.username = params.username || params.user 	|| this.username || '';
	this.password = params.password 				|| this.password || '';
};

//
// USING NATIVE MOTION
//
// Arecont.prototype.setMotionThreshold = function(threshold, cb){
// 	var range = this.getThresholdRange();
// 	if (threshold > range.max && threshold < range.min){
// 		cb("Error: threshold is out of range.");
// 	}else{
// 		this.setParam("mdlevelthreshold", threshold, function(error, body){
// 			cb(error,body);
// 		});
// 	}
// }

//
// NATIVE MOTION
//
// Arecont.prototype.setMotionSensitivity = function(sensitivity, cb){
// 	var range = this.getSensitivityRange();
// 	if (sensitivity > range.max && sensitivity < range.min){
// 		cb("Error: sensitivity is out of range.");
// 	}else{
// 		this.setParam("mdsensitivity", sensitivity, function(error, body){
// 			cb(error,body);
// 		});
// 	}
// }

//
// NATIVE MOTION
//
// Arecont.prototype.setMotionParams = function(params, cb){
// 	var self = this;
// 	if (typeof params.enabled == 'undefined'){
// 		if (params.threshold){
// 			self.setMotionThreshold(params.threshold,function(error, body){
// 				if (error){
// 					cb(error,body);
// 				}else{
// 					if (params.sensitivity){
// 						self.setMotionSensitivity(params.sensitivity,function(error, body){
// 							if (error){
// 								cb(error, body);
// 							}else{
// 								cb(null, "OK");
// 							}
// 						});
// 					}else{
// 						cb(null, "OK");
// 					}
// 				}
// 			})
// 		}else{
// 			if (params.sensitivity){
// 				self.setMotionSensitivity(params.sensitivity,function(error, body){
// 					if (error){
// 						cb(error, body);
// 					}else{
// 						cb(null, "OK");
// 					}
// 				});
// 			}else{
// 				cb(null, "OK");
// 			}
// 		}
// 	}else{
// 		self.setParam("motiondetect", (params.enabled ? "on" : "off"), function(error, body){
// 			if (error){
// 				cb(error,body);
// 			}else{
// 				if (params.threshold){
// 					self.setMotionThreshold(params.threshold,function(error, body){
// 						if (error){
// 							cb(error,body);
// 						}else{
// 							if (params.sensitivity){
// 								self.setMotionSensitivity(params.sensitivity,function(error, body){
// 									if (error){
// 										cb(error, body);
// 									}else{
// 										cb(null, "OK");
// 									}
// 								});
// 							}else{
// 								cb(null, "OK");
// 							}
// 						}
// 					})
// 				}else{
// 					cb(null, "OK");
// 				}				
// 			}
//
// 		});
// 	}
// };

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
		timeout: 5000
	}, function( error, response, body) {
			digest = null;	
			if (!error && body) {
				var ele = body.toString().split("=");
				if (ele[1] && ele[1].length > 0){
					cb(error, ele[1]);
				}else{
					cb("[arecont] no content");
				}
			}else{
				cb("[arecont] no content");
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

//
// NATIVE MOTION
//
// Arecont.prototype.getMotionParams = function(cb){
// 	var self = this;
// 	self.getParam("mdlevelthreshold",function(error, threshold){
// 		if (error){
// 			cb(error);
// 		}else{
// 			self.getParam("mdsensitivity",function(error, sensitivity){
// 				if (error){
// 					console.error(error);
// 					cb(error);
// 				}else{
// 					self.isMotionEnabled(function(error, enabled){
// 						cb({enabled: enabled, threshold: parseInt(threshold), sensitivity: parseInt(sensitivity)})
// 					});				
// 				}
// 			});			
// 		}
//
// 	});
// };

//
// NATIVE MOTION
//
Arecont.prototype.isMotionEnabled = function(cb) {
	this.getParam("motiondetect",function(error, value){
		if (error){
			cb(error, false);
		}else{
			cb(null, value == "on" ? true : false);
		}
	});
};
//
// Arecont.prototype.setupMotionDetection = function(){
// 	setParam("mdzonesize", 2, function(error, body){
// 		if (error){
// 			console.error(error);
// 		}
// 	});
//
// 	setParam("mddetail", 2, function(error, body){
// 		if (error){
// 			console.error(error);	
// 		}
// 	});
// 	setMotionParams({enabled: true});
// };
//
// Arecont.prototype.startListeningForMotionDetection = function(cb){	
// 	var self = this;
// 	
// 	clearInterval(self.process_id);
//
// 	self.process_id = setInterval(function(){
// 		self.getParam('mdresult',function(error, result){
// 			if (error){
// 				cb('no motion');
// 			} else if (result && result !== 'no motion'){
// 				var timestamp = Date.now()
// 				var motion_arr = result.trim().split(" ");
// 				var motion_mat = [], i, k;
// 				var motion_sum = 0;
// 				for (i = 0, k=-1; i < motion_arr.length; i++){
// 					if (i % 8 === 0){
// 						k++;
// 						motion_mat[k] = [];
// 					}
// 					var motion_ele = parseInt(motion_arr[i], 16);
// 					motion_mat[k].push(motion_ele);
// 					motion_sum += motion_ele;
// 				}
//
// 				//cb(timestamp, {sum: motion_sum, data:motion_mat});
// 				cb(timestamp, {value: motion_sum});
// 			}else{
// 				cb('no motion');// -- only callback when there's motion
// 			}
// 		});
// 	}, 500);
// };
//
// Arecont.prototype.stopListeningForMotionDetection = function(){
// 		clearInterval(this.process_id);
// };

module.exports = Arecont;
