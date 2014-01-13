var scan = require('../helpers/camera_scanner/scanner.js').scan;

module.exports = function( app, passport, prefix ) {
	
	app.get('/scan.json', passport.authenticate('basic', {session: false}), function( req, res ) {
		scan(prefix, function( camlist ) {
			console.log('camera scanner: ');
			console.log( camlist );
			res.json( camlist );
		});
	});

	// - - -
	// checks if stream is h264 encoded
	app.post('/check_h264.json', passport.authenticate('basic', {session: false}), function(req, res) {
		var checkH264 = require('../helpers/ffmpeg.js').checkH264;
		if (req.body.url){
			var url = req.body.url;
			checkH264(url, function(isH264) { 
				res.status(422).json({ success:true, h264: isH264 });
			});
		}else if (req.body.camera && req.body.stream && req.body.camera.manufacturer){
			var api = require('../helpers/camera_scanner/cam_api/api.js').getApi( req.body.camera.manufacturer );
			api.setCameraParams(req.body.camera);
			var url = api.getRtspUrl(req.body.stream);
			checkH264(url, function(isH264) { 
				res.json({ success:true, h264: isH264 });
			});
		}else{
			res.status(422).json({ success:false, error: "Invalid request." });
		}
	});
	// - - -


	// - - -
	// checks if stream is h264 encoded
	app.get('/camera_options.json', passport.authenticate('basic', {session: false}), function(req, res) {

		var camera = req.query.camera;
		if (camera && camera.manufacturer){
			var api = require('../helpers/camera_scanner/cam_api/api.js').getApi( camera.manufacturer );
			api.setCameraParams(camera);
			api.getResolutionOptions(function(err, resolutions){
				if (err) {
					res.status(422).json( { error: err } );
				} else {
					data.success = true;
					res.json({ framerate_range: api.getFrameRateRange(), resolutions: resolutions, quality_range: api.getVideoQualityRange()});
				}
			});
		}

	});
	// - - -


};
