var path       = require('path');												// for parsing path urls
var fs         = require('fs');													// for sending files
var hlsHandler = require('../controllers/hls_controller.js');
var zlib       = require('zlib');

module.exports = function( app, passport, camerasController ) {

	// - - -
	// gets json list of cameras
	app.get('/cameras.json', passport.authenticate('basic', {session: false}), function(req, res) {

		if (!validateCamerasLoaded(camerasController, res) ) { return; }

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

		if ( !validateCamerasLoaded(camerasController, res) ) { return; }

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

		if ( !validateCamerasLoaded(camerasController, res) ) { return; }

		var cam = req.body;
		cam._id = req.params.id;

		camerasController.updateCamera( cam, function(err, camera) {
			if (err) {
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

		if ( !validateCamerasLoaded(camerasController, res) ) { return; }

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

		if ( !validateCamerasLoaded(camerasController, res) ) { return; }

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

		if ( !validateCamerasLoaded(camerasController, res) ) { return; }

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

	app.put('/cameras/:id/motion_roi', passport.authenticate('basic', {session: false}), function(req, res) {

		if ( !validateCamerasLoaded(camerasController, res) ) { return; }

		var params = req.body;
		params._id = req.params.id;

		camerasController.setROI(params, function(err) {
			if (err) {
				console.error("*** updateMotionROI error: ");
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
	app.delete('/cameras/:id', passport.authenticate('basic', {session: false}), function(req, res) {

		if ( !validateCamerasLoaded(camerasController, res) ) { return; }

		var cam = camerasController.findCameraById( req.params.id ).cam;
		
		if (!cam) { 
			console.error("[api/cameras.delete]  camera not found");
			res.status(422).json({error: 'camera not found'});
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

		if ( !validateCamerasLoaded(camerasController, res) ) { return; }

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

	
	app.delete('/cameras/:camera_id/spot_monitor_streams/:stream_id', passport.authenticate('basic', {session: false}), function(req, res) {

		if ( !validateCamerasLoaded(camerasController, res) ) { return; }

		var camId    = req.params.camera_id;
		var streamId = req.params.stream_id;

		var cam = camerasController.findCameraById( camId ).cam;
		if (!cam) {
			console.error('[api/cameras]  DELETE spot-monitor: camera ' + camId + ' not found: ');
			res.status(404).json({error: 'camera not found'});
			return;
		} 

		var stream = cam.spotMonitorStreams[ streamId ];
		if (!stream) {
			console.error('[api/cameras]  DELETE spot-monitor: stream ' + streamId + ' not found: ');
			res.status(404).json({error: 'stream not found'});
			return;
		}

		camerasController.removeSpotMonitorStream( camId, streamId, function( err ) {
			if (err) {
				console.error('[api/cameras]  removeSpotMonitorStream error: ');
				console.error( err ) ;
				res.json({success: false, error: err});
			} else if (cam) {
				res.json({success: true, _id: req.params.id});
			}
		});
	});
	// - - 
	// 
	app.get('/cameras/schedule', passport.authenticate('basic', {session: false}), function(req, res) {

            if ( !validateCamerasLoaded(camerasController, res) ) { return; }

            var schedules = {};

            for( var i in camerasController.cameras ) {

                var cam = camerasController.cameras[i];

                schedules[cam._id] = {}
                schedules[cam._id].schedule = cam.schedule.toJSON();    
                schedules[cam._id].enabled = cam.schedule_enabled;    
            }

            res.json( schedules );
	});
	// - - -


	// - - 
	// 
	app.get('/cameras/:id/schedule.json', passport.authenticate('basic', {session: false}), function(req, res) {

		if ( !validateCamerasLoaded(camerasController, res) ) { return; }

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

		if ( !validateCamerasLoaded(camerasController, res) ) { return; }

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
				res.status(422).json({success:false, error: "couldn't find this camera"});
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
				res.status(422).json({success:false, error: "couldn't find this camera"});
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

		if ( !validateCamerasLoaded(camerasController, res) ) { return; }

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
	// get recent (not necessarily the latest) thumb image (jpg);
	app.get('/cameras/:cam_id/thumb.jpg', passport.authenticate('basic', {session: false}), function(req, res) {

            if ( !validateCamerasLoaded(camerasController, res) ) { return; }

            var camId = req.params.cam_id;


            camerasController.getCamera( camId, function(err, cam) {

                if (err || !cam) {
                    return res.status(422).json( { error: err || 'camera does not exist'} );
                }

                for ( var i in cam.streams ) {

                    var stream = cam.streams[i];
                    if (!stream || !stream.previousThumb) { continue; }

                    var thumbsPath = path.resolve( process.env['BASE_FOLDER'], camId, stream.id, 'thumbs' );
                    var thumbFile = path.resolve( thumbsPath, stream.previousThumb + '.jpg' );
                    return res.sendfile( thumbFile );
                }

                res.status(404).json({
                    error: 'this camera does not have any thumbnail yet'
                });
            });
	});
	// - - -


	// - - -
	// get most recent thumb data (json)
	app.get('/cameras/:cam_id/streams/:id/thumb.json', passport.authenticate('basic', {session: false}), function(req, res) {

		if ( !validateCamerasLoaded(camerasController, res) ) { return; }

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
		this.thumb = path.basename(this.thumb);
		
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
						res.setHeader("Cache-Control", "public, max-age=999999"); 
						res.sendfile(file);
					} else {
						res.status(404).end("no thumb " + self.thumb);
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
		
		camerasController.getCamera( camId, function(err, cam) {
			if (err || !cam) {
				res.json(500, {error: 'no such camera'});
			} else {
				camerasController.requestSnapshot( camId, req, res );
			}
		});
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
	// subtitles downloads
	app.get('/cameras/:id/subtitles', passport.authenticate('basic', {session: false}), function(req, res) {

            req.query.format = 'srt';
            handleVideoDownloadRequest( req, res );
	});
	// - - -


	// - - -
	// video/subtitles downloads
	app.get('/cameras/:id/download', passport.authenticate('basic', {session: false}), function(req, res) {

            handleVideoDownloadRequest( req, res );
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
		var type = req.query.type;
		var length = isNaN(req.query.length) ? 1 : req.query.length;

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

				switch (type) {

					case 'standard': 
						hlsHandler.generateLivePlaylistStandard( streamId, cam.streams[streamId].latestChunks, cam.streams[streamId].cc,length, function( playlist ) {
							res.writeHead(200, {
								'Content-Type':    'application/x-mpegURL',
								'Content-Length':  Buffer.byteLength(playlist),
								'Cache-Control':   'public, max-age=5'
							});
							res.end(playlist);    
						});
					break;

					case 'pipe':
					default:
						hlsHandler.generateLivePlaylistPipe( streamId, function( playlist ) {
							res.writeHead(200, {
								'Content-Type':    'application/x-mpegURL',
								'Content-Length':  Buffer.byteLength(playlist),
								'Cache-Control':   'public, max-age=5'
							});
							res.end(playlist);    
						});
						break;
				} 
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
			} else if (!cam) {
				console.error("[/cameras/:id/video.m3u8] :");
				console.error('no such camera' ) ;
				res.json( { error: 'no such camera' } );
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

					if (!playlist) {
						res.end('');
						return;
					}
					
					var buf = new Buffer(playlist, 'utf-8');
					zlib.gzip(buf, function(_, result) {
						res.writeHead(200, {
							"Content-Type":      "application/x-mpegURL",
							'Content-Encoding':  'gzip',
							"Cache-Control":     "public, max-age=60"
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
	//
	

	// - - -
	// retention percentage
	app.get('/cameras/:id/retention', passport.authenticate('basic', {session: false}), function(req, res) {

		var camId = req.params.id,
			start = req.query.start,
			end   = req.query.end;

		camerasController.getRetention( camId, start, end, function(err, ret) {
			if (err || !ret ) {
				res.status(422).json({ error: err });
			} else {
				res.json( ret );
			}
		});
	});
	// - - 
	//

    var handleVideoDownloadRequest = function(req, res) {

        var camId  = req.params.id;
        var begin  = parseInt( req.query.begin, 10 );
        var end    = parseInt( req.query.end, 10 );
        var stream = req.query.stream;

        if (!begin || !end || !camId) {
            res.status(422).json( { error: 'invalid request' } );
            return;
        }
        if (begin > end ) {
            res.status(422).json({error:'begin time greater than end time'});
            return;
        }
        if ( end - begin > 3 * 60 * 60 * 1000 ) {
            res.status(422).json({error:'video requested is too long ( > 3h )'});
            console.error('[api/cameras download] attempt to download video/subs longer than 3h');
            return;
        }

        camerasController.getCamera( camId, function(err, cam) {

            if (err || !cam) {
                err = err || 'camera ' + camId + ' not found';
                console.error("[api/cameras download]  " + err);
                res.status(422).json( { error: err } );
                return;
            }

            if ( cam.streams.length == 0 ) {
                console.error("[api/cameras download]  camera does not have any streams");
                res.status(422).json({ error: 'camera does not have any streams' });
                return;
            }

            // use first stream if streamId is invalid or not specified
            if ( !stream || !cam.streams[stream] ) {
                console.error("[api/cameras download]  no such stream ");
                for (var s in cam.streams){
                    stream = s;
                    break;
                }
            }

            camerasController.mp4Handler.inMemoryMp4Video( 
                    cam.streams[stream].db, cam, 
                    begin, end, 
                    req, res 
                );
        });
    };
};


var validateCamerasLoaded = function( controller, res ) {

		if ( !controller.loaded ) {
			res.status(503).json({
				error: 'cameras db is still being loaded'
			});
			return false;
		}

		return true;
}
