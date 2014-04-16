//
// hls.js
//
// module for handling hls streams
// 

var path = require('path');
var ffmpeg = require('./ffmpeg');


var generateLivePlaylist = function( streamId, cb ) {

    var content = "#EXTM3U\n" +
                  "#EXT-X-VERSION:3\n" +         
                  "#EXT-X-ALLOW-CACHE:YES\n" +
                  "#EXT-X-TARGETDURATION:1\n" +
                  "#EXT-X-MEDIA-SEQUENCE:0\n";
	var duration = 1;
	content = content + "#EXTINF:1,\n";
	content = content + "ts/" + streamId + "/live.ts\n";
    
    cb( content );
};


/**
 * generatePlaylist
 *
 */
var generatePlaylist = function( camId, streamId, videos, targetDuration, mediaSequence, closed, cb ) {

    var content = "#EXTM3U\n" +
                  "#EXT-X-VERSION:3\n" +         
                  "#EXT-X-ALLOW-CACHE:YES\n" +
                  "#EXT-X-TARGETDURATION: 30\n" +
                  "#EXT-X-MEDIA-SEQUENCE:0\n";

    for ( var i = 0; i < videos.length; i++ ) {
		var duration = (videos[i].end - videos[i].start)/1000.0;

		if (duration > 100) {
			console.error("[hls] invalid chunk duration, defaulting to 10s");
		}

		content = content + "#EXTINF:" + duration + ",\n";
		content = content + "ts/" + streamId + "/" + path.basename(videos[i].file) + "\n";
	}

	if ( closed ) {
		content = content + "#EXT-X-ENDLIST\n";
	}

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
    
    var aName = path.basename(a.url);
    var bName = path.basename(b.url);
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
        //ffmpeg.calcDuration( file, function(duration, f) {
        //    list.push({
        //        url: f,
        //        duration: duration/1000.0
        //    });
        
		list.push({
			url: file,
			duration: 15
		});
            calculateLengthsAsync(files, list, cb);
        
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
exports.generateLivePlaylist = generateLivePlaylist;
exports.calculateLengths = calculateLengths;


