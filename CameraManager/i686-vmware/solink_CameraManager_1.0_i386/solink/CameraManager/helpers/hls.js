//
// hls.js
//
// module for handling hls streams
// 

var path = require('path');
var ffmpeg = require('./ffmpeg');


var livePlaylist = function( videos, targetDuration, mediaSequence, cb ) {
    var content = "#EXTM3U\n" +
                  "#EXT-X-VERSION:3\n" +          
//                  "#EXT-X-PLAYLIST-TYPE:EVENT\n" + 
                  "#EXT-X-ALLOW-CACHE:YES\n" +
                  "#EXT-X-TARGETDURATION:" + targetDuration + "\n" +
                  "#EXT-X-MEDIA-SEQUENCE:" + mediaSequence + "\n";

    for ( var i = 0; i < videos.length; i++ ) {
        content = content + "#EXTINF:" + videos[i].duration + ",\n";
        content = content + "/ts/" + path.basename(videos[i].url) + "\n";
    }
    
    cb( content );
    console.log( content );
};


/**
 * generatePlaylist
 *
 */
var generatePlaylist = function( camId, videos, targetDuration, mediaSequence, closed, cb ) {
    
    console.log("generate playlist");

    var content = "#EXTM3U\n" +
                  "#EXT-X-VERSION:3\n" +        
                  "#EXT-X-PLAYLIST-TYPE:VOD\n" +   
                  "#EXT-X-ALLOW-CACHE:YES\n" +
                  "#EXT-X-TARGETDURATION:" + targetDuration + "\n" +
                  "#EXT-X-MEDIA-SEQUENCE:" + mediaSequence + "\n";

    for ( var i = 0; i < videos.length; i++ ) {
        content = content + "#EXTINF:" + videos[i].duration + ".0,\n";
        content = content + "/ts/" + camId + "/" + path.basename(videos[i].url) + "\n";
    }

    if ( closed ) {
        content = content + "#EXT-X-ENDLIST\n";
    }

    console.log( content );

    cb( content );
};
// - - end of generatePlaylist
// - - - - - - - - - - - - - - - - - - - -

var sortVideosByIndex = function( a, b ) {
    if (a.index < b.index) {
        return -1;
    } else if (a.index > b.index) {
        return 1;
    } else {
        return 0;
    }
};

var sortVideosByName = function( a, b ) {
    
    //console.log("sorting by name");
    var aName = path.basename(a.url);
    var bName = path.basename(b.url);
    //console.log(aName + " < " + bName + " : " + (aName < bName));

    if (aName < bName) {
        return -1;
    } else if (aName > bName) {
        return 1;
    } else {
        return 0;
    }
};


var calculateLengthsAsync = function(files, list, cb) {
    var file = files.shift();     
    if (file) {
        ffmpeg.calcDuration( file, function(duration, f) {
            list.push({
                url: path.basename(f),
                duration: duration/1000.0
            });
            
            calculateLengthsAsync(files, list, cb);
        });
    } else {
        cb( list.sort( sortVideosByName ) );
    }
};

/**
 * calculateLengths
 *
 */
var calculateLengths = function( files, cb ) {

    console.log("calculateLengths");

    var running = 0;
    var limit = 5;

    var videos = [];

    var count = 0;
    
    calculateLengthsAsync( files, videos, cb );
};
// - - end of calculateLengths
// - - - - - - - - - - - - - - - - - - - -


// exports
exports.generatePlaylist = generatePlaylist;
exports.livePlaylist = livePlaylist;
exports.calculateLengths = calculateLengths;


