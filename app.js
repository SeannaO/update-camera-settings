var onvif = require('./onvif');
var express = require('express');
var ffmpeg = require('./ffmpeg');
var fs = require('fs');
var db = require('./nedb');
var hls = require('./hls');
var path = require('path');
var cameras = require('./cam');

var localIp = "";
require('dns').lookup(require('os').hostname(), function (err, add, fam) {
    localIp = add;
});

var app = express();

/*
app.all('/*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
});
*/

db.setup();

app.use(express.cookieParser());
app.use(express.session({secret: 'solink'}));

app.use('/css', express.static(__dirname + '/css'));
app.use('/js', express.static(__dirname + '/js'));
app.use('/tmp', express.static(__dirname + '/videos/tmp'));

app.use(express.bodyParser());

// - -
// 
app.get('/', function (req, res) {
    res.sendfile(__dirname + '/index.html');    
});
// - - -


// - -
//
app.get('/ts/:file', function(req, res) {
  
    var fileUri =  __dirname + '/videos/' + path.basename(req.params.file, '.ts') + '.ts';

    fs.exists(fileUri, function( exists ) {

        if (exists) {
            res.writeHead(200, { "Content-Type": "video/MP2T" });
            var fileStream = fs.createReadStream( fileUri );
            fileStream.pipe(res);
        } 
        else {
             res.writeHead(200, { "Content-Type": "text" });
             res.end("file not found: " + fileUri);
        }
    });

});
// - - -


// - -
//
app.get('/live', function(req, res) {
       
    var begin = 0;
    //var end = begin + req.session.end;
    var end = Date.now();
    
    console.log( Date.now() );
    if ( isNaN( begin ) ) {
        res.end("invalid time");
        return;
    }
    
    if ( isNaN(parseInt(req.session.mediaSequence)) ) {
        req.session.mediaSequence = 0;
    }

    res.writeHead( 200, { "Content-Type":"application/x-mpegURL" } );

    db.searchVideosByInterval( begin, end, function( err, videoList, offset ) {
                        
        var fileList = videoList.map( function(video) {
            return video.file;
        });

        hls.calculateLengths( fileList, function(videos) {
            hls.livePlaylist(videos, 12, 0, function(playlist) {
                res.end(playlist);
                req.session.mediaSequence = req.session.mediaSequence + 1;
            });
        });
    });
});
// - - -


// - -
//
app.get('/m3u8', function(req, res) {
    res.writeHead(200, { "Content-Type":"application/x-mpegURL" });
    var begin = parseInt( req.query.begin );
    var end = parseInt( req.query.end );

    db.searchVideosByInterval( begin, end, function( err, videoList, offset ) {

        // videoList = videoList.reverse();
   //     console.log(videoList);
        
        var fileList = videoList.map( function(video) {
            return video.file;
        });

        hls.calculateLengths( fileList, function(videos) {
            console.log("*** lengths");
            console.log(fileList);
            console.log(videos);
            hls.generatePlaylist(videos, 12, 0, true, function(playlist) {
                console.log("*** playlist");
                console.log(playlist);
                res.end(playlist);
            });
        });
    });
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
    
    var begin = parseInt( req.query.begin );
    var end = parseInt( req.query.end );

    if ( isNaN(begin) || isNaN(end) ) {
        res.end("invalid interval");
        return;
    }

    var fileName = __dirname + "/tmp/" + begin + "_" + end + ".mp4";

    fs.exists( fileName, function(exists) {
        if (exists) {
            ffmpeg.sendStream( fileName, 0, req, res );
        } else {
            db.searchVideosByInterval( begin, end, function( err, videoList, offset ) {
                
                console.log(videoList);

                if (videoList.length == 0) {
                    
                    var formatedBegin = new Date(begin).toISOString();
                    var formatedEnd = new Date(end).toISOString();

                    res.end("couldn't find any video within " + formatedBegin + " and " + formatedEnd + "... :(");
                }
                else {
                    var fileList = videoList.map( function(video) {
                        return video.file;
                    });

                    ffmpeg.stitch( fileList, fileName, offset, function(mergedFile, error) {
                        if ( !error ) {
                            ffmpeg.sendStream( mergedFile, 0, req, res );
                        } else {
                            res.end("there was an error when trying to deliver the video... :(");
                        }
                    });
                }
            });    
        }
    });

 });
// - - -


// - -
// 
app.get('/seek', function(req, res) {
    var begin = parseInt(req.query.begin);

    if ( isNaN(begin) ) {
        res.end("invalid start time");
        return;
    }

    db.searchVideoByTime( begin, function( file, offset ) {
        offset = Math.round( offset );
        console.log( "streaming " + file );
        if (file == "") {
            file = "./test"
        }
        ffmpeg.sendStream(file, offset, req, res);        
    });
});
// - - -


// - -
//
app.get('/snapshot', function(req, res) {
    var time = parseInt(req.query.time);
    
    if ( isNaN(time) ) {
        res.end("invalid time");
        return;
    }

    db.searchVideoByTime( time, function( file, offset ) {
        offset = Math.round( offset );
        console.log( "taking snapshot of: " + file );
        
        fs.exists(file, function(exists) {
            if (exists) {
                ffmpeg.snapshot(file, offset, function(fileName) {
                    res.sendfile("tmp/" + fileName,
                        {},
                        function() {
                            console.log("file " + fileName + " sent");
                            fs.unlink( __dirname + '/tmp/' + fileName  );
                        });
                });
                } else {
                    res.end( "sorry, no videos were recorded at " + (new Date(time)).toISOString() );
                }
            });
    });
});
// - - -

// - - 
// 
app.get('/cameras.json', function(req, res) {
    cameras.listCameras( function(err, list) {
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
    
    cameras.getCamera( camId, function(err, cam) {
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
app.delete('/cameras/:id', function(req, res) {

    cameras.removeCamera( req.params.id, function( err, numRemoved ) {
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
    console.log( req.body );
    cameras.insertNewCamera( req.body, function( err, newDoc ) {
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

