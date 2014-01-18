var path = require('path');												// for parsing path urls
var fs = require('fs');													// for sending files
var hlsHandler = require('../controllers/hls_controller.js');

module.exports = function( app, passport, camerasController ) {


	// - - -
	// gets json list of cameras
	app.get('/cameras.json', passport.authenticate('basic', {session: false}), function(req, res) {

		camerasController.listCameras( function(err, list) {
			list.map(function(item) {
				return [item.toJSON()];
			});

			if (err) {
				res.status(422).end("{ 'error': '" + JSON.stringify(err) + "'}");
			} else {
				res.json(list);
			}
		});
	});
	// - - -

	// - - -
	// returns camera info (json)
	app.get('/cameras/:id/json', passport.authenticate('basic', {session: false}), function(req, res) {
		var camId = req.params.id;

		camerasController.getCamera( camId, function(err, cam) {
			if (err || !cam || cam.length === 0) {
				res.status(422).json({ success: false, error: err });
			} else {
				res.json({ success: true, camera: cam.toJSON() });
			}
		});
	});
	// - - 
	//

	// - - -
	// update camera
	app.put('/cameras/:id', passport.authenticate('basic', {session: false}), function(req, res) {
		var cam = req.body;
		cam._id = req.params.id;

		camerasController.updateCamera( cam, function(err) {
			if (err) {
				console.error("*** updateCamera error: ");
				console.error( err );
				console.error("* * *");
				res.status(422).json({success: false, error: err});
			} else {
				res.json({success: true});
			}
		});
	});
	// end of update camera
	// - - 


	// - - -
	// posts new camera
	app.post('/cameras/new', passport.authenticate('basic', {session: false}), function(req, res) {

		var params = req.body;

		camerasController.insertNewCamera( params, function( err, cam ) {
			if (err) {
				res.status(422).json({ success: false, error: err  });
			} else {
				res.json({success:true, camera: cam.toJSON() });
			}
		});
	});
	// end of post new camera
	// - - -


	app.put('/cameras/:id/schedule', passport.authenticate('basic', {session: false}), function(req, res) {
		var params = req.body;
		params._id = req.params.id;
		params.schedule_enabled	= (params.schedule_enabled || '1') === '1';
		camerasController.updateCameraSchedule(params, function(err) {
			if (err) {
				console.error("*** updateCameraSchedule error: ");
				console.error( err ) ;
				console.error("* * *");
				res.status(422).json({success: false, error: err});
			} else {
				res.json({success: true});
			}
		});
	});

	app.put('/cameras/:id/motion', passport.authenticate('basic', {session: false}), function(req, res) {
		var params = req.body;
		params._id = req.params.id;
		camerasController.updateCameraMotion(params, function(err) {
			if (err) {
				console.error("*** updateCameraMotion error: ");
				console.error( err ) ;
				console.error("* * *");
				res.status(422).json({success: false, error: err});
			} else {
				res.json({success: true});
			}
		});
	});

	// - - -
	// delete camera
	// TODO: delete camera on lifeline app
	app.delete('/cameras/:id', passport.authenticate('basic', {session: false}), function(req, res) {

		var cam = camerasController.findCameraById( req.params.id ).cam;

		camerasController.removeCamera( req.params.id, function( err, numRemoved ) {
			if (err) {
				console.error("*** removeCamera error: ");
				console.error( err ) ;
				console.error("* * *");
				res.status(422).json({success: false, error: err});
			} else if (cam) {
				res.json({success: true, _id: req.params.id});
			}
		});

	});
	// end of delete camera
	// - - -

	// - - -
	// delete stream
	app.delete('/cameras/:camera_id/streams/:stream_id', passport.authenticate('basic', {session: false}), function(req, res) {

		var camId = req.params.camera_id;
		var streamId = req.params.stream_id;

		var cam = camerasController.findCameraById( camId ).cam;
		if (!cam) {
			console.error("*** DELETE Stream: camera " + camId + " not found: ");
			res.json({success: false, error: 'camera not found'});
			return;
		} 

		var stream = cam.streams[ streamId ];
		if (!stream) {
			console.error("*** DELETE Stream: stream " + streamId + " not found: ");
			res.json({success: false, error: 'stream not found'});
			return;
		}

		camerasController.removeStream( camId, streamId, function( err ) {
			if (err) {
				console.error("*** removeStream error: ");
				console.error( err ) ;
				console.error("* * *");
				res.json({success: false, error: err});
			} else if (cam) {
				res.json({success: true, _id: req.params.id});
			}
		});
	});
	// end of delete camera
	// - - -

	
	// - - 
	// 
	app.get('/cameras/:id/schedule.json', passport.authenticate('basic', {session: false}), function(req, res) {
		var camId = req.params.id;

		camerasController.getCamera( camId, function(err, cam) {
			if (err || !cam || cam.length === 0) {
				console.error("*** getCamera within GET Schedule error: ");
				console.error( err ) ;
				console.error("* * *");				
				res.status(422).json({ success: false, error: err });
			} else {
				res.json({ success: true, schedule_enabled: cam.schedule_enabled, schedule: cam.schedule.toJSON() });
			}
		});
	});
	// - - -

	
	// - - 
	// 
	app.get('/cameras/:id/motion.json', passport.authenticate('basic', {session: false}), function(req, res) {
		var camId = req.params.id;
		camerasController.getMotion( camId, function(err, motion_params) {
			if (err || !motion_params || motion_params.length === 0) {
				console.error("*** getMotion error: ");
				console.error( err ) ;
				console.error("* * *");
				res.status(422).json({ success: false, error: err });
			} else {
				res.json({ success: true, camera: {motion: motion_params}});
			}
		});
	});
	// - - -



	// - - -
	// renders camera page
	app.get('/cameras/:id', passport.authenticate('basic', {session: false}), function(req, res) {

		var camId = req.params.id;

		camerasController.getCamera( camId, function(err, cam) {
			if (err || cam.length === 0) {
				console.error("*** getCamera error: ");
				console.error( err ) ;
				console.error("* * *");
				res.status(422).end({success:false, error: "couldn't find this camera"});
			} else {
				res.render('camera', cam.toJSON());
			}
		});
	});
	// end of camera page
	// - - -



	// - - -
	// lists all profiles
	app.get('/cameras/:id/streams', passport.authenticate('basic', {session: false}), function(req, res) {
		var camId = req.params.id;
		res.end( camerasController.getStreamsJSON() );
	});
	// - - -

	// - - -
	// lists all videos
	app.get('/cameras/:cam_id/streams/:id/list_videos', passport.authenticate('basic', {session: false}), function(req, res) {
		var camId = req.params.cam_id;
		var streamId = req.params.id;

		camerasController.listVideosByCamera( camId, streamId, req.query.start, req.query.end, function(err, fileList, offset) {
			if (err) {
				console.error("*** listVideosByCamera error: ");
				console.error( err ) ;
				console.error("* * *");
				res.status(422).json({error: err, success: false});
			} else {
				res.json({success: true, offset: offset, videos: fileList});
			}
		});
	});
	// - - -


	// - - -
	// gets most recent thumb
	app.get('/cameras/:cam_id/streams/:id/thumb.json', passport.authenticate('basic', {session: false}), function(req, res) {

		var camId = req.params.cam_id;
		var streamId = req.params.id;
		
		camerasController.getCamera( camId, function(err, cam) {
			if (err) {
				console.error("*** getCamera within stream thumbnail error: ");
				console.error( err ) ;
				console.error("* * *");
				res.status(422).json( { error: err } );
			} else {
				
				var stream = cam.streams[streamId];
				
				if (stream) {
					if (stream.latestThumb) {
						res.json({
							img: stream.latestThumb
						});
					} else {
						console.error("*** StreamThumbnail: this stream does not have any thumbnail yet");
						res.status(422).json({
							error: 'this stream does not have any thumbnail yet'
						});
					}
				} else {
					console.error("*** StreamThumbnail: invalid stream id " + streamId);
					res.status(422).json({
						error: 'invalid stream id ' + streamId
					});
				}
			}
		});
	});
	// - - -
	
	

	// - - -
	// gets thumbnail
	app.get('/cameras/:cam_id/streams/:id/thumb/:thumb', passport.authenticate('basic', {session: false}), function(req, res) {

		var camId = req.params.cam_id;
		var streamId = req.params.id;
		var thumb = req.params.thumb;
		thumb = path.basename(thumb);

		camerasController.getCamera( camId, function(err, cam) {
			if (err) {
				console.error("*** getCamera within stream thumbnail " + thumb + ": ");
				console.error( err ) ;
				console.error("* * *");
				res.status(422).json( { error: err } );
			} else {

				var file = cam.videosFolder + "/" + streamId + "/thumbs/"+thumb+".jpg";

				fs.exists( file, function(exists) {
					if (exists) { 
						res.setHeader("Content-Type", "image/jpeg"); 
						res.sendfile(file);
					} else {
						res.end("no thumb " + thumb);
					}
				}); 
			}
		});
	});
	// - - -


	// - - -
	// requests snapshot, returns jpeg
	app.get('/cameras/:id/snapshot', passport.authenticate('basic', {session: false}), function(req, res) {

		var camId = req.params.id;
		
		camerasController.requestSnapshot( camId, req, res );
	});
	// - - -



	// - - -
	// gets mp4 video
	app.get('/cameras/:id/video', passport.authenticate('basic', {session: false}), function(req, res) {

		var camId = req.params.id;
		var begin = parseInt( req.query.begin, 10 );
		var end = parseInt( req.query.end, 10 );
		var stream = req.query.stream;

		camerasController.getCamera( camId, function(err, cam) {
			
			if (err) {
				console.error("*** getCamera within mp4 video: ");
				console.error( err ) ;
				console.error("* * *");
				res.status(422).json( { error: err } );
			} else {

				// in case the streamId is invalid or not specified
				if (!cam.streams[stream]) {
					console.error("*** stream " + stream + " on camera " + camId + " not found");
					for (var s in cam.streams){
						stream = s;
						break;
					}
				}
				
				camerasController.mp4Handler.generateMp4Video( cam.streams[stream].db, cam, stream, begin, end, function( response ) {
					if(response.success) {
						camerasController.mp4Handler.sendMp4Video( response.file, req, res );
					} else {
						res.end( response.error );
					}
				});
			}
		});
	});
	// - - -

	// - - -
	// requests mp4video, returns json when ready
	app.get('/cameras/:id/video.json', passport.authenticate('basic', {session: false}), function(req, res) {

		var camId = req.params.id;
		var begin = parseInt( req.query.begin, 10 );
		var end = parseInt( req.query.end, 10 );
		var stream = req.query.stream;

		camerasController.getCamera( camId, function(err, cam) {
			if (err) {
				console.error("*** getCamera within mp4 video: ");
				console.error( err ) ;
				console.error("* * *");
				res.status(422).json( { error: err } );
			} else {
				
				//for (var stream in cam.streams){
				// in case the streamId is invalid or not specified
				if (!cam.streams[stream]) {
					console.error("[cameras.js : /video.json] no such stream ");
					for (var s in cam.streams){
						stream = s;
						break;
					}
				}

				camerasController.mp4Handler.generateMp4Video( cam.streams[stream].db, cam, stream, begin, end, function( response ) {
					res.json( response );
				});
			}
		});
	});
	// - - -

	// - - -
	// gets inMem mp4 video
	app.get('/cameras/:id/download', passport.authenticate('basic', {session: false}), function(req, res) {
		//	res.end('feature under construction');

		var camId = req.params.id;
		var begin = parseInt( req.query.begin, 10 );
		var end = parseInt( req.query.end, 10 );
		var stream = req.query.stream;

		camerasController.getCamera( camId, function(err, cam) {
			if (err) {
				console.error("*** getCamera within mp4 inMem download: ");
				console.error( err ) ;
				console.error("* * *");		
				res.json( { error: err } );
			} else {

				// in case the streamId is invalid or not specified
				if (!cam.streams[stream]) {
					console.error("[/cameras/:id/download] no such stream ");
					for (var s in cam.streams){
						stream = s;
						break;
					}
				}

				for (var stream in cam.streams){
					camerasController.mp4Handler.inMemoryMp4Video( cam.streams[stream].db, cam, begin, end, req, res );
					break;
				}
			}
		});

	});
	// - - -

	// - - -
	// gets hls stream for finite length video
	app.get('/cameras/:id/video.m3u8', passport.authenticate('basic', {session: false}), function(req, res) {

		var camId = req.params.id;
		var begin = parseInt( req.query.begin, 10 );
		var end = parseInt( req.query.end, 10 );
		var streamId = req.query.stream;

		camerasController.getCamera( camId, function(err, cam) {
			if (err) {
				console.error("*** getCamera within video.m3u8: ");
				console.error( err ) ;
				console.error("* * *");
				res.json( { error: err } );
			} else {

				//for (var stream in cam.streams){
				// in case the streamId is invalid or not specified
				if (!cam.streams[streamId]) {
					for (var s in cam.streams){
						streamId = s;
						break;
					}
				}


				hlsHandler.generateFinitePlaylist( cam.streams[streamId].db, camId, streamId, begin, end, function( playlist ) {

					res.writeHead(200, { 
						"Content-Type":"application/x-mpegURL",
						'content-length': playlist.length 
					});

					res.end(playlist);    
				});
			}
			});
		});
	// - - -


	
};



