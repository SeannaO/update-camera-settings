var path       = require('path');												// for parsing path urls
var fs         = require('fs');													// for sending files
var hlsHandler = require('../controllers/hls_controller.js');
var zlib       = require('zlib');

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

		camerasController.updateCamera( cam, function(err, camera) {
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
		camerasController.updateCameraSchedule(params, function(err, camera) {
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
				console.errlor("* * *");
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
		
		if (!cam) { 
			console.error("******* camera already deleted");
			res.json({success:false, error: 'camera already deleted; please refresh the page'});
			return;
		}

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
	app.get('/v1/cameras/:id', passport.authenticate('basic', {session: false}), function(req, res) {

		var camId = req.params.id;

		camerasController.getCamera( camId, function(err, cam) {
			if (err || (cam && cam.length === 0) || !cam) {
				console.error("*** getCamera error: ");
				console.error( err ) ;
				console.error("* * *");
				res.status(422).end({success:false, error: "couldn't find this camera"});
			} else {
				res.render('v1/camera', cam.toJSON());				
			}
		});
	});
	// end of camera page
	// - - -

	// - - -
	// renders camera page
	app.get('/cameras/:id', passport.authenticate('basic', {session: false}), function(req, res) {

		var camId = req.params.id;

		camerasController.getCamera( camId, function(err, cam) {
			if (err || (cam && cam.length === 0) || !cam) {
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
	app.get('/cameras/:cam_id/streams/:id/list_videos', function(req, res) {
		var camId = req.params.cam_id;
		var streamId = req.params.id;

		camerasController.listVideosByCamera( camId, streamId, req.query.start, req.query.end, function(err, fileList, offset) {
			if (err) {
				console.error("*** listVideosByCamera error: ");
				console.error( err ) ;
				console.error("* * *");
				res.status(422).json({error: err, success: false});
			} else {
				// we only need start/end information here
				fileList = fileList.map( function( d ) {
					var chunk = {
						'start': d.start,
						'end': d.end
					};
					return chunk;	
				});
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

		var self = this;

		var camId = req.params.cam_id;
		var streamId = req.params.id;
		this.thumb = req.params.thumb;
		thumb = path.basename(thumb);
		
		camerasController.getCamera( camId, function(err, cam) {
			if (err || !cam) {
				console.error("*** getCamera within stream thumbnail : thumb:" + self.thumb + " : cam_id: " + camId + " : stream_id : " + streamId);
				console.error( err ) ;
				console.error("* * *");
				res.status(422).json( { error: err } );
			} else {

				var file = cam.videosFolder + "/" + streamId + "/thumbs/" + self.thumb + ".jpg";

				fs.exists( file, function(exists) {
					if (exists) { 
						res.setHeader("Content-Type", "image/jpeg"); 
						res.sendfile(file);
					} else {
						res.end("no thumb " + self.thumb);
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
	// gets inMem mp4 video
	app.get('/cameras/:id/download', passport.authenticate('basic', {session: false}), function(req, res) {
		//	res.end('feature under construction');

		var camId = req.params.id;
		var begin = parseInt( req.query.begin, 10 );
		var end = parseInt( req.query.end, 10 );
		var stream = req.query.stream;

		if (!begin || !end || !camId) {
			res.status(422).json( { error: 'invalid request' } );
			return;
		}
	
		var self = this;	
		self.stream = stream;

		camerasController.getCamera( camId, function(err, cam) {
			if (err) {
				console.error("[/cameras/:id/download]  getCamera within mp4 inMem download: ");
				console.error( err );
				res.json( { error: err } );
			} else {
				if ( cam.streams.length == 0 ) {
					console.error("[/cameras/:id/download]  camera does not have any streams");
					res.status(422).json({ error: 'camera does not have any streams' });
				}
				// in case the streamId is invalid or not specified
				if ( !self.stream || !cam.streams[self.stream] ) {
					console.error("[/cameras/:id/download]  no such stream ");
					for (var s in cam.streams){
						self.stream = s;
						break;
					}
				}

				camerasController.mp4Handler.inMemoryMp4Video( cam.streams[self.stream].db, cam, begin, end, req, res );
			}
		});
	});
	// - - -


	// - - -
	// - - -
	// gets hls stream for live stream
	// temporarily without authentication, to fix native hls player issues
	// the next step will be using session cookies to handle auth
	app.get('/cameras/:id/live.m3u8', function(req, res) {

		var camId = req.params.id;
		var streamId = req.query.stream;

		camerasController.getCamera( camId, function(err, cam) {

			if (err || !cam) {
				console.error("[/cameras/:id/live.m3u8] :");
				if (!cam) err = 'camera does not exist; ' + err;
				console.error( err ) ;
				res.json( { error: err } );
			} else {
				// if no stream is not specified then just give the first stream
				if (!cam.streams[streamId]) {
					for (var s in cam.streams){
						streamId = s;
						break;
					}
				}

				hlsHandler.generateLivePlaylist( streamId, function( playlist ) {
					res.writeHead(200, { 
						"Content-Type":"application/x-mpegURL",
						'Content-Length': Buffer.byteLength(playlist) 
					});
					res.end(playlist);    
				});
			}
		});
	});


	// - - -
	// - - -
	// gets hls stream for finite length video
	// temporarily without authentication, to fix native hls player issues
	// the next step will be using session cookies to handle auth
	app.get('/cameras/:id/video.m3u8', function(req, res) {

		var camId = req.params.id;
		var begin = parseInt( req.query.begin, 10 );
		var end = parseInt( (req.query.end || Date.now()), 10 );
		var streamId = req.query.stream;

		camerasController.getCamera( camId, function(err, cam) {

			if (err) {
				console.error("[/cameras/:id/video.m3u8] :");
				console.error( err ) ;
				res.json( { error: err } );

			} else {
				// if no stream is not specified then just give the first stream

				//for (var stream in cam.streams){
				// in case the streamId is invalid or not specified
				if (!cam.streams[streamId]) {
					for (var s in cam.streams){
						streamId = s;
						break;
					}
				}

				// if there are no videos in the specified time frame then try another stream

				hlsHandler.generateFinitePlaylist( cam.streams[streamId].db, camId, streamId, begin, end, function( playlist ) {

					var buf = new Buffer(playlist, 'utf-8');
					zlib.gzip(buf, function(_, result) {
						res.writeHead(200, {
							"Content-Type":      "application/x-mpegURL",
							'Content-Encoding':  'gzip',
							"Cache-Control":     "max-age=60"
						});
						res.end(result);
					});



					// res.end(playlist);    
				});
				// support so that a finite length is not required (ie no end variable)

			}
			});
		});
	// - - -
};



