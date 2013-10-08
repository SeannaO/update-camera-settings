var onvif = require('./onvif');
var express = require('express');
var db = require('./nedb');
var tsHandler = require('./ts_handler');
var hlsHandler = require('./hls_handler');
var mp4Handler = require('./mp4_handler');
var CamerasController = require('./cam');

var localIp = "";

require('dns').lookup(require('os').hostname(), function (err, add, fam) {
    localIp = add;
});

var app = express();

var camerasController = new CamerasController();

/*
app.all('/*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
});
*/

app.use(express.cookieParser());
app.use(express.session({secret: 'solink'}));

app.use('/css', express.static(__dirname + '/css'));
app.use('/js', express.static(__dirname + '/js'));
app.use('/tmp', express.static(__dirname + '/videos/tmp'));

app.use(express.bodyParser());

// - -
// 
app.get('/', function (req, res) {    
    res.sendfile(__dirname + '/html/cameras.html');
});
// - - -


// - -
//
app.get('/ts/:file', function(req, res) {
  
    tsHandler.deliverTsFile( req, res );
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
app.get('/m3u8', function(req, res) {

    hlsHandler.generatePlaylist( db, req, res );
});
// - - -


// - -
// 
app.get('/stream', function(req, res) {

    req.session.mediaSequence = 0;
    res.sendfile(__dirname + "/player.html");
});
// - - -


// - -
//
app.get('/video', function(req, res) {
    
    mp4Handler.generateMp4Video( db, req, res );
 });
// - - -


// - -
//
app.get('/snapshot', function(req, res) {

    mp4Handler.takeSnapshot( db, req, res );
});
// - - -

// - - 
// 
app.get('/cameras.json', function(req, res) {

    camerasController.listCameras( function(err, list) {
        if (err) {
            res.end("{ 'error': '" + JSON.stringify(err) + "'}");
        } else {
            res.end( JSON.stringify(list) );
        }
    });
});
// - - -

// - - 
// 
app.get('/cameras', function(req, res) {
    res.sendfile(__dirname + '/html/cameras.html');
});
// - - -

// - - 
// 
app.get('/cameras/:id', function(req, res) {
    var camId = req.params.id;
    
    camerasController.getCamera( camId, function(err, cam) {
        if (err || cam.length == 0) {
            res.json({ success: false, error: err });
        } else {
            res.json({ success: true, camera: cam[0] });
        }
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
app.get('/cameras/:id/stop_recording', function(req, res) {
    var camId = req.params.id;
    
    camerasController.stopRecording( camId, function(err) {
        if (err || cam.length == 0) {
            res.json({ success: false, error: err });
        } else {
            res.json({ success: true });
        }
    });
});
// - - -


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
app.get('/player', function(req, res) {
    req.session.mediaSequence = 0;
    res.sendfile(__dirname + '/player.html');
});
// - - -


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

app.listen(process.env.PORT || 8080);

