var hls = require('./../helpers/hls');

// var cache = [];

function generateFinitePlaylist( db, camId, streamId, begin, end, cb ) {

// 	console.error('============');
// 	console.error('cache length: ' + cache.length);
// 	console.error('============');
// 	
// 	var ch = cache[camId + '::' + streamId];
//
// 	if ( ch && ch.begin == begin && ch.end == end  && Date.now() - ch.time < ch.ttl) {
// 		// console.error("***** cached response *****")
// 		cb (ch.data);
// 		return;
// 	}
// 	
// 	console.error("***** NOT a cached response *****")
// 	cache[camId + '::' + streamId] = {};
// 	ch = cache[camId + '::' + streamId];
// 	ch.time = Date.now();
// 	ch.ttl = 15000;
// 	ch.begin = begin;
// 	ch.end = end;

    db.searchVideosByInterval( begin, end, function( err, videoList, offset ) {
        if (err){
            console.log("searchVideosByInterval");
            console.log(err);
        }
        //var fileList = videoList.map( function(video) {
        //    return video.file;
        //});

        //hls.calculateLengths( fileList, function(videos) {
            hls.generatePlaylist( camId, streamId, videoList, 20, 0, true, function(playlist) {
				// ch.data = playlist;
                cb( playlist );
            });
       // });
    });
}


function generateLivePlaylist( streamId, cb ) {
	hls.generateLivePlaylist( streamId, function(playlist) {
		if (cb) cb(playlist);
	});
}


exports.generateFinitePlaylist = generateFinitePlaylist;
exports.generateLivePlaylist = generateLivePlaylist;

