//require('look').start();  -- profiler ( NOT for production )

var express = require('express');										// express 
var tsHandler = require('./helpers/ts');								// ts abstraction
var hlsHandler = require('./controllers/hls_controller');				// hls abstraction
var mp4Handler = require('./controllers/mp4_controller');				// mp4 abstraction
var CamerasController = require('./controllers/cameras_controller');	// cameras controller								
var fs = require('fs');													// for sending files
var path = require('path');												// for parsing path urls
var lifeline = require('./helpers/lifeline_api.js');					// api layer for lifeline app
var request = require('request');										// for making requests to lifeline app
var CamHelper = require('./helpers/cameras_helper.js');					// abstraction for start/stop recordings
var DiskSpaceAgent = require('./helpers/diskSpaceAgent.js');			// agent that periodically checks disk space


// - - -
// kills any ffmpeg, iostat and smartctl processes that might be already running
var exec = require('child_process').exec;
exec('killall ffmpeg', function( error, stdout, stderr) {});
exec('killall iostat', function( error, stdout, stderr) {});
exec('killall smartctl', function( error, stdout, stderr) {});
// - - 

// - - -
// stores machine ip
var localIp = "";

require('dns').lookup(require('os').hostname(), function (err, add, fam) {
    localIp = add;
});
// - - -

// starts express
var app = express();

// - - -
// socket.io config 
var io = require('socket.io');

var server = require('http').createServer(app);
io = io.listen(server);
io.set('log level', 1);
// end of socket.io config
// - - -

// - - - - -
// sets base folder from the command line
// usage:  node app.js /my/folder
var baseFolder;

if ( process.argv.length > 2 ) {
	baseFolder = process.argv[2];
	if ( !fs.existsSync( baseFolder ) ) {
		console.log('the folder ' + baseFolder + ' doesn\'t exist; create that folder before starting the server');
		process.exit();
	}
} else {
	console.log('you need to provide a base folder where the files are going to be stored');
	process.exit();
}
// - - -


// server.listen(process.env.PORT || 8080);
server.listen( 8080 );

//var folder = '/Users/manuel/solink/nas/cameras';
var camerasController = new CamerasController( mp4Handler, __dirname + '/db/cam_db', baseFolder);


// middleware for parsing request body contents
// this must come before app.all
app.use(express.bodyParser());  


// - - - - -
// disk space agent
var diskSpaceAgent = new DiskSpaceAgent( baseFolder );
diskSpaceAgent.launch();
diskSpaceAgent.on('disk_usage', function(usage) {
	var nCameras = camerasController.getAllCameras().length;
	console.log( "usage: " + usage + "%");
	console.log("nCameras: " + nCameras);
	if (usage > 17) {	// usage in %
		
		console.log('freeing disk space...');
		camerasController.deleteOldestChunks( 10*nCameras, function(data) {
			console.log( "done deleting files. is it enough?" );
		});
	}
});
// - - -

// - - - - -
// health check modules
require('./controllers/health.js')( io );
// - - -

// - - - -
// socket.io broadcasts setup
camerasController.on('new_chunk', function( data ) {
    io.sockets.emit( 'newChunk', data );
});

camerasController.on('camera_status', function( data ) {
	io.sockets.emit( 'cameraStatus', data );
});
// end of socket.io broadcasts setup
// - - -



var Scheduler = require('./helpers/scheduler.js');
var scheduler = new Scheduler(10000);
setTimeout(function(){
    scheduler.launchForAllCameras(camerasController.getCameras());
}, 10000);


camerasController.on('create', function(camera) {
    console.log("camera created calling launchForCamera on scheduler");
    scheduler.launchForCamera(camera);
});

camerasController.on('delete', function(camera) {
    console.log("camera deleted, removing scheduler");
    scheduler.clearForCamera(camera);
});

camerasController.on('schedule_update', function(camera) {
    console.log("camera scheduler updated, relaunching scheduler");
    scheduler.clearForCamera(camera);
    scheduler.launchForCamera(camera);
});


app.all('/*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
});
//

app.use(express.cookieParser());				// cookies middleware
app.use(express.session({secret: 'solink'}));	// for session storage

