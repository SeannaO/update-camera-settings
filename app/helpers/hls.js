//
// hls.js
//
// module for handling hls streams
// 

var path = require('path');
var ffmpeg = require('./ffmpeg');


var generateLivePlaylistPipe = function( streamId, cb ) {

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

var generateLivePlaylistStandard = function( streamId, latestChunks, counter, length, cb ) {

	latestChunks = latestChunks || [];
	counter = counter || 0;

    var content = "#EXTM3U\n" +
                  "#EXT-X-VERSION:3\n" +         
                  "#EXT-X-TARGETDURATION:{TARGETDURATION}\n" +
                  "#EXT-X-MEDIA-SEQUENCE:{MEDIASEQUENCE}\n";

	var targetDuration = 0;
	var list = "";

	for (var i in latestChunks) {
		var c = latestChunks[i];
		list = list + "#EXTINF:" + (c.duration/1000) + ",\n";
		list = list + "ts/" + streamId + "/" + c.name + "\n";
		if (c.duration > targetDuration) { targetDuration = c.duration; }
	}

	targetDuration = targetDuration ? Math.round( targetDuration/1000.0 ) + 5 : 0;

	content = content.replace('{TARGETDURATION}', targetDuration);
	content = content.replace('{MEDIASEQUENCE}', counter);
	content += list;
    
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
                  "#EXT-X-TARGETDURATION:30\n" +
                  "#EXT-X-MEDIA-SEQUENCE:0\n";

	if (!videos) {
		cb( content );
		return;
	}

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
exports.generateLivePlaylistStandard = generateLivePlaylistStandard;
exports.generateLivePlaylistPipe = generateLivePlaylistPipe;
exports.calculateLengths = calculateLengths;


