'use strict';

var fs    = require('fs-extra'),
    path  = require('path'),
    spawn = require('child_process').spawn

var TMP_DIR = path.resolve( './tmp-downloads' );

var MIN_REQ_INTERVAL_MS = 5*60*1000,    // minimum interval between requests that are not cached
    CACHE_TTL_MS        = 60*60*1000;   // maximum interval to delete cached files and reset state

var States = {
    READY:    'ready',
    BUSY:     'busy',
    LOADING:  'loading',  
    ERROR:    'error'
};


var CachedDownloads = function() {

    if (!CachedDownloads.instancesCounter) {
        CachedDownloads.instancesCounter = 1;
    } else {
        CachedDownloads.instancesCounter++;
    }

    this._id = CachedDownloads.instancesCounter;

    this.VIDEO_FILE = path.resolve( TMP_DIR, 'tmp_video_for_download_' + this._id );
    this.SRT_FILE   = path.resolve( TMP_DIR, 'tmp_subs_for_download_' + this._id );

    this._state         = States.LOADING,    // current state
    this._cachedRequest = {};                // current cached request
    this._cleanTimeout  = null;              // folder cleanup timeout

    this.launch();
};


/**
 * prepareDir
 *
 * create (if necessary) TMP_DIR used to store the tmp files to be downloaded
 * deletes previous tmp files in the folder
 *
 * @param { Function } cb  callback( err )
 * 		- err (String):  error message, null if none
 */
CachedDownloads.prototype.prepareDir = function( cb ) {

    var self = this;

    console.log('[cached-downloads]  preparing folder ' + TMP_DIR);
    fs.ensureDir( TMP_DIR, function(err) {
        if (err) {
            console.error('[cached-downloads : prepareDir] ' + err);  
            return cb( err );
        }
        self.cleanDir( cb );            
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
CachedDownloads.prototype.setCache = function( fileList, format ) {

    if ( !fileList || !fileList.length) { 
        console.error('[cached-downloads : setCache]  invalid list of files');
        return;
    }

    this._cachedRequest = {
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
CachedDownloads.prototype.resetCachedRequest = function() {

    this._cachedRequest = {
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
CachedDownloads.prototype.cleanDir = function( cb ) {

    var self = this;

    this.resetCachedRequest();

    console.log('[cached-downloads : cleanDir]  cleaning folder ' + TMP_DIR);
    fs.unlink( this.VIDEO_FILE, function(err) {
        if (err) { console.error( '[cached-downloads : cleanDir]  ' + err ); }
        fs.unlink( self.SRT_FILE, function(err) {
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
CachedDownloads.prototype.launch = function( cb ) {

    var self = this;

    this.resetCachedRequest();

    this.prepareDir( function(err) {

        if (err) {      

            // if there's error preparing folder,
            // service won't be available
            self._state = States.ERROR;
            if (cb) { cb(err); }

            return;
        } 

        self._state = States.READY;

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
CachedDownloads.prototype.getVideo = function( fileList, filename, format, res ) {

    switch( this._state ) {
        case States.ERROR:
            res.status(500).end('cached downloads service could not be launched');
            break;

        case States.BUSY:
            if ( this.isCached( fileList, format ) ) {
                this.downloadVideo( fileList, filename, format, res );
            } else {
                res.status(429).end('cached downloads service is busy');
            }
            break;

        case States.LOADING:
            res.status(423).end('cached downloads service is not ready yet');
            break;

        case States.READY:
            this.downloadVideo( fileList, filename, format, res );
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
CachedDownloads.prototype.prepareSubs = function( fileList, cb ) {
    
    var srtStream = fs.createWriteStream( this.SRT_FILE ),
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
CachedDownloads.prototype.prepareVideo = function( fileList, format, embed_subs, cb ) {
    
    var args = [
        '-y',
        '-i', 'concat:' + fileList.join('|'),
        '-loglevel', 'error'
    ];

    if (format == 'mp4' && embed_subs) {
        args.push(
            '-f', 'srt',
            '-i', this.SRT_FILE,
            '-c:s', 'mov_text'
        );
    }

    args.push( 
        '-an',
        '-c:v', 'copy',
        '-f', format, this.VIDEO_FILE 
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
CachedDownloads.prototype.triggerCleanDirTimeout = function( t ) {

    var self = this;

    console.log('[cached-downloads]  cleaning folder in ' + t + ' ms');

    clearTimeout( this._cleanTimeout );

    this._cleanTimeout = setTimeout( function() {
       self.cleanDir( function() {
           self._state = States.READY;
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
CachedDownloads.prototype.downloadVideo = function( fileList, filename, format, res ) {

    var self = this;

    this._state = States.BUSY;

    if ( this.isCached( fileList, format ) ) {
        return this.sendFile( filename, res );
    }

    this.prepareSubs( fileList, function(subs_err) {
        if (subs_err) { 
            console.error('[cached-downloads : downloadVideo]  error when generating subtitles; video will not have subs');
        }
        self.prepareVideo( fileList, format, !subs_err, function(err) {
            // reset timer and make sure the folder will be eventually cleaned
            self.triggerCleanDirTimeout( CACHE_TTL_MS );

            if (err) { return res.status(500).end(err); }

            self.setCache( fileList, format );
            self.sendFile( filename, res );
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
CachedDownloads.prototype.isCached = function( fileList, format ) {

    if ( !fileList || !fileList.length ) {
        return false;
    }

    return ( fileList[0] == this._cachedRequest.firstSegment )
        && ( fileList[ fileList.length - 1 ] == this._cachedRequest.lastSegment )
        && ( fileList.length == this._cachedRequest.nSegments )
        && ( format == this._cachedRequest.format );
};


/**
 * sendFile
 *
 * sends cached video file to response, generating it if necessary,
 * then trigger timeout to clear cache and reset state to READY
 *
 * @param { String } filename   desired filename in response (without extension)
 * @param { Function } res      Response object
 */
CachedDownloads.prototype.sendFile = function( filename, res ) {

    var self = this;

    res.set( 'Content-disposition', 'attachment; filename=' + filename);

    res.sendfile( this.VIDEO_FILE, function(err) {
        self.triggerCleanDirTimeout( MIN_REQ_INTERVAL_MS );
        if (err) {
            console.error('[cached-downloads : sendFile]  ' + err);
            return res.status(500).end('error when sending file');
        } else {
            console.log('[cached-downloads : sendFile]  download finished');
        }
    });
};


CachedDownloads.prototype.getState = function() {
    return this._state;
};

CachedDownloads.States = States;

/** 
 * exports
 */
module.exports = CachedDownloads;
