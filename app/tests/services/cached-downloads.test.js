var assert = require('assert');
var sinon  = require('sinon');
var _      = require('lodash');
var fs     = require('fs-extra');

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


        it('should delete files after the specified time', function( done ) {

            this.timeout( 5000 );

            var t = 500;

            fs.ensureFileSync( s_1.VIDEO_FILE );
            fs.ensureFileSync( s_1.SRT_FILE );

            assert.ok( fs.existsSync( s_1.VIDEO_FILE ) );
            assert.ok( fs.existsSync( s_1.SRT_FILE ) );

            clearTimeout( s_1._cleanTimeout );
            assert.ok( !s_1._cleanTimeout );

            s_1.triggerCleanDirTimeout( t );
            assert.ok( s_1._cleanTimeout );

            setTimeout( function() {

                assert.ok( !fs.existsSync( s_1.VIDEO_FILE ) );
                assert.ok( !fs.existsSync( s_1.SRT_FILE ) );

                done();

            }, t + 50);
        });
    });
});


var createResponseObject = function(opts) {

    var res = {};
    
    res.status = function(s) {
        if (!opts.status_cb) { return res; }
        opts.status_cb( s );
        return res;
    };

    res.end = function(d) {
        if (!opts.end_cb) { return res; }
        opts.end_cb( d );
        return res;
    };

    return res;
};


var assertEmptyCachedRequest = function( cachedRequest ) {
    assert.equal( cachedRequest.firstSegment, null );
    assert.equal( cachedRequest.lastSegment, null );
    assert.equal( cachedRequest.nSegments, null );
    assert.equal( cachedRequest.format, null );
}
