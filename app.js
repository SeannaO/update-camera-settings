//require('look').start();  -- profiler ( NOT for production )

var onvif = require('./helpers/onvif');
var express = require('express');
var tsHandler = require('./helpers/ts');
var hlsHandler = require('./controllers/hls_controller');
var mp4Handler = require('./controllers/mp4_controller');
var CamerasController = require('./controllers/cameras_controller');
var Stream = require('stream');
var fs = require('fs');
var path = require('path');
var lifeline = require('./helpers/lifeline_api.js');

var io = require('socket.io');


var CamHelper = require('./helpers/cameras_helper.js');

var localIp = "";

require('dns').lookup(require('os').hostname(), function (err, add, fam) {
    localIp = add;
});

var app = express();

// for socket.io 
var server = require('http').createServer(app);
io = io.listen(server);
//
server.listen(process.env.PORT || 8080);

var camerasController = new CamerasController( __dirname + '/db/cam_db', '/Users/manuel/solink/nas/cameras');
app.use(express.bodyParser()); // this must come before app.all 


camerasController.on('new_chunk', function( data ) {
   
    io.sockets.emit( 'new_chunk', data );
});

camerasController.on('camera_disconnected', function( data ) {
    io.sockets.emit( 'camera_disconnected', { cam_id: data.cam_id} );
//    console.log("camera " + data.cam_id + " was disconnected!!!");
});

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
app.get('/socket', function(req, res) {

    res.sendfile(__dirname + '/views/socket.html');
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
            // console.log(cam.videosFolder + "/thumbs/"+thumb+".jpg");

            var file = cam.videosFolder + "/thumbs/"+thumb+".jpg";
            //console.log(file);

            fs.exists( file, function(exists) {
                if (exists) { 
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

    camerasController.removeCamera( req.params.id, function( err, numRemoved ) {
        if (err) {
            res.json({success: false, error: err});
        } else {
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



