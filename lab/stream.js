var express = require('express'),
  ffmpeg = require('fluent-ffmpeg'),
  fs = require('fs');

var Metalib = ffmpeg.Metadata;

var app = express();

//app.use(express.static(__dirname + '/flowplayer'));

app.get('/', function(req, res) {
  res.send('index.html');
});

app.get('/video', function(req, res) {
    var stat = fs.statSync('test.mp4');
    var total = parseInt( stat.size );
    
      res.writeHead(200, { 
                'Content-Length': total, 
                'Content-Type': 'video/mp4' 
            });

    var pathToMovie = 'test.mp4';
    var proc = new ffmpeg({ source: pathToMovie, nolog: true })
    // use the 'flashvideo' preset (located in /lib/presets/flashvideo.js)
    .usingPreset('podcast')
    // save to stream
    .writeToStream(res, function(retcode, error){
        console.log('file has been converted succesfully');
        res.end();
    });

    res.on('data', function(data) {
        console.log(data);
    });
});

app.listen(4000);
