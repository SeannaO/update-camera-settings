var baseUrl = 'http://{user}:{pass}@{ip}';
var rtspUrl = 'rtsp://{user}:{pass}@{ip}/h264.sdp?res={resolution}&fps={framerate}';

var getRtspUrl = function ( cam, profile ) {
	
	if (!cam || !profile) return;
	
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
		.replace('{user}', cam.user)
		.replace('{pass}', cam.password)
		.replace('{ip}', cam.ip)
		.replace('{resolution}', res)
		.replace('{framerate}', profile.framerate);
};


exports.getRtspUrl = getRtspUrl;

