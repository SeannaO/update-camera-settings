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
var generatePlaylist = function( videos, targetDuration, mediaSequence, closed, cb ) {
    
    var content = "#EXTM3U\n" +
                  "#EXT-X-PLAYLIST-TYPE:EVENT\n" +   
                  "#EXT-X-ALLOW-CACHE:YES\n" +
                  "#EXT-X-TARGETDURATION:" + targetDuration + "\n" +
                  "#EXT-X-VERSION:3\n" +
                  "#EXT-X-MEDIA-SEQUENCE:" + mediaSequence + "\n";

    for ( var i = 0; i < videos.length; i++ ) {
        content = content + "#EXTINF:" + videos[i].duration + ",\n";
        content = content + path.basename(videos[i].url) + "\n";
    }

    if ( closed ) {
        content = content + "#EXT-X-ENDLIST\n";
    }

    console.log( content );

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

    if ( files.length == 0) {
        cb(videos);
    }
    else {

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
}
// - - end of calculateLengths
// - - - - - - - - - - - - - - - - - - - -


// exports
exports.generatePlaylist = generatePlaylist
exports.calculateLengths = calculateLengths


