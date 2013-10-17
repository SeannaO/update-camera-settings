var onvif = require('./onvif');
var express = require('express');
var db = require('./nedb');
var tsHandler = require('./ts_handler');
var hlsHandler = require('./hls_handler');
var mp4Handler = require('./mp4_handler');
var CamerasController = require('./cam');
var Stream = require('stream');
var fs = require('fs');
var path = require('path');
var lifeline = require('./lifeline.js');

var localIp = "";

require('dns').lookup(require('os').hostname(), function (err, add, fam) {
    localIp = add;
});

var app = express();

var camerasController = new CamerasController( db, __dirname + "/cameras" );

app.use(express.bodyParser()); // this must come before app.all 

app.all('/*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
});

app.use(express.cookieParser());
app.use(express.session({secret: 'solink'}));

app.use('/css', express.static(__dirname + '/css'));
app.use('/js', express.static(__dirname + '/js'));

app.set('view engine', 'ejs');

// - -
// 
app.get('/', function (req, res) {    
    res.sendfile(__dirname + '/views/cameras.html');
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
            console.log(file);

            fs.exists( file, function(exists) {
                if (exists) { 
                    res.sendfile(file);
                } else {
                    res.end("no thumb " + file);
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
            mp4Handler.takeSnapshot( db, cam, req, res );
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
            mp4Handler.generateMp4Video( db, cam, begin, end, function( response ) {
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
            mp4Handler.generateMp4Video( db, cam, begin, end, function( response ) {
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
    
    hlsHandler.generateFinitePlaylist( db, camId, begin, end, function( playlist ) {

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
    var camId = req.params.id;
    
    camerasController.startRecording( camId, function(err) {
        if ( err ) {
            res.json({ success: false, error: err });
        } else {
            res.json({ success: true });
        }
    });
});
// - - -

// - - 
// 
app.post('/cameras/:id/start_recording', function(req, res) {
    var camId = req.params.id;
    
    camerasController.startRecording( camId, function(err) {
        if ( err ) {
            res.json({ success: false, error: err });
        } else {
            res.json({ success: true });
        }
    });
});
// - - -


// - - 
// 
app.post('/cameras/:id/stop_recording', function(req, res) {
    var camId = req.params.id;
    
    camerasController.stopRecording( camId, function(err) {
        if (err || cam.length === 0) {
            res.json({ success: false, error: err });
        } else {
            res.json({ success: true });
        }
    });
});
// - - -


// - - 
// 
app.get('/cameras/:id/stop_recording', function(req, res) {
    var camId = req.params.id;
    
    camerasController.stopRecording( camId, function(err) {
        if (err || cam.length === 0) {
            res.json({ success: false, error: err });
        } else {
            res.json({ success: true });
        }
    });
});
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

lifeline.setup( app, camerasController, db, mp4Handler, hlsHandler );

////////////////////


app.listen(process.env.PORT || 8080);

