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


var checkForExistingProfile = function( cam, profileName, cb ) {
	
	var listUrl = baseUrl
		.replace('{user}', cam.user)
		.replace('{pass}', cam.password)
		.replace('{ip}', cam.ip) + 
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


var isProfileH264 = function( cam, profileId, cb ){
	
	if (profileId.indexOf('S') === -1) profileId = 'S' + profileId;

	var url = listParamsUrl
		.replace('{user}', cam.user)
		.replace('{pass}', cam.password)
		.replace('{ip}', cam.ip)
		.replace('{group_name}', 'StreamProfile.'+profileId);

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


var createNewProfile = function( cam, profile, cb ) {
	
	var url = createProfileUrl
		.replace('{user}', cam.user)
		.replace('{pass}', cam.password)
		.replace('{ip}', cam.ip);

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
					updateProfile( cam, profileId[0], profile, function(id) {
						cb(id);
					});
				} else {
					cb(-1);
				}
			}
		}
	);
};


var updateProfile = function(cam, profileId, profile, cb) {

	var id = parseInt( profileId.substr(1,profileId.length) );

	if (profileId.indexOf('S') === -1) profileId = 'S' + profileId;

	if (id > 7) {
		profileId = 'S7';
	}

	var params = parametersString
		.replace('{framerate}', profile.framerate)
		.replace('{resolution}', profile.resolution);

	params = encodeURIComponent( params );
	
	var url = configureStreamUrl
		.replace(/{user}/, cam.user)
		.replace(/{pass}/, cam.password)
		.replace(/{ip}/, cam.ip)
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


var getRtspUrl = function ( cam, profile ) {
	
	if (!cam || !profile) return;
	
	profile.name = 'solink';

	console.log('checking for existing profiles');

	checkForExistingProfile( cam, profile.name, function( profileId ) {
		console.log('profile id: ' + profileId);
		if (profileId > -1) {
			isProfileH264(cam, profileId, function(isH264) {
				if (!isH264) {
					console.log('profile is not h264; I will change that');
					updateProfile( cam, profileId, profile, function(id) {
						console.log('now this profile is h264');
					});
				} 
			});
		} else {
			console.log('the camera does not have our profile yet. I will create a new one');
			createNewProfile( cam, profile, function(id) {
				console.log('new profile created');
			});
		}
	});

	return rtspUrl
		.replace('{user}', cam.user)
		.replace('{pass}', cam.password)
		.replace('{profile_name}', profile.name)
		.replace('{ip}', cam.ip)
		.replace('{resolution}', profile.resolution)
		.replace('{framerate}', profile.framerate);
};

exports.getRtspUrl = getRtspUrl;





