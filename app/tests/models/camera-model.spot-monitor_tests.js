var _      = require('lodash');
var fs     = require('fs-extra');
var path   = require('path');
var assert = require("assert");
var sinon  = require("sinon");
var http   = require('http');

var CameraModel = require('../../models/camera_model.js');

var _camera_1 = {
	_id          : "camera_2",
	name         : "camera 2",
	ip           : "127.0.0.1",
	manufacturer : 'a_manufacturer',
	user         : 'a_user',
	password     : 'a_password',
	streams: {
		stream_1 : {
			id         : 'stream_1',
			resolution : '640x480',
			framerate  : '10',
			quality    : '5'
		}, 
		stream_2 : {
			id         : 'stream_2',
			resolution : '1280x960',
			framerate  : '20',
			quality    : '30'
		}
	},
        spotMonitorStreams: {
        }
};

var _hik_camera_1 = {
    _id          : 'camera_2',
    name         : 'camera 2',
    ip           : '127.0.0.1',
    manufacturer : 'hik',
    user         : 'a_user',
    password     : 'a_password'
};

describe('CameraModel:spot-monitor', function() {

    describe('constructor', function() {
        
        var db_file,
            videosFolder;

        before( function(done) {
            db_file = path.resolve( __dirname, '/../tmp/camera-model.spot-monitor-cam_db_' + Date.now() );
            try{
                fs.unlinkSync( db_file );
            } catch(err) {}
            videosFolder = path.resolve( __dirname, '/../tmp/camera-model.spot-monitor-tests_' + Date.now() );
            fs.ensureDirSync( videosFolder );

            done();
        });

        after( function(done) {

            try{
                fs.unlinkSync( db_file );
                fs.removeSync( videosFolder );
            } catch(err) {}

            done();
        });


        it('should add all valid spot monitor streams to new camera being instantiated', function(done) {

            process.env['BASE_FOLDER'] = videosFolder;

            var cam = _.cloneDeep( _camera_1 );
            cam.spotMonitorStreams = [
                {
                    id: 'spot_stream_1',
                    name: 'spot_name_1',
                    framerate: 'spot_framerate_1'
                },
                null,
                {
                    id: 'spot_stream_2',
                    name: 'spot_name_2',
                    framerate: 'spot_framerate_2'
                },
                {},
                'x'
            ];

            var camera = new CameraModel( cam, videosFolder, function(err) {
                var spot_ids = Object.keys( camera.spotMonitorStreams );
                var stream_ids = Object.keys( camera.streams );

                assert.equal( spot_ids.length, 2 );
                assert.equal( stream_ids.length, 2 );

                var spotStreams = camera.spotStreams;

                assert.equal( camera.spotMonitorStreams['spot_stream_1'].id, 'spot_stream_1' );
                assert.equal( camera.spotMonitorStreams['spot_stream_1'].name, 'spot_name_1' );
                assert.equal( camera.spotMonitorStreams['spot_stream_1'].framerate, 'spot_framerate_1' );

                assert.equal( camera.spotMonitorStreams['spot_stream_2'].id, 'spot_stream_2' );
                assert.equal( camera.spotMonitorStreams['spot_stream_2'].name, 'spot_name_2' );
                assert.equal( camera.spotMonitorStreams['spot_stream_2'].framerate, 'spot_framerate_2' );

                assert.equal( camera.streams['stream_1'].id, 'stream_1' );
                assert.equal( camera.streams['stream_1'].resolution, '640x480' );

                done();
            });
        });


        it('should handle undfined spotMonitorStreams array', function(done) {
            process.env['BASE_FOLDER'] = videosFolder;

            var cam = _.cloneDeep( _camera_1 );
            delete cam.spotMonitorStreams;

            var camera = new CameraModel( cam, videosFolder, function(err) {
                var spot_ids = Object.keys( camera.spotMonitorStreams );
                var stream_ids = Object.keys( camera.streams );

                assert.equal( spot_ids.length, 0 );
                assert.equal( stream_ids.length, 2 );

                assert.equal( camera.streams['stream_1'].id, 'stream_1' );
                assert.equal( camera.streams['stream_1'].resolution, '640x480' );

                assert.equal( camera.streams['stream_2'].id, 'stream_2' );

                done();
            });
        });
    });


    describe('addStream', function() {

        var channelsResponseXML = 
            '<StreamingChannel ></StreamingChannel>' +
            '<StreamingChannel ></StreamingChannel>' +
            '<StreamingChannel ></StreamingChannel>';

        var capabilitiesResponseXML_template = '<?xml version="1.0" encoding="UTF-8"?>\
            <StreamingChannel version="2.0" xmlns="http://www.hikvision.com/ver20/XMLSchema">\
            <id opt="1,2,3">102</id>\
            <Video>\
                <videoResolutionWidth opt="{resolutions}">640</videoResolutionWidth>\
                <maxFrameRate>3000</maxFrameRate>\
            </Video>\
            </StreamingChannel>';

        var capabilitiesResponseXML_1 = capabilitiesResponseXML_template.replace('{resolutions}', '2000*2000,1500*1500,800*600, 500*500');
        var capabilitiesResponseXML_2 = capabilitiesResponseXML_template.replace('{resolutions}', '800*600, 500*500, 300*300');
        var capabilitiesResponseXML_3 = capabilitiesResponseXML_template.replace('{resolutions}', '300*300,100*100');

        var cam = _.cloneDeep( _hik_camera_1 );

        var db_file,
            videosFolder,
            camera;

        before( function(done) {
            db_file = path.resolve( __dirname, '/../tmp/camera-model.hik-cam_db_' + Date.now() );
            try{
                fs.unlinkSync( db_file );
            } catch(err) {}
            videosFolder = path.resolve( __dirname, '/../tmp/camera-model.hik-tests_' + Date.now() );
            fs.ensureDirSync( videosFolder );

            camera = new CameraModel( cam, videosFolder, function(err) {
                done();
            });
        });


        it('should set set correct url and channel for HIK cameras', function( done ) {

            var server = new Server({
                responseFunction: function(req, cb) {

                    if (req.url == '/streaming/channels') {
                        return cb( channelsResponseXML );
                    } 

                    if ( req.url.indexOf('channels/1') >= 0 ) {
                        return cb(capabilitiesResponseXML_1);
                    } else if ( req.url.indexOf('channels/2') >= 0) {
                        return cb(capabilitiesResponseXML_2);
                    } else if ( req.url.indexOf('channels/3') >= 0) {
                        return cb(capabilitiesResponseXML_3);
                    } else {
                        return cb();
                    }
                }
            }, function(port) {

                camera.ip = 'localhost:' + port;

                camera.api.setCameraParams({
                    ip: camera.ip
                });

                camera.addStream({
                    id: 'x',
                    resolution: '800x600'
                }, function() {
                    var s = camera.streams.x;
                    assert.equal( s.channel, 2 );
                    assert.equal( s.url, 'rtsp://' + camera.username + ':' + camera.password + '@' + camera.ip + '/Streaming/Channels/2' );
                    // TODO: assert s.rtsp
                    done();
                });

            });
        });
    });


    // TODO: move this test to camera-model-tests
    describe('updateAllStreams', function() {

        process.env['BASE_FOLDER'] = videosFolder;

        var cam = _.cloneDeep( _camera_1 );
        cam.spotMonitorStreams = [
            {
                id: 'spot_stream_1',
                name: 'spot_name_1',
                framerate: 'spot_framerate_1'
            },
            null,
            {
                id: 'spot_stream_2',
                name: 'spot_name_2',
                framerate: 'spot_framerate_2'
            },
            {},
            'x'
        ];

        var db_file,
            videosFolder,
            camera;

        before( function(done) {
            db_file = path.resolve( __dirname, '/../tmp/camera-model.spot-monitor-cam_db_' + Date.now() );
            try{
                fs.unlinkSync( db_file );
            } catch(err) {}
            videosFolder = path.resolve( __dirname, '/../tmp/camera-model.spot-monitor-tests_' + Date.now() );
            fs.ensureDirSync( videosFolder );

            camera = new CameraModel( cam, videosFolder, function(err) {
                done();
            });
        });

        after( function(done) {

            try{
                fs.unlinkSync( db_file );
                fs.removeSync( videosFolder );
            } catch(err) {}

            done();
        });


        it('should do nothing but callback if new streams array is empty or undefined', function( done ) {
        
            camera.updateAllStreams( null, function(err) {
                assert.equal(err, 'invalid params');
                camera.updateAllStreams([], function() {
                    done();
                });
            });
        });


        it('should not remove any stream, but it should add or update streams', function( done ) {
            camera.updateAllStreams([
                {
                    id: 'no_such_stream',
                    framerate: 'x'
                },
                null,
                {
                    id: 'stream_1',
                    framerate: '101'
                }
            ], function(err, stats) {

                assert.ok(camera.streams['stream_2']);
                assert.ok(camera.streams['no_such_stream']);

                assert.equal( Object.keys(camera.streams).length, 3 );
                assert.equal(stats.updated, 1);
                assert.equal(stats.added, 1);

                assert.equal(camera.streams['stream_1'].framerate, '101');
                assert.equal(camera.streams['stream_1'].id, 'stream_1');
                assert.equal(camera.streams['stream_1'].quality, '5');

                camera.updateAllStreams([
                    {
                        id: 'no_such_stream',
                        framerate: 'x'
                    },
                    {
                        id: 'stream_1',
                        framerate: '102',
                        resolution: '1x1'
                    }
                ], function(err, stats) {
                    
                    assert.equal( Object.keys(camera.streams).length, 3 );
                    assert.equal(stats.updated, 2);
                    assert.equal(stats.added, 0);

                    assert.equal(camera.streams['stream_1'].framerate, '102');
                    assert.equal(camera.streams['stream_1'].resolution, '1x1');
                    assert.equal(camera.streams['stream_1'].quality, '5');

                    camera.updateAllStreams([
                        null,
                        {}
                    ], function(err, stats) {

                        assert.equal( Object.keys(camera.streams).length, 3 );
                        assert.equal(stats.updated, 0);
                        assert.equal(stats.added, 0);

                        done();
                    });
                });

            });
        });
    });

    
    describe('restartAllStreams', function() {

        var cam = _.cloneDeep( _camera_1 );
        cam.spotMonitorStreams = [
            {
                id: 'spot_stream_1',
                name: 'spot_name_1',
                framerate: 'spot_framerate_1'
            },
            null,
            {
                id: 'spot_stream_2',
                name: 'spot_name_2',
                framerate: 'spot_framerate_2'
            },
            {},
            'x'
        ];

        var db_file,
            videosFolder,
            camera;

        before( function(done) {
            db_file = path.resolve( __dirname, '/../tmp/camera-model.spot-monitor-cam_db_' + Date.now() );
            try{
                fs.unlinkSync( db_file );
            } catch(err) {}
            videosFolder = path.resolve( __dirname, '/../tmp/camera-model.spot-monitor-tests_' + Date.now() );
            fs.ensureDirSync( videosFolder );

            camera = new CameraModel( cam, videosFolder, function(err) {
                done();
            });
        });

        after( function(done) {

            try{
                fs.unlinkSync( db_file );
                fs.removeSync( videosFolder );
            } catch(err) {}

            done();
        });


        it ('should restart all streams', function(done) {

            var restartStreamSpy = sinon.spy(camera, 'restartStream');
            camera.restartAllStreams();
            assert.equal( restartStreamSpy.callCount, 2 );

            done();
        });
    });
});


var Server = function( opts, cb ) {

    if (!Server._ports) { 
        Server._ports = {};
    }

    var port = 8500;
    while( Server._ports[ port ] ) {
        port++
    }

    this.port = port;

    this.server = http.createServer( function(req, res) {

        var buffer = '';
        req.on('data', function(d) {
            buffer += d.toString();
        });
        req.on('end', function() {
            if (!opts.onData) { return; }
            opts.onData( {
                method:  req.method,
                body:    buffer,
                url:     req.url
            });
        });

        setTimeout( function() {
            if (opts.responseFunction) {
                opts.responseFunction( req, function( d ) {
                    res.end( d );
                });
            } else {
                res.end( opts.response );
            }
        }, opts.timeout );
    });

    Server._ports[port] = this.server;

    this.server.listen( port );
    if (cb) cb( port );
};

Server.prototype.close = function() {
    this.server.close();
    delete Server._ports[ this.port ];
};