// - - -
// static files
app.use('/css', express.static(__dirname + '/assets/css'));		
app.use('/js', express.static(__dirname + '/assets/js'));
// end of static files
// - - -

app.set('view engine', 'ejs');	// rendering engine (like erb)


// - - -
// main page
app.get('/', function (req, res) {    
    res.sendfile(__dirname + '/views/cameras.html');
});
// - - -


// - - -
//	health stats
app.get('/health', function(req, res) {

    res.sendfile(__dirname + '/views/health.html');
});
// - - -


// - - -
// camera scanner
// usage: append subnet prefix in the form xxx.xxx.xxx
require('./helpers/camera_scanner/scanner.js')( app, '192.168.215' );
// - - -


// - - -
// gets ts segment
app.get('/ts/:id/:file', function(req, res) {
    
    var camId = req.params.id;
    var file = req.params.file;

    tsHandler.deliverTsFile( camId, file, res );
});
// - - -


// - - -
//	gets hls live stream
//	TODO: not yet implemented
app.get('/live', function(req, res) {

    hlsHandler.generateLivePlaylist( db, req, res );       
});
// - - -

// - - -
// gets json list of cameras
app.get('/cameras.json', function(req, res) {

    camerasController.listCameras( function(err, list) {
        list.map(function(item){
            console.log(item);
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
// renders main cameras page
app.get('/cameras', function(req, res) {
    res.sendfile(__dirname + '/views/cameras.html');

	//camerasController.deleteOldestChunks();

});
// - - -

// - - -
// lists all profiles
app.get('/cameras/:id/streams', function(req, res) {
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
            res.json({error: err, success: false});
        } else {
            res.json({success: true, offset: offset, videos: fileList});
        }
    });
});
// - - -


// - - -
// gets thumbnail
app.get('/cameras/:cam_id/streams/:id/thumb/:thumb', function(req, res) {

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
// requests snapshot, returns jpeg
app.get('/cameras/:id/snapshot', function(req, res) {
    
    var camId = req.params.id;
	camerasController.requestSnapshot( camId, req, res );
});
// - - -


// - - -
// requests mp4video, returns json when ready
app.get('/cameras/:id/video.json', function(req, res) {

    var camId = req.params.id;
    var begin = parseInt( req.query.begin, 10 );
    var end = parseInt( req.query.end, 10 );
    
    camerasController.getCamera( camId, function(err, cam) {
         if (err) {
            res.json( { error: err } );
        } else {
            mp4Handler.generateMp4Video( cam.db, cam, begin, end, function( response ) {
                res.json( response );
            });
        }
    });
});
// - - -


// - - -
// gets mp4 video
app.get('/cameras/:id/video', function(req, res) {

    var camId = req.params.id;
    var begin = parseInt( req.query.begin, 10 );
    var end = parseInt( req.query.end, 10 );

    camerasController.getCamera( camId, function(err, cam) {
        if (err) {
            res.json( { error: err } );
        } else {
            mp4Handler.generateMp4Video( cam.db, cam, begin, end, function( response ) {
                if(response.success) {
                    mp4Handler.sendMp4Video( response.file, req, res );
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
app.get('/cameras/:id/memvideo', function(req, res) {
//	res.end('feature under construction');

    var camId = req.params.id;
    var begin = parseInt( req.query.begin, 10 );
    var end = parseInt( req.query.end, 10 );

    camerasController.getCamera( camId, function(err, cam) {
        if (err) {
            res.json( { error: err } );
        } else {
            mp4Handler.inMemoryMp4Video( cam.db, cam, begin, end, req, res );
        }
    });
	
});
// - - -


// - - -
// gets hls stream for finite length video
app.get('/cameras/:id/video.hls', function(req, res) {

    var camId = req.params.id;
    var begin = parseInt( req.query.begin, 10 );
    var end = parseInt( req.query.end, 10 );
    
    hlsHandler.generateFinitePlaylist( cam.db, camId, begin, end, function( playlist ) {

        res.writeHead(200, { 
             "Content-Type":"application/x-mpegURL",
             'content-length': playlist.length 
        });

        res.end(playlist);    
    });
});
// - - -


// - - -
// starts recording
// TODO: should be only via post
app.get('/cameras/:id/start_recording', function(req, res) {
    startRecording(req, res);
});
app.post('/cameras/:id/start_recording', function(req, res) {
    startRecording(req, res);
});
// - - -
//

// - - -
// stops recording
// TODO: should be only via post
app.post('/cameras/:id/stop_recording', function(req, res) {
    stopRecording( req, res );
});
app.get('/cameras/:id/stop_recording', function(req, res) {
    stopRecording( req, res );
});
// - - -


// - - -
// multicam mockup 
// TODO: create a real multicam page
app.get('/multiview', function(req, res) {
    
	res.sendfile(__dirname + '/views/multi.html');
});
// - - -


// - - -
// renders camera page
app.get('/cameras/:id', function(req, res) {

	var camId = req.params.id;
    
    camerasController.getCamera( camId, function(err, cam) {
        if (err || cam.length === 0) {
            res.end("couldn't find this camera");
        } else {
			// console.log( cam.deleteOldestChunks(10) );
            res.render('camera', cam.toJSON());
        }
    });
});
// end of camera page
// - - -

app.put('/cameras/:id/schedule', function(req, res) {
    var params = req.body;
    params._id = req.params.id;
    camerasController.updateCameraSchedule(params, function(err) {
        if (err) {
            res.json({success: false, error: err});
        } else {
            res.json({success: true});
        }
    });
});

// - - -
// returns camera info (json)
app.get('/cameras/:id/json', function(req, res) {
    var camId = req.params.id;
    
    camerasController.getCamera( camId, function(err, cam) {
        if (err || !cam || cam.length === 0) {
            res.json({ success: false, error: err });
        } else {
            res.json({ success: true, camera: cam.toJSON() });
        }
    });
});
// - - /
// - - 
// 
app.get('/cameras/:id/schedule/json', function(req, res) {
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

// - - -
// update camera
app.put('/cameras/:id', function(req, res) {
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
// delete camera
// TODO: delete camera on lifeline app
app.delete('/cameras/:id', function(req, res) {

	var cam = camerasController.findCameraById( req.params.id ).cam;

    camerasController.removeCamera( req.params.id, function( err, numRemoved ) {
        if (err) {
            res.json({success: false, error: err});
        } else if (cam) {
			/*  
			// delete camera on lifeline app
			try {
				var url = "https://admin:admin@192.168.215.153/cp/solink_delete_camera?v=2&id="+encodeURIComponent( cam.id );
				request(url, {
					strictSSL: false
				},
				function(err, r) {
					if (err) {
						console.log("error communicating with lifeline app: ");
						console.log(err);
					}
				});
			} catch (e) {

			} */
            res.json({success: true, _id: req.params.id});
        }
    });
    
});
// end of delete camera
// - - -


// - - -
// posts new camera
app.post('/cameras/new', function(req, res) {

    camerasController.insertNewCamera( req.body, function( err, newDoc ) {
        if (err) {
            res.json({ sucess: false, error: err  });
        } else {
            res.json( newDoc );
			
			try {
				var id = encodeURIComponent( newDoc.id );
				var rtspurl = encodeURIComponent( newDoc.rtsp );
				var name = encodeURIComponent( newDoc.name );
				var ip = encodeURIComponent( newDoc.ip ); 

				var url = "https://admin:admin@localhost/cp/solink_add_or_update_camera?v=2&camera:name="+name+"&camera:state="+1+"&camera:ipaddress=0.0.0.0&camera:rtspurl="+rtspurl;
				request(url, {
					strictSSL: false
				},
					function(err, r) {
						
						if (!err) {
							var newCam = newDoc;
							var newId = r.body;
							newId = newId.replace(/"/g, "");
							console.log(newId);
							newCam.id = newId;
							camerasController.updateCamera( newCam, function(err) {} );
						} else {
							console.log("error communicating with lifeline app: ");
							console.log(err);
						}
					});
			} catch( e ) {
				console.log("error when connecting to lifeline");
				console.log ( e );
			}
        }
    });
});
// end of post new camera
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


/////////////////////
/// lifeline  api ///
////////////////////

lifeline.setup( app, camerasController, mp4Handler, hlsHandler );

////////////////////



