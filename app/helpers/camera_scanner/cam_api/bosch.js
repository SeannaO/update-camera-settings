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


var getRtspUrl = function ( cam, profile ) {
	
	if (!cam || !profile) return;
	
	var profile_name = 'new_profile';

	return rtspUrl
		.replace('{user}', cam.user)
		.replace('{pass}', cam.password)
		.replace('{profile_name}', profile_name)
		.replace('{ip}', cam.ip)
		.replace('{resolution}', profile.resolution)
		.replace('{framerate}', profile.framerate);
};

exports.getRtspUrl = getRtspUrl;





