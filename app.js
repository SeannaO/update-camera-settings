//require('look').start();  -- profiler ( NOT for production )

var express = require('express');
var tsHandler = require('./helpers/ts');
var hlsHandler = require('./controllers/hls_controller');
var mp4Handler = require('./controllers/mp4_controller');
var CamerasController = require('./controllers/cameras_controller');
var Stream = require('stream');
var fs = require('fs');
var path = require('path');
var lifeline = require('./helpers/lifeline_api.js');
var request = require('request');

// - - -
// health check modules
var Iostat = require('./helpers/iostat.js');
var iostat = new Iostat();
iostat.launch();

var Smart = require('./helpers/smart.js');
var smart = new Smart({development: true});
smart.start();

var Diskstat = require('./helpers/diskstat');
var diskstat = new Diskstat({development: true});
diskstat.launch();
// - - -




var io = require('socket.io');

var CamHelper = require('./helpers/cameras_helper.js');

var localIp = "";

require('dns').lookup(require('os').hostname(), function (err, add, fam) {
    localIp = add;
});

var app = express();

// - - -
// socket.io config 
var server = require('http').createServer(app);
io = io.listen(server);
io.set('log level', 1);
// - - -

server.listen(process.env.PORT || 8080);

var Scheduler = require('./helpers/scheduler.js');
var scheduler = new Scheduler(10000);



var camerasController = new CamerasController( __dirname + '/db/cam_db', '/Users/WadBook/solink/nas/cameras');
app.use(express.bodyParser()); // this must come before app.all 

scheduler.launchForAllCameras(camerasController.getCameras());

camerasController.on('create', function(camera) {
    scheduler.launchForCamera(camera);
});

camerasController.on('delete', function(camera) {
    scheduler.clearForCamera(camera);
});

camerasController.on('update', function(camera) {
    scheduler.clearForCamera(camera);
    scheduler.launchForCamera(camera);
});


// - - -
// socket.io broadcasts
camerasController.on('new_chunk', function( data ) {
   
    io.sockets.emit( 'newChunk', data );
});

camerasController.on('camera_status', function( data ) {

	if (data.status !== 'online') {
		io.sockets.emit( 'cameraStatus', data );
	}
});

iostat.on('cpu_load', function(data) {
	io.sockets.emit('cpu_load', data);
});

smart.on('smart', function(data) {
	io.sockets.emit('smart', data);
});

diskstat.on('hdd_throughput', function(data) {
	io.sockets.emit('hdd_throughput', data);
});
// - - -


app.all('/*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
});

app.use(express.cookieParser());
app.use(express.session({secret: 'solink'}));

app.use('/css', express.static(__dirname + '/assets/css'));
app.use('/js', express.static(__dirname + '/assets/js'));

app.set('view engine', 'ejs');

// - -
// 
app.get('/', function (req, res) {    
    res.sendfile(__dirname + '/views/cameras.html');
});
// - - -


// - -
//
app.get('/health', function(req, res) {

    res.sendfile(__dirname + '/views/health.html');
});
// - - -


// - -
//
app.get('/ts/:id/:file', function(req, res) {
    
    var camId = req.params.id;
    var file = req.params.file;

    tsHandler.deliverTsFile( camId, file, res );
});
// - - -


// - -
//
app.get('/live', function(req, res) {

    hlsHandler.generateLivePlaylist( db, req, res );       
});
// - - -

// - - 
// 
app.get('/cameras.json', function(req, res) {

    camerasController.listCameras( function(err, list) {
        console.log(list);
        if (err) {
            res.end("{ 'error': '" + JSON.stringify(err) + "'}");
        } else {
            res.json(list);
        }
    });
});
// - - -

// - - 
// 
app.get('/cameras', function(req, res) {
    res.sendfile(__dirname + '/views/cameras.html');
});
// - - -


