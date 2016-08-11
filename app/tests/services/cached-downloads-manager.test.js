var assert       = require('assert');
var sinon        = require('sinon');
var _            = require('lodash');
var util         = require('util');
var EventEmitter = require('events').EventEmitter;
var path         = require('path');

var cachedDownloadsManager = require('../../services/cached-downloads-manager');
var CachedDownloads = require('../../services/cached-downloads');


describe('CachedDownloadsManager', function() {

    /**
    * _init
    *
    * launch 'N_DOWNLOAD_SERVICES' download services
    */
    describe('_init', function() {
        it('should instantiate 4 CachedDownloads services', function() {
            var services = cachedDownloadsManager._getDownloadServices();
            assert.equal( services.length, 4 );
        });
    });


    /**
    * getVideo
    *
    * sends response according to states of the services;
    * if at least one service is READY or BUSY but cached, download file
    *
    * @param { Array } fileList    list of segments to be concatenated
    * @param { String } filename   output filename (without extension)
    * @param { String } format     output format ( avi / mp4 )
    * @param { object } res        Response object
    */
    describe('getVideo', function() {
        it('should respond with 500 if all services are in error state', function( done ) {

            var res = createResponseObject({
                status_cb: function(d) {
                    assert.equal(d, 500);
                },
                end_cb: function(d) {
                    assert.ok(d.indexOf('could not be launched') > 0);
                    done();
                }
            });

            var services = cachedDownloadsManager._getDownloadServices();
            for (var i in services) {
                services[i]._state = CachedDownloads.States.ERROR;
            }

            cachedDownloadsManager.getVideo(['a', 'b'], 'c', 'd', res);
        });


        it('should respond with 423 if all services are in loading state', function( done ) {

            var res = createResponseObject({
                status_cb: function(d) {
                    assert.equal(d, 423);
                },
                end_cb: function(d) {
                    assert.ok(d.indexOf('not ready yet') > 0);
                    done();
                }
            });

            var services = cachedDownloadsManager._getDownloadServices();
            for (var i in services) {
                services[i]._state = CachedDownloads.States.LOADING;
            }

            cachedDownloadsManager.getVideo(['a', 'b'], 'c', 'd', res);
        });


        it('should respond with 429 if all services are in busy state', function( done ) {

            var res = createResponseObject({
                status_cb: function(d) {
                    assert.equal(d, 429);
                },
                end_cb: function(d) {
                    assert.ok(d.indexOf('is busy') > 0);
                    done();
                }
            });

            var services = cachedDownloadsManager._getDownloadServices();
            for (var i in services) {
                services[i]._state = CachedDownloads.States.BUSY;
            }

            cachedDownloadsManager.getVideo(['a', 'b'], 'c', 'd', res);
        });


        it('should respond with 429 if services are in mixed state, but none are ready or cached', function( done ) {

            var res = createResponseObject({
                status_cb: function(d) {
                    assert.equal(d, 429);
                },
                json_cb: function(d) {
                    assert.ok(d.message.indexOf('is busy') > 0);
                    assert.equal( d.states[ CachedDownloads.States.BUSY ], 1 );
                    assert.equal( d.states[ CachedDownloads.States.LOADING ], 1 );
                    assert.equal( d.states[ CachedDownloads.States.ERROR ], 2 );
                    assert.equal( d.servicesCount, 4 );
                    done();
                }
            });

            var services = cachedDownloadsManager._getDownloadServices();

            services[0]._state = CachedDownloads.States.BUSY;
            services[1]._state = CachedDownloads.States.LOADING;
            services[2]._state = CachedDownloads.States.ERROR;
            services[3]._state = CachedDownloads.States.ERROR;

            cachedDownloadsManager.getVideo(['a', 'b'], 'c', 'd', res);
        });


        it('should respond with video if at least one of the services is ready', function( done ) {

            var services = cachedDownloadsManager._getDownloadServices();
            var filename = 'a_file';

            services[0]._state = CachedDownloads.States.ERROR;
            services[1]._state = CachedDownloads.States.LOADING;
            services[2]._state = CachedDownloads.States.READY;
            services[3]._state = CachedDownloads.States.ERROR;

            var res = createResponseObject({
                set_cb: function(h1, h2) {
                    assert.equal( h1, 'Content-disposition' );
                    assert.equal( h2, 'attachment; filename=' + filename );
                },
                sendfile_cb: function(f, cb) {
                    assert.equal( f, services[2].VIDEO_FILE );
                    cb();
                    done();
                }
            });

            var f1 = path.resolve('./tests/fixtures/files/chunk_1.ts');
            cachedDownloadsManager.getVideo([f1], filename, 'mp4', res);
        });


        it('should respond with video there is a cache hit', function( done ) {

            var services = cachedDownloadsManager._getDownloadServices();
            var filename = 'a_file';

            services[0]._state = CachedDownloads.States.ERROR;
            services[1]._state = CachedDownloads.States.LOADING;
            services[2]._state = CachedDownloads.States.BUSY;
            services[3]._state = CachedDownloads.States.ERROR;

            var res = createResponseObject({
                set_cb: function(h1, h2) {
                    assert.equal( h1, 'Content-disposition' );
                    assert.equal( h2, 'attachment; filename=' + filename );
                },
                sendfile_cb: function(f, cb) {
                    assert.equal( f, services[2].VIDEO_FILE );
                    cb();
                    done();
                }
            });

            var f1 = path.resolve('./tests/fixtures/files/chunk_1.ts');
            cachedDownloadsManager.getVideo([f1], filename, 'mp4', res);
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

    Response.prototype.json = function(d) {
        if (!opts.json_cb) { return this; }
        opts.json_cb( d );
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
