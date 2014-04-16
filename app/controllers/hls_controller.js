var hls = require('./../helpers/hls');

function generateFinitePlaylist( db, camId, streamId, begin, end, cb ) {

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

