'use strict';

var fs    = require('fs-extra'),
    path  = require('path'),
    spawn = require('child_process').spawn

var TMP_DIR    = path.resolve( './tmp-downloads' ),
    VIDEO_FILE = path.resolve( TMP_DIR, 'tmp_video_for_download'),
    SRT_FILE   = path.resolve( TMP_DIR, 'tmp_subs_for_download');

var MIN_REQ_INTERVAL_MS = 2*60*1000,    // minimum interval between requests that are not cached
    CACHE_TTL_MS        = 60*60*1000;   // maximum interval to delete cached files and reset state

var States = {
    READY:    'ready',
    BUSY:     'busy',
    LOADING:  'loading',  
    ERROR:    'error'
};

var state         = States.LOADING,     // current state
    cachedRequest = {},                 // current cached request
    cleanTimeout  = null;               // folder cleanup timeout


/**
 * prepareDir
 *
 * create (if necessary) TMP_DIR used to store the tmp files to be downloaded
 * deletes previous tmp files in the folder
 *
 * @param { Function } cb  callback( err )
 * 		- err (String):  error message, null if none
 */
var prepareDir = function( cb ) {

    console.log('[cached-downloads]  preparing folder ' + TMP_DIR);
    fs.ensureDir( TMP_DIR, function(err) {
        if (err) {
            console.error('[cached-downloads : prepareDir] ' + err);  
            return cb( err );
        }
        cleanDir( cb );            
    });
};


/**
 * setCache
 *
 * set cache with given file list
 * only the first and last file names, the length and the format are stored in the cache
 *
 * @param { string } fileList  array containing full path of segments
 */
var setCache = function( fileList, format ) {

    if ( !fileList || !fileList.length) { 
        console.error('[cached-downloads : setCache]  invalid list of files');
        return;
    }

    cachedRequest = {
        firstSegment:  fileList[0],
        lastSegment:   fileList[ fileList.length -1 ],
        nSegments:     fileList.length,
        format:        format
    };
};


/**
 * resetCachedRequest
 *
 * reset cached request (does not delete cached files - see 'cleanDir')
 */
var resetCachedRequest = function() {

    cachedRequest = {
        firstSegment:  null,        // first element on the list of segments
        lastSegment:   null,        // last     "    "   "   "   "     "
        nSegments:     null,        // length of list of segments
        format:        null         // avi / mp4
    };
};


/**
 * cleanDir
 *
 * delete tmp video and srt files in TMP_DIR
 *
 * @param { Function } cb  callback( err )
 * 		- err (String):  error message, null if none
 */
var cleanDir = function( cb ) {

    resetCachedRequest();

    console.log('[cached-downloads : clearnDir ]  cleaning folder ' + TMP_DIR);
    fs.unlink( VIDEO_FILE, function(err) {
        if (err) { console.error( '[cached-downloads : cleanDir]  ' + err ); }
        fs.unlink( SRT_FILE, function(err) {
            if (err) { console.error( '[cached-downloads : cleanDir]  ' + err ); }
            if ( cb ) { cb(); }
        });
    });
};


/**
 * launch
 *
 * initialize folder and states
 *
 * @param { Function } cb  callback( err )
 * 		- err (String):  error message, null if none
 */
var launch = function( cb ) {

    resetCachedRequest();

    prepareDir( function(err) {

        if (err) {      

            // if there's error preparing folder,
            // service won't be available
            state = States.ERROR;
            if (cb) { cb(err); }

            return;
        } 

        state = States.READY;
        if (cb) { cb(); }
    });
};


/**
 * getVideo
 *
 * sends response according to current state;
 * if READY or BUSY but cached, download file
 *
 * @param { Array } fileList    list of segments to be concatenated
 * @param { String } filename   output filename (without extension)
 * @param { String } format     output format ( avi / mp4 )
 * @param { object } res        Response object
 */
var getVideo = function( fileList, filename, format, res ) {

    switch( state ) {
        case States.ERROR:
            res.status(500).end('cached downloads service could not be launched');
            break;

        case States.BUSY:
            if ( isCached( fileList, format ) ) {
                downloadVideo( fileList, filename, format, res );
            } else {
                res.status(429).end('cached downloads service is busy');
            }
            break;

        case States.LOADING:
            res.status(423).end('cached downloads service is not ready yet');
            break;

        case States.READY:
            downloadVideo( fileList, filename, format, res );
            break;
    }
};


/**
 * prepareSubs
 *
 * generate srt file on disk
 *
 * @param { Array } fileList    list of segments to be concatenated
 * @param { Function } cb       callback when done
 */