// - - 
// 
app.get('/cameras/:id/list_videos', function(req, res) {
    var camId = req.params.id;
    
    camerasController.listVideosByCamera( camId, req.query.start, req.query.end, function(err, fileList, offset) {
        if (err) {
            res.json({error: err, success: false});
        } else {
            res.json({success: true, offset: offset, videos: fileList});
        }
    });
});
// - - -


// - - 
// 
app.get('/cameras/:id/thumb/:thumb', function(req, res) {

    var camId = req.params.id;
    var thumb = req.params.thumb;
    thumb = path.basename(thumb);

    camerasController.getCamera( camId, function(err, cam) {
        if (err) {
            res.json( { error: err } );
        } else {

            var file = cam.videosFolder + "/thumbs/"+thumb+".jpg";
			
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


// - - 
// 
app.get('/cameras/:id/snapshot', function(req, res) {
    
    var camId = req.params.id;

    camerasController.getCamera( camId, function(err, cam) {

        if (err) {
            res.json( { error: err } );
        } else {
            mp4Handler.takeSnapshot( cam.db, cam, req, res );
        }
    });
});
// - - -


// - - 
// 
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


// - - 
// 
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


// - - 
// 
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


// - - 
// 
app.get('/cameras/:id/start_recording', function(req, res) {
    startRecording(req, res);
});
app.post('/cameras/:id/start_recording', function(req, res) {
    startRecording(req, res);
});
// - - -
//

// - - 
// 
app.post('/cameras/:id/stop_recording', function(req, res) {
    stopRecording( req, res );
});
app.get('/cameras/:id/stop_recording', function(req, res) {
    stopRecording( req, res );
});
// - - -


// - - -
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
// - - -


// - - 
// 
app.get('/multiview', function(req, res) {
    
	res.sendfile(__dirname + '/views/multi.html');
});
// - - -
//

// - - 
// 
app.get('/cameras/:id', function(req, res) {
    var camId = req.params.id;
    
    camerasController.getCamera( camId, function(err, cam) {
        if (err || cam.length === 0) {
            res.end("couldn't find this camera");
        } else {
            res.render('camera', {id: cam._id, rtsp: cam.rtsp, name: cam.name});
        }
    });
});
// - - -


// - - 
// 
app.get('/cameras/:id/json', function(req, res) {
    var camId = req.params.id;
    
    camerasController.getCamera( camId, function(err, cam) {
        if (err || !cam || cam.length === 0) {
            res.json({ success: false, error: err });
        } else {
            res.json({ success: true, camera: {_id: cam._id, name: cam.name, ip: cam.ip, rtsp: cam.rtsp } });
        }
    });
});
// - - -


app.put('/cameras/:id', function(req, res) {
    var cam = req.body;
    cam._id = req.params.id;

    camerasController.updateCamera( cam, function(err) {
        if (err) {
            res.json({success: false, error: err});
        } else {
            res.json({success: true});
        }
    });
});


// - -
//
app.delete('/cameras/:id', function(req, res) {

	var cam = camerasController.findCameraById( req.params.id ).cam;

    camerasController.removeCamera( req.params.id, function( err, numRemoved ) {
        if (err) {
            res.json({success: false, error: err});
        } else if (cam) {
			/*
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
// - - -


// - -
//
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
// - -



// - -
// 
app.get('/scan', function(req, res) {
    var prefix = localIp.substr(0,11);
    console.log("scanning for ONVIF cameras...");
    onvif.scan(prefix, function(ipList) {
        res.header("Content-Type", "application/json");
        res.write('[');
        for (var i = 0; i < ipList.length; i++) {
            console.log("found ONVIF camera on ip: " + ipList[i]);      
            res.write('{ "ip": "' + ipList[i]+ '" }');
        }
        res.end(']');
    });    
});
// - - -




/////////////////////
/// lifeline     ///
////////////////////

lifeline.setup( app, camerasController, mp4Handler, hlsHandler );

////////////////////



