var request = require('request');
var xml2js = require('xml2js').parseString;
var net = require('net');

var baseUrl = 'http://{user}:{pass}@{ip}/axis-cgi/param.cgi?action=';
var createProfileUrl = baseUrl + 'add&template=streamprofile&group=StreamProfile';
var configureStreamUrl = baseUrl 
+ 'update&StreamProfile.{temp_profile}.Name={name}'
+ '&StreamProfile.{temp_profile}.Description={description}' 
+ '&StreamProfile.{temp_profile}.Parameters={parameters}';
var parametersString = "videocodec=h264&framerate={framerate}&resolution={resolution}";
var rtspUrl = 'rtsp://{user}:{pass}@{ip}/axis-media/media.amp?{profile_name}&framerate={framerate}&resolution={resolution}';
var listParamsUrl = baseUrl + 'list&group={group_name}';
var listAllParamsUrl = baseUrl + 'list';
var listResolutionsUrl = baseUrl + "listdefinitions%20&listformat=xmlschema&group=ImageSource.I0.Sensor.CaptureMode"

var Axis = function() {
	console.log("[Axis] initializing API...");	
	
	this.cam = {};
};

Axis.server = net.createServer(function(c) { 
});
Axis.server.listen(8000, function() { 
});


Axis.prototype.checkForExistingProfile = function( profileName, cb ) {

	var self = this;

	var listUrl = baseUrl
		.replace('{user}', self.cam.user)
		.replace('{pass}', self.cam.password)
		.replace('{ip}', self.cam.ip) + 
		'list';

	console.log(listUrl);

	request({ 
		url: listUrl,
		headers: {
			'User-Agent': 'nodejs'
		},
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

	console.log( url );

	request({ 
		url: url,
		headers: {
			'User-Agent': 'nodejs'
		},
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

	cb({
		enabled: self.isMotionEnabled(), 
		threshold: self.threshold, 
		sensitivity: self.sensitivity
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
		.replace('{framerate}', profile.framerate)
		.replace('{resolution}', profile.resolution);

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
		}
	}, function( error, response, body) {
		console.log( body );
		if (!error) {
			cb( profileId );
		} else {
			cb(-1);
		}
	}
	);
};




Axis.prototype.getRtspUrl = function ( profile ) {

	var self = this;

	if ( !profile ) {
		console.log('[Axis.getRtspUrl] ERROR - empty profile');
		return;
	}

	profile.name = 'solink';

	console.log('[Axis.getRtspUrl] checking for existing profiles');

	self.checkForExistingProfile( profile.name, function( profileId ) {
		console.log('[Axis.getRtspUrl] profile id: ' + profileId);
		if (profileId > -1) {
			self.isProfileH264(profileId, function(isH264) {
				if (!isH264) {
					console.log('[Axis.getRtspUrl] profile is not h264; I will change that');
					self.updateProfile( profileId, profile, function(id) {
						console.log('[Axis.getRtspUrl] now this profile is h264');
					});
				} 
			});
		} else {
			console.log('[Axis.getRtspUrl] the camera does not have our profile yet. I will create a new one');
			self.createNewProfile( profile, function(id) {
				console.log('[Axis.getRtspUrl] new profile created');
			});
		}
	});

	return rtspUrl
		.replace('{user}', self.cam.user)
		.replace('{pass}', self.cam.password)
		.replace('{profile_name}', profile.name)
		.replace('{ip}', self.cam.ip)
		.replace('{resolution}', profile.resolution)
		.replace('{framerate}', profile.framerate);
};


Axis.prototype.setCameraParams = function(params) {
	
	console.log("[Axis] Updating camera params");
	console.log( params );
	this.cam.ip = params.ip || this.cam.ip;
	this.cam.user = params.user || params.username || this.cam.user;
	this.cam.password = params.password || this.cam.password;

};


Axis.prototype.setMotionParams = function(params, cb){

	var self = this;

	self.threshold = params.threshold || 50;
	self.sensitivity = params.sensitivity || 50;

	if (cb) cb();

};


Axis.prototype.setupMotionDetection = function(cam, cb){
	// start tcp server if not already started
	// on camera
	// enable motion
	// create a recipient
	// create a notifier
	if (cb) cb();
};


Axis.prototype.startListeningForMotionDetection = function(cb){
	
	
	var self = this;
	
	self.motion_enabled = true;

	//poll
	//emit motion
	Axis.server.on('connection', function( socket ) {
		if ( socket.remoteAddress === self.cam.ip ) {
			// console.log('[Axis.motionDetection] movement detected');
			if(cb) cb() ;
		}
	});	
};


Axis.prototype.stopListeningForMotionDetection = function(){
	//poll
	//emit motion
	// clear events
	//
	self.motion_enabled = false;
};



Axis.prototype.getResolutionOptions = function (cb) {
	var self = this;
	var url = listResolutionsUrl
		.replace('{user}', self.cam.user)
		.replace('{pass}', self.cam.password)
		.replace('{ip}', self.cam.ip);
	console.log(url);
	var digest = new Buffer(self.cam.user + ":" + self.cam.password).toString('base64');
	request({ 
		url: url,
		headers: {
			'User-Agent': 'nodejs',
			'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
			'Authorization': 'Basic ' + digest			
		},
	}, function( error, response, body) {
		console.log(body);
		if (!error && body){
			xml2js(body, function(err,result){
				console.log(result.parameterDefinitions.group[0].group[0].group[0].parameter[0].type[0].enum[0].entry);
				var output = result.parameterDefinitions.group[0].group[0].group[0].parameter[0].type[0].enum[0].entry.map(function(element){
					console.log({value:element['$'].value, name:element['$'].niceValue});
					return {value:element['$'].value, name:element['$'].niceValue}
				});
				cb(output);
			});
		}else{
			cb(null);
		}
	}
	);
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





