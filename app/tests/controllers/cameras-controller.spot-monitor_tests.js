var _      = require('lodash');
var fs     = require('fs-extra');
var path   = require('path');
var assert = require("assert");
var sinon  = require("sinon");

var CamerasController = require('../../controllers/cameras_controller.js');

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

var newCam_1 = {
    ip: '1.1.1.1',
    manufacturer: 'generic',
    streams: [
    {
        name: 'stream_1',
        url: 'rtsp://127.0.0.1/stream_1'
    },
    {
        name: 'stream_2',
        url: 'rtsp://127.0.0.1/stream_2'
    }
    ]
};

var newCam_2 = {
    ip: '2.2.2.2',
    manufacturer: 'generic',
    spotMonitorStreams: [
        {
            name: 'spot_stream_1',
            url: 'rtsp://127.0.0.1/spot_1'
        },
        {
            name: 'spot_stream_2',
            url: 'rtsp://127.0.0.1/spot_2'
        }
    ]
};

var newCam_3 = {
    ip: '3.3.3.3',
    name: 'cam_3',
    manufacturer: 'generic',
    spotMonitorStreams: [
        {
            name: 'spot_stream_3',
            url: 'rtsp://127.0.0.1/spot_3'
        }
    ],
    streams: [
        {
            name: 'stream_3',
            url: 'rtsp://127.0.0.1/stream_3'
        }
    ]
};


var newCam_4 = {
    ip: '4.4.4.4',
    name: 'cam_4',
    manufacturer: 'generic',
    spotMonitorStreams: [
        {
            name: 'spot_stream_1',
            url: 'rtsp://127.0.0.1/spot_1'
        },
        {
            name: 'spot_stream_2',
            url: 'rtsp://127.0.0.1/spot_2'
        }
    ],
    streams: [
        {
            name: 'stream_1',
            url: 'rtsp://127.0.0.1/stream_1'
        },
        {
            name: 'stream_2',
            url: 'rtsp://127.0.0.1/stream_2'
        }
    ]
};

