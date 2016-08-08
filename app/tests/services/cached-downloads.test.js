var assert       = require('assert');
var sinon        = require('sinon');
var _            = require('lodash');
var fs           = require('fs-extra');
var util         = require('util');
var EventEmitter = require('events').EventEmitter;
var childProcess = require('child_process');
var path         = require('path');

var CachedDownloads = require('../../services/cached-downloads');

describe('CachedDownloads', function() {

    describe('constructor', function() {

        var s_1,
            s_2;

        before( function() {
            fs.removeSync( CachedDownloads.TMP_DIR );
        });

        after( function() {
            delete CachedDownloads.instancesCounter;
            clearTimeout( s_1._cleanTimeout );
            clearTimeout( s_2._cleanTimeout );
        });

        it('should set initial values and folder correctly', function( done ) {

            assert.equal( CachedDownloads.instancesCounter, null );
            assert.ok( !fs.existsSync( CachedDownloads.TMP_DIR ) );

            var s = new CachedDownloads( function() {
                assert.equal( CachedDownloads.instancesCounter, 1 );
                assert.ok( fs.existsSync( CachedDownloads.TMP_DIR ) );
                assert.equal( s._id, 1 );
                assert.equal( s._state, CachedDownloads.States.READY );
                assert.equal( Object.keys( s._cachedRequest ).length, 4 );

                for (var i in s._cachedRequest) {
                    assert.equal( s._cachedRequest[i], null );
                }
                done();
            });

            assert.equal( s._state, CachedDownloads.States.LOADING );
            s_1 = s;
        });


        it('should increment instancesCounter', function() {

            var s = new CachedDownloads();

            assert.equal( s._id, 2 );
            assert.equal( CachedDownloads.instancesCounter, 2 );
            s_2 = s;
        });
    });


    describe('constructor #2', function() {

        var s_1;

        before( function() {
            fs.removeSync( CachedDownloads.TMP_DIR );
            fs.ensureFileSync( CachedDownloads.TMP_DIR );
        });

        after( function() {
            delete CachedDownloads.instancesCounter;
            clearTimeout( s_1._cleanTimeout );
            fs.removeSync( CachedDownloads.TMP_DIR );
        });

        it('should set state to ERROR if unable to setup folder', function(done) {

            s_1 = new CachedDownloads( function(err) {
                assert.ok(err);
                assert.equal( s_1._state, CachedDownloads.States.ERROR );
                done();
            });
            
            assert.equal( s_1._id, 1 );
        });
    });


    /**
    * setCache
    *
    * set cache with given file list
    * only the first and last file names, the length and the format are stored in the cache
    *
    * @param { string } fileList  array containing full path of segments
    */
    describe('setCache', function() {

        var s_1;

        before( function(done) {
            s_1 = new CachedDownloads( function(err) {
                assert.equal(err, null);
                done();
            });
        });

        after( function() {
            delete CachedDownloads.instancesCounter;
            clearTimeout( s_1._cleanTimeout );
        });

        it('should reject invalid fileList', function() {

            assertEmptyCachedRequest( s_1._cachedRequest );

            var err = s_1.setCache( null, 'x' );
            assert.ok( err );

            err = s_1.setCache( [], 'x' );
            assert.ok( err );

            assertEmptyCachedRequest( s_1._cachedRequest );

        });

        it('should set cache properly', function() {

            assertEmptyCachedRequest( s_1._cachedRequest );

            var err = s_1.setCache( ['a', 'b', 'c', 'd'], 'x' );
            assert.ok( !err );
            
            assert.equal( s_1._cachedRequest.firstSegment, 'a' );
            assert.equal( s_1._cachedRequest.lastSegment, 'd' );
            assert.equal( s_1._cachedRequest.nSegments, 4 );
            assert.equal( s_1._cachedRequest.format, 'x' );

            var err = s_1.setCache( ['a'], 'y' );
            assert.ok( !err );

            assert.equal( s_1._cachedRequest.firstSegment, 'a' );
            assert.equal( s_1._cachedRequest.lastSegment, 'a' );
            assert.equal( s_1._cachedRequest.nSegments, 1 );
            assert.equal( s_1._cachedRequest.format, 'y' );
        });
    });


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
    describe('getVideo', function() {

        var s_1;

        before( function(done) {
            s_1 = new CachedDownloads( function(err) {
                assert.equal(err, null);
                done();
            });
        });

        after( function() {
            delete CachedDownloads.instancesCounter;
            clearTimeout( s_1._cleanTimeout );
        });


        it('should respond properly when in ERROR state', function(done) {
            var res = createResponseObject({
                status_cb: function(s) {
                    assert.equal(s, 500);
                },
                end_cb: function(d) {
                    assert.ok( d.indexOf('could not be launched') > 0 );
                    done();
                }
            });
             
            s_1._state = CachedDownloads.States.ERROR;
            s_1.getVideo( ['1','2'], 'filename', 'format', res );
        });


        it('should respond properly when in LOADING state', function(done) {
            var res = createResponseObject({
                status_cb: function(s) {
                    assert.equal(s, 423);
                },
                end_cb: function(d) {
                    assert.ok( d.indexOf('not ready yet') > 0 );
                    done();
                }
            });
             
            s_1._state = CachedDownloads.States.LOADING;
            s_1.getVideo( ['1','2'], 'filename', 'format', res );
        });


        it('should respond properly when in LOADING state', function(done) {
            var res = createResponseObject({
                status_cb: function(s) {
                    assert.equal(s, 423);
                },
                end_cb: function(d) {
                    assert.ok( d.indexOf('not ready yet') > 0 );
                    done();
                }
            });
             
            s_1._state = CachedDownloads.States.LOADING;
            s_1.getVideo( ['1','2'], 'filename', 'format', res );
        });


        it('should call downloadVideo with proper params when in READY state', function( done ) {

            var fileList = ['1','2','3'],
                filename = 'a_filename',
                format = 'a_format',
                res = {};

            s_1.downloadVideo = function( a, b, c, d, e ) {

                assert.equal( a, fileList );
                assert.equal( b, filename );
                assert.equal( c, format );
                assert.equal( d, res );

                assert.equal( s_1._state, CachedDownloads.States.READY );
                done();
            };

            var downloadVideoSpy = sinon.spy( s_1, 'downloadVideo' );

            s_1._state = CachedDownloads.States.READY;
            s_1.getVideo( fileList, filename, format, res );
        });


        it('should call downloadVideo with proper params when BUSY but cached', function(done) {
            
            var fileList = ['1','2','3'],
                filename = 'a_filename',
                format = 'a_format',
                res = {};

            s_1.downloadVideo = function( a, b, c, d, e ) {

                assert.equal( a, fileList );
                assert.equal( b, filename );
                assert.equal( c, format );
                assert.equal( d, res );

                assert.equal( s_1._state, CachedDownloads.States.BUSY );
                done();
            };

            s_1._state = CachedDownloads.States.BUSY;
            s_1.setCache( fileList, format );

            s_1.getVideo( fileList, filename, format, res );
        });

        
        it('should return proper response and not call downloadVideo if BUSY and not cached', function(done) {

            var downloadVideoCalled = false;

            var fileList = ['1','2','3'],
                filename = 'a_filename',
                format = 'a_format',
                res = {};

            s_1.downloadVideo = function() {
                downloadVideoCalled = true;
            };

            var res = createResponseObject({
                status_cb: function(s) {
                    assert.equal(s, 429);
                },
                end_cb: function(d) {
                    assert.ok( d.indexOf('is busy') > 0 );
                    assert.ok( !downloadVideoCalled );
                    done();
                }
            });

            s_1._state = CachedDownloads.States.BUSY;
            s_1.setCache( fileList, format );

            s_1.getVideo( ['1', '2'], filename, format, res );
        });
    });

    
    /**
    * triggerCleanDirTimeout
    *
    * set timeout to clean dir and set state to READY after 't' ms
    *
    * @param { Number } t  time in ms
    */
    describe('triggerCleanDirTimeout', function() {

        var s_1;

        before( function(done) {
            s_1 = new CachedDownloads( function(err) {
                assert.equal(err, null);
                done();
            });

        });

        after( function() {
            delete CachedDownloads.instancesCounter;
            clearTimeout( s_1._cleanTimeout );
        });


        it('should delete files after the specified time and set state to READY', function( done ) {

            this.timeout( 5000 );

            var t = 500;

            fs.ensureFileSync( s_1.VIDEO_FILE );
            fs.ensureFileSync( s_1.SRT_FILE );

            assert.ok( fs.existsSync( s_1.VIDEO_FILE ) );
            assert.ok( fs.existsSync( s_1.SRT_FILE ) );

            clearTimeout( s_1._cleanTimeout );
            assert.ok( !s_1._cleanTimeout );

            s_1._state = CachedDownloads.States.BUSY;

            s_1.triggerCleanDirTimeout( t );
            assert.ok( s_1._cleanTimeout );

            // files should still exist before the timeout
            setTimeout( function() {

                assert.ok( fs.existsSync( s_1.VIDEO_FILE ) );
                assert.ok( fs.existsSync( s_1.SRT_FILE ) );
                assert.equal( s_1._state, CachedDownloads.States.BUSY );

            }, t - 50 );

            // files should no longer exist before the timeout
            setTimeout( function() {

                assert.ok( !fs.existsSync( s_1.VIDEO_FILE ) );
                assert.ok( !fs.existsSync( s_1.SRT_FILE ) );
                assert.equal( s_1._state, CachedDownloads.States.READY );

                done();

            }, t + 50);
        });
    });


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
    describe('isCached', function() {

        var s1;

        before( function(done) {
            s1 = new CachedDownloads( function(err) {
                assert.equal(err, null);
                done();
            });

        });

        after( function() {
            delete CachedDownloads.instancesCounter;
            clearTimeout( s1._cleanTimeout );
        });


        it('should return false if params are not correct', function() {

            var r = s1.isCached( null, null);
            assert.ok( !r );

            r = s1.isCached( null, 'x');
            assert.ok( !r );

            r = s1.isCached( [], 'x');
            assert.ok( !r );
        });


        it('should return true if and only if request is cached', function() {

            s1.setCache( ['f1','f2','f3'], 'fmt' );

            var r = s1.isCached( ['f1','f3'], 'fmt' );
            assert.ok( !r );

            r = s1.isCached( ['f1','f2'], 'fmt' );
            assert.ok( !r );

            r = s1.isCached( ['f1'], 'fmt' );
            assert.ok( !r );

            r = s1.isCached( ['f1'], 'fmt' );
            assert.ok( !r );

            r = s1.isCached( ['f1', 'f2', 'f3'], 'fmt2' );
            assert.ok( !r );

            r = s1.isCached( ['f1', 'f2', 'f3'], 'fmt' );
            assert.ok( r );
        });
    });
    

    describe('getState', function() {

        var s1;

        before( function(done) {
            s1 = new CachedDownloads( function(err) {
                assert.equal(err, null);
                done();
            });

        });

        after( function() {
            delete CachedDownloads.instancesCounter;
            clearTimeout( s1._cleanTimeout );
        });


        it('should return correct state', function() {
            for (var i in CachedDownloads.States) {
                s1._state = CachedDownloads.States[i];
                assert.equal( CachedDownloads.States[i], s1.getState() );
            }
        });
    });


    /**
    * sendFile
    *
    * sends cached video file to response, generating it if necessary,
    * then trigger timeout to clear cache and reset state to READY
    *
    * @param { String } filename   desired filename in response (without extension)
    * @param { Function } res      Response object
    */
    describe('sendFile', function() {

        var s1;

        before( function(done) {
            s1 = new CachedDownloads( function(err) {
                assert.equal(err, null);
                done();
            });

        });

        after( function() {
            delete CachedDownloads.instancesCounter;
            clearTimeout( s1._cleanTimeout );
        });


        it('should set header correctly, trigger clean dir timeout and call sendFile on response with the correct params', function(done) {

            var filename = 'a_video_file.vid';
            
            s1.triggerCleanDirTimeout = function(t) {
                assert.equal( t, 5*60*1000 );
                done();
            };

            var res = createResponseObject({
                set_cb: function(h1, h2) {
                    assert.equal( h1, 'Content-disposition' );
                    assert.equal( h2, 'attachment; filename=' + filename );
                },
                sendfile_cb: function(f, cb) {
                    assert.equal( f, s1.VIDEO_FILE );
                    cb();
                }
            });

           s1.sendFile( filename, res ); 
        });


        it('should handle errors correctly', function(done) {

            var filename = 'a_video_file.vid';
            var timeoutSet = false;
            
            s1.triggerCleanDirTimeout = function(t) {
                assert.equal( t, 5*60*1000 );
                timeoutSet = true;
            };

            var res = createResponseObject({
                set_cb: function(h1, h2) {
                    assert.equal( h1, 'Content-disposition' );
                    assert.equal( h2, 'attachment; filename=' + filename );
                },
                status_cb: function(d) {
                    assert.equal(d, 500);
                },
                end_cb: function(d) {
                    assert.equal(d, 'error when sending file');
                    assert.ok( timeoutSet );
                    done();
                },
                sendfile_cb: function(f, cb) {
                    assert.equal( f, s1.VIDEO_FILE );
                    cb('some_error');
                }
            });

            s1.sendFile( filename, res ); 
        });


        it('should trigger clean dir timeout when response emits close event', function(done) {

            var filename = 'a_video_file.vid';
            
            s1.triggerCleanDirTimeout = function(t) {
                assert.equal( t, 5*60*1000 );
                done();
            };

            var res = createResponseObject({
                set_cb: function(h1, h2) {
                    assert.equal( h1, 'Content-disposition' );
                    assert.equal( h2, 'attachment; filename=' + filename );
                },
                sendfile_cb: function(f, cb) {
                    assert.equal( f, s1.VIDEO_FILE );
                }
            });

            s1.sendFile( filename, res ); 
            res.emit('close');
        });
    });


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
    describe('prepareVideo', function(done) {

        var s1;

        before( function(done) {
            s1 = new CachedDownloads( function(err) {
                assert.equal(err, null);
                done();
            });

        });

        after( function() {
            delete CachedDownloads.instancesCounter;
            clearTimeout( s1._cleanTimeout );
        });


        it('should cb with error when files cant be found', function( done ) {
            s1.prepareVideo( ['f1','f2','f3'], 'mp4', true, function(err) {
                assert.ok( err );
                done();
            });
        });


        it('should generate a video file', function( done ) {
            var f1 = path.resolve('./tests/fixtures/files/chunk_1.ts');
            s1.prepareVideo( [f1], 'mp4', false, function(err) {
                assert.ok(!err);
                assert.ok( fs.existsSync( s1.VIDEO_FILE ) );
                fs.unlinkSync( s1.VIDEO_FILE );
                done();
            });
        });
    });


    /**
    * prepareSubs
    *
    * generate srt file on disk
    *
    * @param { Array } fileList    list of segments to be concatenated
    * @param { Function } cb       callback when done
    */
    describe('prepareSubs', function(done) {

        var s1;

        before( function(done) {
            s1 = new CachedDownloads( function(err) {
                assert.equal(err, null);
                done();
            });

        });

        after( function() {
            delete CachedDownloads.instancesCounter;
            clearTimeout( s1._cleanTimeout );
        });


        it('should cb with error when files cant be found', function( done ) {
            s1.prepareSubs( ['f1','f2','f3'], function(err) {
                assert.ok( err );
                done();
            });
        });


        it('should generate a srt file', function( done ) {
            var f1 = path.resolve('./tests/fixtures/files/1470668240605_10000.ts');
            s1.prepareSubs( [f1, f1], function(err) {
                assert.equal( err, '' );
                assert.ok( fs.existsSync( s1.SRT_FILE ) );
                fs.unlinkSync( s1.SRT_FILE );
                done();
            });
        });
    });


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
    describe('downloadVideo', function() {

        var s1;
        var f1 = path.resolve('./tests/fixtures/files/1470668240605_10000.ts'),
            filelist = [f1, f1],
            filename = 'a_video_file.vid';

        before( function(done) {
            s1 = new CachedDownloads( function(err) {
                assert.equal(err, null);
                done();
            });

        });

        after( function() {
            delete CachedDownloads.instancesCounter;
            clearTimeout( s1._cleanTimeout );
        });


        it('send file, trigger clean dir timeout, set state and cache correctly', function(done) {

            var cleanDirCallCounter = 0;
            
            s1.triggerCleanDirTimeout = function(t) {

                cleanDirCallCounter++;

                if (cleanDirCallCounter == 1 ) {
                    assert.equal( t, 60*60*1000 );
                } else {
                    assert.equal( t, 5*60*1000 );
                    assert.ok( s1.isCached( filelist, 'mp4' ) );
                    assert.equal( cleanDirCallCounter, 2 );
                    done();
                }
            };

            var res = createResponseObject({
                set_cb: function(h1, h2) {
                    assert.equal( h1, 'Content-disposition' );
                    assert.equal( h2, 'attachment; filename=' + filename );
                },
                sendfile_cb: function(f, cb) {
                    assert.equal( f, s1.VIDEO_FILE );
                    cb();
                },
                status_cb: function(d) {
                    assert.equal(d, 200);
                },
            });

            assert.ok( !s1.isCached( filelist, 'mp4' ) );

            s1.downloadVideo( filelist, filename, 'mp4', res ); 
            assert.equal( s1._state, CachedDownloads.States.BUSY );
        });


        it ('should, when cached, send file from cache', function( done ) {

            var request_counter = 0;
            var cleanDirCallCounter = 0;
            var prepareSubsSpy = sinon.spy( s1, 'prepareSubs' );
            
            s1.triggerCleanDirTimeout = function(t) {

                cleanDirCallCounter++;
                assert.equal( t, 5*60*1000 );
                assert.ok( s1.isCached( filelist, 'mp4' ) );
                assert.equal( cleanDirCallCounter, 1 );
                assert.ok( prepareSubsSpy.notCalled );
                prepareSubsSpy.restore();
                done();
            };

            var res = createResponseObject({
                set_cb: function(h1, h2) {
                    assert.equal( h1, 'Content-disposition' );
                    assert.equal( h2, 'attachment; filename=' + filename );
                },
                sendfile_cb: function(f, cb) {
                    assert.equal( f, s1.VIDEO_FILE );
                    // done();
                    cb();
                },
                status_cb: function(d) {
                    assert.equal(d, 200);
                },
            });
    

            s1.downloadVideo( filelist, filename, 'mp4', res );
        });


        it ('should send video even if subs fail to be generated', function( done ) {

            var cleanDirCallCounter = 0;
            var f2 = path.resolve('./tests/fixtures/files/chunk_1.ts'),
                filelist2 = [f2];
            
            s1.triggerCleanDirTimeout = function(t) {
                cleanDirCallCounter++;
                if (cleanDirCallCounter == 1) {
                    assert.ok( s1.isCached( filelist, 'mp4' ) );
                } else {
                    assert.ok( s1.isCached( filelist2, 'mp4' ) );
                }
            };

            var res = createResponseObject({
                set_cb: function(h1, h2) {
                    assert.equal( h1, 'Content-disposition' );
                    assert.equal( h2, 'attachment; filename=' + filename );
                },
                sendfile_cb: function(f, cb) {
                    assert.equal( f, s1.VIDEO_FILE );
                    assert.ok( cleanDirCallCounter > 0 );
                    done();
                    cb();
                },
                status_cb: function(d) {
                    assert.equal(d, 200);
                },
            });
    
            s1.downloadVideo( filelist2, filename, 'mp4', res );
        });


        it ('should send video even if subs fail to be generated', function( done ) {

            var cleanDirCallCounter = 0;

            var f2 = path.resolve('./tests/fixtures/files/no_file'),
                filelist2 = [f2];
            
            s1.triggerCleanDirTimeout = function(t) {
                cleanDirCallCounter++;
            };

            var res = createResponseObject({
                set_cb: function(h1, h2) {
                    assert.equal( h1, 'Content-disposition' );
                    assert.equal( h2, 'attachment; filename=' + filename );
                },
                sendfile_cb: function(f, cb) {
                    assert.equal( f, s1.VIDEO_FILE );
                    assert.ok( cleanDirCallCounter > 0 );
                    cb();
                },
                status_cb: function(d) {
                    assert.equal(d, 500);
                },
                end_cb: function(d) {
                    assert.ok(d.indexOf('such file') > 0);
                    assert.ok( cleanDirCallCounter > 0 );
                    done();
                }
            });
    
            s1.downloadVideo( filelist2, filename, 'mp4', res );

            // run CachedDownloadsManager tests only after done with all tests here
            // TODO: find a better way to launch these tests
            require('./cached-downloads-manager.test');
        });
    });
});


var createResponseObject = function(opts) {

    var Response = function() {
    };
    
    util.inherits( Response, EventEmitter );

    Response.prototype.status = function(s) {
        if (!opts.status_cb) { return this; }
        opts.status_cb( s );
        return this;
    };

    Response.prototype.end = function(d) {
        if (!opts.end_cb) { return this; }
        opts.end_cb( d );
        return this;
    };

    Response.prototype.sendfile = function(f, cb) {
        if (opts.sendfile_cb) {
            opts.sendfile_cb( f, cb );
        }
    };

    Response.prototype.set = function(h1, h2) {
        if (opts.set_cb) {
            opts.set_cb( h1, h2 );
        }
    };

    return new Response();
};


var assertEmptyCachedRequest = function( cachedRequest ) {
    assert.equal( cachedRequest.firstSegment, null );
    assert.equal( cachedRequest.lastSegment, null );
    assert.equal( cachedRequest.nSegments, null );
    assert.equal( cachedRequest.format, null );
}
