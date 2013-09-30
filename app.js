var onvif = require('./onvif');
var express = require('express');
var ffmpeg = require('./ffmpeg');
var fs = require('fs');
var db = require('./db');
var hls = require('./hls');

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

app.use('/css', express.static(__dirname + '/css'));
app.use('/js', express.static(__dirname + '/js'));
app.use('/tmp', express.static(__dirname + '/videos/tmp'));

// - -
// 
app.get('/', function (req, res) {
    res.sendfile(__dirname + '/index.html');    
});
// - - - - -


app.get('/ts/:file', function(req, res) {
  res.writeHead(200, { "Content-Type": "video/MP2T" });
  var file = fs.createReadStream( __dirname + '/videos/' + req.params.file);
  file.pipe(res);
});

app.get('/m3u8', function(req, res) {
    res.writeHead(200, { "Content-Type":"application/x-mpegURL" });
    var begin = parseInt( req.query.begin );
    var end = parseInt( req.query.end );

    db.searchVideosByInterval( begin, end, function( err, fileList, offset ) {
        fileList = fileList.reverse();
        hls.calculateLengths( fileList, function(videos) {
            hls.generatePlaylist(videos, 10, true, function(playlist) {
                res.end(playlist);
            });
        });
    });
});

// - -
// 
app.get('/stream', function(req, res) {
    res.sendfile(__dirname + "/videos/tmp/player.html");
});
// - - - - -


app.get('/video', function(req, res) {
    
    var begin = parseInt( req.query.begin );
    var end = parseInt( req.query.end );

    var fileName = __dirname + "/tmp/" + begin + "_" + end + ".mp4";

    fs.exists( fileName, function(exists) {
        if (exists) {
            ffmpeg.sendStream( fileName, 0, req, res );
        } else {
            db.searchVideosByInterval( begin, end, function( err, fileList, offset ) {
                console.log(fileList);
                if (fileList.length == 0) {
                    
                    var formatedBegin = new Date(begin).toISOString();
                    var formatedEnd = new Date(end).toISOString();

                    res.end("couldn't find any video within " + formatedBegin + " and " + formatedEnd + "... :(");
                }
                else {
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


//
app.get('/seek', function(req, res) {
    var begin = parseInt(req.query.begin);
    db.searchVideoByTime( begin, function( file, offset ) {
        offset = Math.round( offset );
        console.log( "streaming " + file );
        if (file == "") {
            file = "./test"
        }
        ffmpeg.sendStream(file, offset, req, res);        
    });
});


//
app.get('/snapshot', function(req, res) {
    var time = parseInt(req.query.time);

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


//
app.get('/player', function(req, res) {
    res.sendfile(__dirname + '/html/player.html');
});


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
            //res.write('"ip": "' + ipList[i] +'"');
            //res.write('}');
        }
        res.end(']');
    });    
});

app.listen(process.env.PORT || 8080);