describe('CamerasController', function() {

    describe('insertNewCamera', function() {

        var controller;

        before( function(done) {

            createCamerasController( function(err, newController, f) {
                // assert.equal(f, null);
                controller = newController;
                done();
            });
        });

        it('should add valid streams, assigning IDs to them', function(done) {
            var testStreams = function( cam ) {
                var k = 0;
                for (var i in cam.streams ) {
                    k++;
                    assert.ok( cam.streams[i].id );
                    assert.equal(cam.streams[i].name, 'stream_' + k);
                    assert.equal(cam.streams[i].url, 'rtsp://127.0.0.1/stream_' + k);
                }
            };

            var testSpotMonitorStreams = function( cam ) {
                var k = 0;
                for (var i in cam.spotMonitorStreams ) {
                    k++;
                    assert.ok( cam.spotMonitorStreams[i].id );
                    assert.equal(cam.spotMonitorStreams[i].name, 'stream_' + k);
                    assert.equal(cam.spotMonitorStreams[i].url, 'rtsp://127.0.0.1/stream_' + k);
                }
            };

            controller.insertNewCamera( _.cloneDeep(newCam_1), function(err, c) {
                assert.equal(err, null);
                var cam = controller.findCameraById( c._id );

                testStreams( cam );

                controller.insertNewCamera( _.cloneDeep(newCam_2), function(err, c) {
                    assert.equal(err, null);
                    var cam = controller.findCameraById( c._id );

                    testStreams( cam );
                    testSpotMonitorStreams( cam );

                    controller.insertNewCamera( _.cloneDeep(newCam_2), function(err, c) {
                        assert.equal(err, null);
                        var cam = controller.findCameraById( c._id );
                        var k = 0;

                        testStreams( cam );
                        testSpotMonitorStreams( cam );
                        done();
                    });
                });
            });
        });
    });

    describe('updateCamera', function() {

        var brokenParams_1 = null,
            brokenParams_2 = 'x',
            brokenParams_3 = [],
            brokenParams_4 = {
                name: 'broken_4',
                streams: [],
                spotMonitorStreams: 'x'
            };

        var controller;

        before( function(done) {
            createCamerasController( function(err, c) {
                controller = c;
                controller.insertNewCamera( _.cloneDeep(newCam_4), function(err) {
                    assert.equal( Object.keys(controller.cameras[0].spotMonitorStreams).length, 2 );
                    assert.equal( err, null );
                    done();
                });
            });
        });

        it('should reject invalid params', function(done) {
            
            var cam_id = controller.cameras[0]._id;
            brokenParams_4._id = cam_id;

            controller.updateCamera( brokenParams_1, function(err) {
                assert.equal(err, 'invalid params');
                controller.updateCamera( brokenParams_2, function(err) {
                    assert.equal(err, 'invalid params');
                    controller.updateCamera( brokenParams_3, function(err) {
                        assert.equal(err, 'camera not found');
                        controller.updateCamera( brokenParams_4, function(err) {
                            assert.equal(err, 'invalid spotMonitorStream object');
                            done();
                        });
                    });
                });
            });
        });

        it('should update streams', function(done) {
            var cam_id = controller.cameras[0]._id,
                stream_id = Object.keys(controller.cameras[0].streams)[0];
            
            var newSettings = {
                _id: cam_id,
                streams: [
                    {
                        id: stream_id,
                        name: 'new_stream_1'
                    }
                ]
            };

            var streams = controller.cameras[0].streams,
                spotMonitorStreams = controller.cameras[0].spotMonitorStreams;

            controller.updateCamera( newSettings, function(err) {

                assert.equal(err, null);
                assert.equal(Object.keys(streams).length, 2);
                assert.equal(Object.keys(spotMonitorStreams).length, 2);

                var k = 0;

                for(var i in streams) {
                    k++;
                    assert.equal( i, streams[i].id );
                    assert.equal( streams[i].url, 'rtsp://127.0.0.1/stream_'+k );
                    if (i == stream_id) {
                        assert.equal(streams[i].name, 'new_stream_1');
                    } else {
                        assert.equal(streams[i].name, 'stream_2');
                    }
                }

                k = 0;
                for(var i in spotMonitorStreams) {
                    k++;
                    assert.equal( i, spotMonitorStreams[i].id );
                    assert.equal(spotMonitorStreams[i].name, 'spot_stream_'+k);
                    assert.equal( spotMonitorStreams[i].url, 'rtsp://127.0.0.1/spot_'+k );
                }

                done();
            });
        });

        it('should update spot-monitor streams', function(done) {
            var cam_id = controller.cameras[0]._id,
                stream_id = Object.keys(controller.cameras[0].spotMonitorStreams)[0];

            var streams = controller.cameras[0].streams,
                spotMonitorStreams = controller.cameras[0].spotMonitorStreams;
            
            var newSettings = {
                _id: cam_id,
                spotMonitorStreams: [
                    {
                        id: stream_id,
                        name: 'new_spot_stream_1'
                    }
                ],
                streams: [
                ]
            };

            controller.updateCamera( newSettings, function(err) {
                // updateCamera calls back when the done with updating streams,
                // and does not wait for the spotMonitorStreams update,
                // hence the timeout
                setTimeout( function() {
                    assert.equal(err, null);
                    
                    var k = 0;

                    for(var i in streams) {
                        k++;
                        assert.equal( i, streams[i].id );
                        assert.equal( streams[i].url, 'rtsp://127.0.0.1/stream_'+k );
                    }

                    k = 0;
                    for(var i in spotMonitorStreams) {
                        k++;
                        assert.equal( i, spotMonitorStreams[i].id );
                        if (i == stream_id) {
                            assert.equal(spotMonitorStreams[i].name, 'new_spot_stream_'+k);
                        } else {
                            assert.equal(spotMonitorStreams[i].name, 'spot_stream_'+k);
                        }
                        assert.equal( spotMonitorStreams[i].url, 'rtsp://127.0.0.1/spot_'+k );
                    }

                    done();
                }, 100);
            });
        });
    });


    /**
    * removeSpotMonitorStream
    *
    * a wrapper to spot-monitor-helper function of same name
    *
    * @param { String } camId    
    * @param { String } streamId
    * @param { function } cb  callback function
    */
    describe('removeSpotMonitorStream', function() {

        var controller,
            camera;

        before( function(done) {

            createCamerasController( function(err, newController) {
                controller = newController;
                controller.insertNewCamera( _.cloneDeep(newCam_4), function(err) {
                    camera = controller.cameras[0];

                    assert.equal( err, null );
                    assert.equal( Object.keys( camera.spotMonitorStreams ).length, 2 );

                    done();
                });
            });
        });

        it('should remove spot monitor streams', function(done) {
            
            var camera = controller.cameras[0];

            var spotMonitorStreamsIDs = Object.keys( camera.spotMonitorStreams ),
                streamsIDs = Object.keys( camera.streams );

            // assert.equal( spotMonitorStreamsIDs.length, 2 );
            assert.equal( streamsIDs.length, 2 );

            controller.removeSpotMonitorStream( camera._id, spotMonitorStreamsIDs[0], function(err) {
                // assert.equal( spotMonitorStreamIDs.length, 2 );
                assert.equal( streamsIDs.length, 2 );
                done();
            });
        });
    });
});


function createCamerasController( cb ) {
    var db_file = path.resolve( __dirname, '/../tmp/camera-model.spot-monitor-cam_db_' + Date.now() + '_' + Math.random());
    try{
        fs.unlinkSync( db_file );
    } catch(err) {}
    var videosFolder = path.resolve( __dirname, '/../tmp/camera-model.spot-monitor-tests_' + Date.now() + '_' + Math.random());
    fs.ensureDirSync( videosFolder );

    var controller = new CamerasController( db_file, videosFolder, function(err) {
        cb( err, controller, videosFolder );
    });
};
