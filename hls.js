//
// hls.js
//
// module for handling hls streams
// 

var path = require('path');
var ffmpeg = require('./ffmpeg');


/**
 * generatePlaylist
 *
 */
var generatePlaylist = function( videos, targetDuration, closed, cb ) {
    
    var content = "#EXTM3U\n" +
                  "#EXT-X-TARGETDURATION:" + targetDuration + "\n" +
                  "#EXT-X-MEDIA-SEQUENCE:0\n";

    for ( var i = 0; i < videos.length; i++ ) {
        content = content + "#EXTINF:" + videos[i].duration + "\n";
        content = content + videos[i].url + "\n";
    }

    if ( closed ) {
        content = content + "#EXT-X-ENDLIST\n";
    }

    cb( content );
}
// - - end of generatePlaylist
// - - - - - - - - - - - - - - - - - - - -


/**
 * calculateLengths
 *
 */
var calculateLengths = function( files, cb ) {

    var counter = 0;
    var videos = [];

    console.log(files);

    for (var i = 0; i < files.length; i++) {
        var file = files[i];

        ffmpeg.calcDuration( file, function(duration, file) {
            videos.push({
                url: "/ts/" + path.basename(file),
                duration: duration
            });
            counter++;
            if (counter == files.length) {
                cb(videos);
            }
        });
    }
}
// - - end of calculateLengths
// - - - - - - - - - - - - - - - - - - - -


// exports
exports.generatePlaylist = generatePlaylist
exports.calculateLengths = calculateLengths


