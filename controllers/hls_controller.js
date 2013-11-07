var hls = require('./../helpers/hls');

function generateFinitePlaylist( db, camId, begin, end, cb ) {
   
    console.log("generate finite play list");

    db.searchVideosByInterval( camId, begin, end, function( err, videoList, offset ) {
        
        var fileList = videoList.map( function(video) {
            return video.file;
        });

        hls.calculateLengths( fileList, function(videos) {
            hls.generatePlaylist( camId, videos, 20, 0, true, function(playlist) {
                cb( playlist );
            });
        });
    });
}


function generateLivePlaylist( db, req, res ) {

    var begin = 0;
    var end = Date.now();
    
    console.log( Date.now() );
    if ( isNaN( begin ) ) {
        res.end("invalid time");
        return;
    }
    
    if ( isNaN(parseInt(req.session.mediaSequence, 10)) ) {
        req.session.mediaSequence = 0;
    }

    res.writeHead( 200, { "Content-Type":"application/x-mpegURL" } );

    db.searchVideosByInterval( begin, end, function( err, videoList, offset ) {
                        
        var fileList = videoList.map( function(video) {
            return video.file;
        });

        hls.calculateLengths( fileList, function(videos) {
            hls.livePlaylist(videos, 12, 0, function(playlist) {
                res.end(playlist);
                req.session.mediaSequence = req.session.mediaSequence + 1;
            });
        });
    });    

}


exports.generateFinitePlaylist = generateFinitePlaylist;
exports.generateLivePlaylist = generateLivePlaylist;

