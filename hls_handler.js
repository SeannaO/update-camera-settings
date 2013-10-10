var hls = require('./hls');

function generateFinitePlaylist( db, camId, begin, end, cb ) {
   
    db.searchVideosByInterval( camId, begin, end, function( err, videoList, offset ) {

        // videoList = videoList.reverse();
   //     console.log(videoList);
        
        var fileList = videoList.map( function(video) {
            return video.file;
        });

        
        //res.writeHead(200, { 
        //    "Content-Type":"application/x-mpegURL", 
        //    'content-length': 0 
        //});
        ///res.setHeader("Content-Type","application/x-mpegURL");

        hls.calculateLengths( fileList, function(videos) {
            //console.log("*** lengths");
            //console.log(fileList);
            //console.log(videos);
            hls.generatePlaylist(videos, 12, 0, true, function(playlist) {
                console.log("*** playlist");
                console.log(playlist);
                //res.setHeader("content-length", playlist.length);
                
                cb( playlist );
                //res.write(playlist);
                //res.end();
                console.log("playlist length: " + Buffer.byteLength(playlist) );
                //return;
            });
            //res.end("error when trying to generate m3u8 list");
        });
    });
}


function generateLivePlaylist( db, req, res ) {
    var begin = 0;
    //var end = begin + req.session.end;
    var end = Date.now();
    
    console.log( Date.now() );
    if ( isNaN( begin ) ) {
        res.end("invalid time");
        return;
    }
    
    if ( isNaN(parseInt(req.session.mediaSequence)) ) {
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

