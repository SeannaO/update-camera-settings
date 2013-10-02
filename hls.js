//
// hls.js
//
// module for handling hls streams
// 

var path = require('path');
var ffmpeg = require('./ffmpeg');


var livePlaylist = function( videos, targetDuration, mediaSequence, cb ) {
    var content = "#EXTM3U\n" +
                  // "#EXT-X-PLAYLIST-TYPE:EVENT\n" +   
                  "#EXT-X-ALLOW-CACHE:YES\n" +
                  "#EXT-X-TARGETDURATION:" + targetDuration + "\n" +
                  // "#EXT-X-VERSION:3\n" +
                  "#EXT-X-MEDIA-SEQUENCE:" + mediaSequence + "\n";

    for ( var i = 0; i < videos.length; i++ ) {
        content = content + "#EXTINF:" + videos[i].duration + ",\n";
        content = content + "/ts/" + path.basename(videos[i].url) + "\n";
    }
    
    cb( content );
    console.log( content );
}


/**
 * generatePlaylist
 *
 */
var generatePlaylist = function( videos, targetDuration, mediaSequence, closed, cb ) {
    
    var content = "#EXTM3U\n" +
                  "#EXT-X-VERSION:3\n" +        
                  "#EXT-X-PLAYLIST-TYPE:VOD\n" +   
                  //"#EXT-X-ALLOW-CACHE:YES\n" +
                  "#EXT-X-TARGETDURATION:" + targetDuration + "\n" +
                  "#EXT-X-MEDIA-SEQUENCE:" + mediaSequence + "\n";

    for ( var i = 0; i < videos.length; i++ ) {
        content = content + "#EXTINF:" + videos[i].duration + ".0, no desc\n";
        content = content + "/ts/" + path.basename(videos[i].url) + "\n";
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

    var wait = false;
    var videos = [];

    if ( files.length == 0) {
        cb(videos);
    }
    else {

        for (var i = 0; i < files.length; i++) {
            var file = files[i];
            //wait = true;
            ffmpeg.calcDuration( file, function(duration, file) {
                videos.push({
                    url: "/ts/" + path.basename(file),
                    duration: duration
                });
                
                //wait = false;
                console.log(wait);
                
                if (i == files.length) {
                    cb(videos);
                }
            });
            while(wait) {;}
        }
    }
}
// - - end of calculateLengths
// - - - - - - - - - - - - - - - - - - - -


// exports
exports.generatePlaylist = generatePlaylist
exports.livePlaylist = livePlaylist
exports.calculateLengths = calculateLengths


