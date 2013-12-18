var baseUrl = 'http://{user}:{pass}@{ip}';
var rtspUrl = 'rtsp://{user}:{pass}@{ip}/h264.sdp?res={resolution}&fps={framerate}';


function Arecont() {
	console.log("[Arecont] initializing API...");
	this.cam = {};
}

Arecont.prototype.getRtspUrl = function ( profile ) {
	
	var self = this;

	if (!profile) {
		console.log("[Arecont] ERROR - empty profile");
		return;
	}
	
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
		.replace('{user}', self.cam.user)
		.replace('{pass}', self.cam.password)
		.replace('{ip}', self.cam.ip)
		.replace('{resolution}', res)
		.replace('{framerate}', profile.framerate);
};


Arecont.prototype.setCameraParams = function(params) {
	
	this.cam.ip = params.ip || this.cam.ip;
	this.cam.user = params.user || params.username || this.cam.user;
	this.cam.password = params.password || this.cam.password;

};

Arecont.prototype.setMotionParams = function(params){
	// "/set?motiondetect=on"
};

Arecont.prototype.getMotionParams = function(){
	
};

Arecont.prototype.isMotionEnabled = function(){

};

Arecont.prototype.setupMotionDetection = function(cam){
	// check 
	// enable motion detection

};

Arecont.prototype.startListeningForMotionDetection = function(cam, cb){
	//poll
		//emit motion
};

Arecont.prototype.stopListeningForMotionDetection = function(){
	//poll
		//emit motion
};


module.exports = Arecont;

