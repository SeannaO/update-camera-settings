var scan = require('../helpers/camera_scanner/scanner.js').scan;

module.exports = function( app, socket, passport) {
	
	app.get('/scan.json', passport.authenticate('basic', {session: false}), function( req, res ) {
		var prefix = req.query.subnet;
		if(!prefix) res.json([]);
		scan(prefix, function( camlist ) {
			if (camlist == 'busy') {
				console.error('[scanner api] scanner is busy');
				res.end('busy');
				return;
			}
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
				res.json({ success:true, h264: isH264 });
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

		if (camera && camera.manufacturer) {
			var api = require('../helpers/camera_scanner/cam_api/api.js').getApi( camera.manufacturer );
			if (!api) {
				console.error('no api found');
				res.status(422).json({error: 'no api found'});
				return;
			}
			api.setCameraParams(camera);
			api.getResolutionOptions(function(err, resolutions){
				if (err) {
					console.error("*** getResolutionOptions for " + camera.manufacturer + ": ");
					console.error( err ) ;
					console.error("* * *");
					res.status(422).json( { error: err } );
				} else {
					res.json({ framerate_range: api.getFrameRateRange(), resolutions: resolutions, quality_range: api.getVideoQualityRange()});
				}
			});
		}else{
			res.status(422).json( { error: "invalid request" } );
		}

	});
	// - - -

};
