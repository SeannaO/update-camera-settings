var request = require('request');

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


var Axis = function() {
};


Axis.prototype.checkForExistingProfile = function( profileName, cb ) {

	console.log("[Axis] initializing API...");

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
				updateProfile( self.cam, profileId[0], profile, function(id) {
					cb(id);
				});
			} else {
				cb(-1);
			}
		}
	}
	);
};


Axis.prototype.updateProfile = function(profileId, profile, cb) {

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

	checkForExistingProfile( cam, profile.name, function( profileId ) {
		console.log('[Axis.getRtspUrl] profile id: ' + profileId);
		if (profileId > -1) {
			isProfileH264(cam, profileId, function(isH264) {
				if (!isH264) {
					console.log('[Axis.getRtspUrl] profile is not h264; I will change that');
					updateProfile( cam, profileId, profile, function(id) {
						console.log('[Axis.getRtspUrl] now this profile is h264');
					});
				} 
			});
		} else {
			console.log('[Axis.getRtspUrl] the camera does not have our profile yet. I will create a new one');
			self.createNewProfile( self.cam, profile, function(id) {
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
	
	this.cam.ip = params.ip || this.cam.ip;
	this.cam.user = params.user || params.username || this.cam.user;
	this.cam.password = params.password || this.cam.password;

};


Axis.prototype.setMotionParams = function(params){


};


Axis.prototype.setupMotionDetection = function(cam){
	// start tcp server if not already started
	// on camera
	// enable motion
	// create a recipient
	// create a notifier
};


Axis.prototype.startListeningForMotionDetection = function(cam, cb){
	//poll
	//emit motion
};


Axis.prototype.stopListeningForMotionDetection = function(){
	//poll
	//emit motion
};


module.exports = Axis;





