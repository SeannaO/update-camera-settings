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
				res.end("{ 'error': '" + JSON.stringify(err) + "'}");
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
				res.json({ success: false, error: err });
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
				console.log("*** updateCamera error: ");
				console.log( err );
				console.log("* * *");
				res.json({success: false, error: err});
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

		camerasController.insertNewCamera( req.body, function( err, newDoc ) {
			if (err) {
				res.json({ sucess: false, error: err  });
			} else {
				res.json( newDoc );
			}
		});
	});
	// end of post new camera
	// - - -


	app.put('/cameras/:id/schedule', passport.authenticate('basic', {session: false}), function(req, res) {
		var params = req.body;
		params._id = req.params.id;
		camerasController.updateCameraSchedule(params, function(err) {
			if (err) {
				console.log( err ) ;
				res.json({success: false, error: err});
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
				console.log( err ) ;
				res.json({success: false, error: err});
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
				res.json({ success: false, error: err });
			} else {
				console.log(cam);
				res.json({ success: true, schedule_enabled: cam.schedule_enabled, schedule: cam.schedule.toJSON() });
			}
		});
	});
	// - - -

	
	// - - 
	// 
	app.get('/cameras/:id/motion.json', passport.authenticate('basic', {session: false}), function(req, res) {
		var camId = req.params.id;
		console.log(camId);
		camerasController.getMotion( camId, function(err, motion_params) {
			if (err || !motion_params || motion_params.length === 0) {
				res.json({ success: false, error: err });
			} else {
				console.log(motion_params);
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
				res.end("couldn't find this camera");
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
				res.json({error: err, success: false});
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
				res.json( { error: err } );
			} else {
				
				var stream = cam.streams[streamId];
				
				if (stream) {
					if (stream.latestThumb) {
						res.json({
							img: stream.latestThumb
						});
					} else {
						res.json({
							error: 'this stream does not have any thumbnail yet'
						});
					}
				} else {
					res.json({
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
				res.json( { error: err } );
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
	// gets camera configurations
	app.get('/cameras/:id/configuration', passport.authenticate('basic', {session: false}), function(req, res) {
		var camera = req.query.camera;
		camera._id = req.params.id;
		camerasController.getCameraOptions( camera, function(err, data) {
			if (err) {
				res.json( { error: err } );
			} else {
				data.success = true;
				res.json(data);
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
				res.json( { error: err } );
			} else {

				// in case the streamId is invalid or not specified
				if (!cam.streams[stream]) {
					console.log("########## no such stream ");
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
				res.json( { error: err } );
			} else {
				
				//for (var stream in cam.streams){
				// in case the streamId is invalid or not specified
				if (!cam.streams[stream]) {
					console.log("########## no such stream ");
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
	app.get('/cameras/:id/memvideo', passport.authenticate('basic', {session: false}), function(req, res) {
		//	res.end('feature under construction');

		var camId = req.params.id;
		var begin = parseInt( req.query.begin, 10 );
		var end = parseInt( req.query.end, 10 );

		camerasController.getCamera( camId, function(err, cam) {
			if (err) {
				res.json( { error: err } );
			} else {
				for (var stream in cam.streams){
					console.log(cam.streams[stream].db);
					camerasController.mp4Handler.inMemoryMp4Video( cam.streams[stream].db, cam, begin, end, req, res );
					break;
				}
			}
		});

	});
	// - - -

	// - - -
	// starts recording
	// TODO: should be only via post
	app.get('/cameras/:id/start_recording', passport.authenticate('basic', {session: false}), function(req, res) {
		startRecording(req, res);
	});
	app.post('/cameras/:id/start_recording', passport.authenticate('basic', {session: false}), function(req, res) {
		startRecording(req, res);
	});
	// - - -
	//

	// - - -
	// stops recording
	// TODO: should be only via post
	app.post('/cameras/:id/stop_recording', passport.authenticate('basic', {session: false}), function(req, res) {
		stopRecording( req, res );
	});
	app.get('/cameras/:id/stop_recording', passport.authenticate('basic', {session: false}), function(req, res) {
		stopRecording( req, res );
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

	// - - -
	// end recording abstraction
	var startRecording = function(req, res) {
		var camId = req.params.id;

		camerasController.startRecording( camId, function(err) {
			if ( err ) {
				res.json({ success: false, error: err });
			} else {
				res.json({ success: true });
			}
		});
	};


	// - - -
	// stop recording abstraction
	var stopRecording = function( req, res ) {
		var camId = req.params.id;

		camerasController.stopRecording( camId, function(err) {
			if (err || cam.length === 0) {
				res.json({ success: false, error: err });
			} else {
				res.json({ success: true });
			}
		});
	};
	// end of stopRecording
	// - - -
	
};