var prepareSubs = function( fileList, cb ) {
    
    var srtStream = fs.createWriteStream( SRT_FILE ),
        gensubs = spawn('./gensubs', fileList );

    gensubs.stdout.pipe( srtStream );

    var err_msg = '';

    gensubs.stderr.on('data', function(d) {
        err_msg += d.toString();
    });

    // TODO: update gensubs code to return exit codes
    gensubs.on('exit', function() {
        if (err_msg) {
            console.error('[cached-downloads : prepareSubs]  ' + err_msg);
        } else {
            console.log('[cached-downloads : prepareSubs]  done preparing subs');
        }

        if (cb) { cb( err_msg ); }
    });
};


/**
 * prepareVideo
 *
 * generate video file on disk
 *
 * @param { Array } fileList        list of segments to be concatenated
 * @param { String } format         desired format (avi / mp4)
 * @param { boolean } embed_subs    embed subs? (mp4 only)
 * @param { Function } cb           callback when done
 */
var prepareVideo = function( fileList, format, embed_subs, cb ) {
    
    var args = [
        '-y',
        '-i', 'concat:' + fileList.join('|'),
        '-loglevel', 'error'
    ];

    if (format == 'mp4' && embed_subs) {
        args.push(
            '-f', 'srt',
            '-i', SRT_FILE,
            '-c:s', 'mov_text'
        );
    }

    args.push( 
        '-an',
        '-c:v', 'copy',
        '-f', format, VIDEO_FILE 
    );

    var ffmpegProcess = spawn('./ffmpeg', args);

    var err_msg = '';

    ffmpegProcess.stderr.on('data', function(d) {
        err_msg += d.toString();
    });
    ffmpegProcess.stdout.on('data', function(d) {
        // we can optionally parse ffmpeg messages here
    });

    ffmpegProcess.on('exit', function( exit_code ) {
        if (exit_code != 0) {
            console.error('[cached-downloads : prepareVideo]  ' + err_msg);
            if (cb) { cb(err_msg); }
        } else {
            if (cb) { cb(); }
        }
    });
};


/**
 * triggerCleanDirTimeout
 *
 * set timeout to clean dir and set state to READY after 't' ms
 *
 * @param { Number } t  time in ms
 */
var triggerCleanDirTimeout = function( t ) {

    console.log('[cached-downloads]  cleaning folder in ' + t + ' ms');

    clearTimeout( cleanTimeout );

    cleanTimeout = setTimeout( function() {
       cleanDir( function() {
           state = States.READY;
       }); 
    }, t);
};


/**
 * downloadVideo
 *
 * sends cached video file to response, generating it if necessary,
 * then triggers timeout to clear cache and resets state to READY
 * files will only be effectively deleted if there are no requests for
 * the same video in more than MIN_REQ_INTERVAL_MS or, worst case, CACHE_TTL_MS
 *
 * @param { Array } fileList    list of segments to be concatenated
 * @param { String } filename   desired filename (without extension)
 * @param { String } format     desired format (avi / mp4)
 * @param { Function } res      Response object
 */
var downloadVideo = function( fileList, filename, format, res ) {

    state = States.BUSY;

    if ( isCached( fileList, format ) ) {
        return sendFile( filename, res );
    }

    prepareSubs( fileList, function(subs_err) {
        if (subs_err) { 
            console.error('[cached-downloads : downloadVideo]  error when generating subtitles; video will not have subs');
        }
        prepareVideo( fileList, format, !subs_err, function(err) {
            // reset timer and make sure the folder will be eventually cleaned
            triggerCleanDirTimeout( CACHE_TTL_MS );

            if (err) { return res.status(500).end(err); }

            setCache( fileList, format );
            sendFile( filename, res );
        });
    });
};


/**
 * isCached
 *
 * checks if response is cached
 *
 * @param { Array } fileList    list of segments to be concatenated
 * @param { String } format     desired format (avi / mp4)
 *
 * @returns { Boolean }
 */
var isCached = function( fileList, format ) {

    if ( !fileList || !fileList.length ) {
        return false;
    }

    return ( fileList[0] == cachedRequest.firstSegment )
        && ( fileList[ fileList.length - 1 ] == cachedRequest.lastSegment )
        && ( fileList.length == cachedRequest.nSegments )
        && ( format == cachedRequest.format );
};


/**
 * downloadVideo
 *
 * sends cached video file to response, generating it if necessary,
 * then trigger timeout to clear cache and reset state to READY
 *
 * @param { String } filename   desired filename in response (without extension)
 * @param { Function } res      Response object
 */
var sendFile = function( filename, res ) {

    res.set( 'Content-disposition', 'attachment; filename=' + filename);

    res.sendfile( VIDEO_FILE, function(err) {
        triggerCleanDirTimeout( MIN_REQ_INTERVAL_MS );
        if (err) {
            console.error('[cached-downloads : sendFile]  ' + err);
            return res.status(500).end('error when sending file');
        } else {
            console.log('[cached-downloads : sendFile]  download finished');
        }
    });
};


/**
 * launch service
 */
launch();


/** 
 * exports
 */
exports.getVideo = getVideo;
