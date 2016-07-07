var assert = require('assert');
var sinon  = require('sinon');
var _      = require('lodash');
var async  = require('async');

var spotMonitorHelper = require('../../helpers/spot-monitor');


var _cameraWithoutStreams = {
    _id: 'camera_1',
    streams: {},
    spotMonitorStreams: {},
    api: {
        getRtspUrl: function(opts, cb) {
            cb('fake_url');
        },
        setCameraParams: function(opts) {
        }
    }
};

var _stream = {
    id: 'stream_1'
};


/**
 * addAllSpotMonitorStreams
 *
 * add array of spot monitor streams to given a camera
 *
 * @param { Camera object } camera          camera object
 * @param { array } spotMonitorStreams      array of spot monitor streams
 * @param { function } cb(err)              callback function
 */
describe('addAllSpotMonitorStreams', function() {
    
    it('should reject invalid camera objects', function( done ) {

        spotMonitorHelper.addAllSpotMonitorStreams( 'string', [{}], function(err) {
            assert.equal(err, 'invalid params');

            spotMonitorHelper.addAllSpotMonitorStreams( null, [{}], function(err) {
                assert.equal(err, 'invalid params');

                spotMonitorHelper.addAllSpotMonitorStreams( {x:'y'}, [{}], function(err) {
                    assert.equal(err, 'invalid params');
                        done();
                });
            });
        });
    });


    it('should reject invalid spotMonitorStreams', function( done ) {

        var cameraWithoutStreams = _.clone( _cameraWithoutStreams );
        spotMonitorHelper.addAllSpotMonitorStreams( cameraWithoutStreams, 'x', function(err) {
            assert.equal(err, 'invalid params');

            spotMonitorHelper.addAllSpotMonitorStreams( cameraWithoutStreams, {x:'y'}, function(err) {
                assert.equal(err, 'invalid params');

                spotMonitorHelper.addAllSpotMonitorStreams( cameraWithoutStreams, null, function(err) {
                    assert.equal(err, 'invalid params');
                        done();
                });
            });
        });
    });

   
    it('should handle empty array of spotMonitorStreams', function( done ) {

        var cameraWithoutStreams = _.clone( _cameraWithoutStreams );
        spotMonitorHelper.addAllSpotMonitorStreams( cameraWithoutStreams, [], function(err) {
            assert.ok(!err);
            done();
        });

    });


    it('should handle undefined callback', function() {
        var cameraWithoutStreams = _.clone( _cameraWithoutStreams );
        spotMonitorHelper.addAllSpotMonitorStreams( cameraWithoutStreams, [] );
    });

    
    it('should call addSpotMonitorStream once for each valid stream in the array', function(done) {
        var cameraWithoutStreams = _.clone( _cameraWithoutStreams );
        var streams = [];
        for (var i = 0; i < 10; i++) {
            var s = _.clone( _stream );
            s.id = 'stream_' + i;
            streams.push( s );
        }
        getRtspUrlSpy = sinon.spy(cameraWithoutStreams.api, 'getRtspUrl');
        
        spotMonitorHelper.addAllSpotMonitorStreams( cameraWithoutStreams, streams, function(err) {
            assert.ok(!err);
            assert.equal(getRtspUrlSpy.callCount, streams.length);
            cameraWithoutStreams.api.getRtspUrl.restore();
            done();
        });
    });
});
/* end of addAllSpotMonitorStream */


/**
 * addSpotMonitorStream
 *
 * add new stream to camera, setting up camera and retrieving rtsp url if necessary
 * - doesn't touch the cameras database
 * - stream object should have an ID already
 *
 * @param { Camera object } camera      camera object
 * @param { object } stream             stream object
 * @param { function } cb(err, stream)  callback function
 *          - { String } err      'null' if no errors
 *          - { object } stream   stream object
 */

/* end of addSpotMonitorStream */


/**
 * reAddMissingSpotMonitorStreams
 *
 * compare two camera objects, 
 * adding spot monitor streams from the first one that are missing in the second one
 *
 * @param { object } curr_camera    camera object (reference)
 * @param { object } cam            camera object (to be updated with missing streams)
 */
describe('reAddMissingSpotMonitorStreams', function() {
    
    it('should reject invalid camera objects', function() {
        var err = spotMonitorHelper.reAddMissingSpotMonitorStreams( null, null );
        assert.equal(err, 'invalid params');

        err = spotMonitorHelper.reAddMissingSpotMonitorStreams( {}, {} );
        assert.equal(err, 'invalid params');
    });

    it('should add missing streams and preserve the other ones', function() {

        var curr_camera = _.clone( _cameraWithoutStreams );
        curr_camera.spotMonitorStreams = [];
        var curr_camera_streams_orig = [];

        var cam = _.clone( _cameraWithoutStreams );
        cam.spotMonitorStreams = [];
        var cam_streams_orig = [];

        for (var i = 0; i < 5; i++) {
            var s = _.clone( _stream );
            s.id = 'curr_stream_' + i;
            curr_camera.spotMonitorStreams.push( s );
            curr_camera_streams_orig.push( s );
        }

        for (var i = 0; i < 3; i++) {
            var s = _.clone( _stream );
            s.id = 'new_stream_' + i;
            cam.spotMonitorStreams.push( s );
            cam_streams_orig.push( s );
        }

        for (var i = 0; i < 2; i++) {
            var s = _.clone( _stream );
            s.id = 'common_stream_' + i;

            curr_camera.spotMonitorStreams.push( s );
            cam.spotMonitorStreams.push( s );

            cam_streams_orig.push( s );
            curr_camera_streams_orig.push( s );
        }

        spotMonitorHelper.reAddMissingSpotMonitorStreams( curr_camera, cam );

        // all streams are either from the new cam json object
        // or from the previous camera state
        for (var i in cam.spotMonitorStreams) {
            var s = cam.spotMonitorStreams[i];
            assert.ok( s );
            assert.ok( 
                _.find( cam_streams_orig, {'id': s.id} ) ||
                _.find( curr_camera_streams_orig, {'id': s.id} )
            );
        }

        // the original streams from the new camera json are preserved
        for (var i in cam_streams_orig) {
            var s = cam_streams_orig[i];
            assert.ok( _.find( cam.spotMonitorStreams, {'id': s.id} ) );
        }

        // the original streams from the previous state are preserved
        // and added to the new camera json
        for (var i in curr_camera_streams_orig) {
            var s = curr_camera.spotMonitorStreams[i];
            assert.ok( _.find( curr_camera.spotMonitorStreams, {'id': s.id}) );
            assert.ok( _.find( cam.spotMonitorStreams, {'id': s.id} ) );
        }
    });
});
/* end of reAddMissingSpotMonitorStreams */


/**
 * generateIDForNewStreams
 *
 * go through spot monitor streams in a camera object, generating ID if necessary (eg. new stream)
 * returns hash of the streams by ID
 *
 * @param { object } cam    camera object
 * @return { object }       spot monitor streams hashed by ID
 */
describe('generateIDForNewStreams', function() {
    it('should reject invalid camera param', function() {
        var r = spotMonitorHelper.generateIDForNewStreams( null );
        assert.ok( _.isEqual(r, {}) );

        r = spotMonitorHelper.generateIDForNewStreams( 'x' );
        assert.ok( _.isEqual(r, {}) );

        r = spotMonitorHelper.generateIDForNewStreams( {} );
        assert.ok( _.isEqual(r, {}) );
    });

    it('should not generate new IDs only if not already present and return hash of streams by ID', function() {
       
        var cam = _.clone( _cameraWithoutStreams );
        cam.spotMonitorStreams = [
            {
                id: 'stream_1'
            },
            {
                id: undefined
            },
            {
                id: null
            },
            {
                id: '',
            },
            {
                something_else: 'x'
            },
            {
                id: 'stream_2'
            }
        ];

        var streamsHash = spotMonitorHelper.generateIDForNewStreams( cam );

        assert.equal(cam.spotMonitorStreams[0].id, 'stream_1');
        assert.equal(cam.spotMonitorStreams[5].id, 'stream_2');

        for (var i = 1; i < 5; i++) {
            assert.equal( typeof(cam.spotMonitorStreams[i].id), 'string' );
            assert.ok( cam.spotMonitorStreams[i].id.length > 1 );
        }

        assert.equal( cam.spotMonitorStreams.length, Object.keys(streamsHash).length )

        for (var i in streamsHash) {
            assert.equal(i, streamsHash[i].id);
        }
    });

    it( 'should not break when there is invalid streams in the array', function() {
       
        var cam = _.clone( _cameraWithoutStreams );
        cam.spotMonitorStreams = [
            {
                id: 'stream_1'
            },
            { },
            null ,
            undefined,
            'x',
            {
                id: 'stream_2'
            }
        ];

        var streamsHash = spotMonitorHelper.generateIDForNewStreams( cam );

        assert.equal(cam.spotMonitorStreams[0].id, 'stream_1');
        assert.equal(cam.spotMonitorStreams[5].id, 'stream_2');

        // for (var i = 1; i < 5; i++) {
        //     assert.equal( typeof(cam.spotMonitorStreams[i].id), 'string' );
        //     assert.ok( cam.spotMonitorStreams[i].id.length > 1 );
        // }

        assert.equal( Object.keys(streamsHash).length, 3 )

        for (var i in streamsHash) {
            assert.equal(i, streamsHash[i].id);
        }
    });

});
/* end of generateIDForNewStreams */


/**
 * updateAllSpotMonitorStreams
 *
 * add/update spot monitor streams to/from a given camera object, 
 * setting up camera device and retrieving rtsp url if necessary
 *  - doesn't touch the cameras database
 *  - if a stream has an ID and already exists, it will be updated;
 *    otherwise, it will be added as a new stream
 *
 * @param { Camera object } camera  camera object
 * @param { Array } new_streams     array of streams to be added/updated
 * @param { function } cb           callback function
 */
describe('updateAllSpotMonitorStreams', function() {

    var camera = _.clone( _cameraWithoutStreams );
    var new_streams = [];
    for (var i = 0; i < 5; i++) {
        var s = _.clone( _stream );
        s.id = 'stream_' + i;
        new_streams.push(s);
    }

    it('should reject invalid camera params', function(done) {

        spotMonitorHelper.updateAllSpotMonitorStreams( null, new_streams, function(err) {
            assert.equal(err, 'invalid camera');
            spotMonitorHelper.updateAllSpotMonitorStreams( undefined, new_streams, function(err) {
                assert.equal(err, 'invalid camera');
                spotMonitorHelper.updateAllSpotMonitorStreams( 'x', new_streams, function(err) {
                    assert.equal(err, 'invalid camera');
                    spotMonitorHelper.updateAllSpotMonitorStreams( {}, new_streams, function(err) {
                        assert.equal(err, 'invalid camera');
                        spotMonitorHelper.updateAllSpotMonitorStreams( [], new_streams, function(err) {
                            assert.equal(err, 'invalid camera');
                            done();
                        });
                    });
                });
            });
        });
    });


    it('should reject invalid streams params', function(done) {

        spotMonitorHelper.updateAllSpotMonitorStreams( camera, {}, function(err) {
            assert.equal(err, 'invalid streams');
            spotMonitorHelper.updateAllSpotMonitorStreams( camera, 'x', function(err) {
                assert.equal(err, 'invalid streams');
                spotMonitorHelper.updateAllSpotMonitorStreams( camera, null, function(err) {
                    assert.equal(err, 'invalid streams');
                    spotMonitorHelper.updateAllSpotMonitorStreams( camera, undefined, function(err) {
                        assert.equal(err, 'invalid streams');
                        done();
                    });
                });
            });
        });
    });


    it('should handle missing/invalid callback', function() {
        spotMonitorHelper.updateAllSpotMonitorStreams(camera, []);
    });


    it('should handle empty streams array', function(done) {
        spotMonitorHelper.updateAllSpotMonitorStreams(camera, [], function(err) {
            assert.ok(!err);
            done();
        });
    });


    it ('should handle invalid streams in array', function(done) {
        var camera_1 = _.clone( _cameraWithoutStreams ),
            camera_2 = _.clone( _cameraWithoutStreams );

        var streams_1 = [
            null,
            'x',
            {
                id: 'spot_1'
            }
        ];

        var streams_2 = [
            null,
            'x'
        ];
        spotMonitorHelper.updateAllSpotMonitorStreams(camera_1, streams_1, function(err) {
            assert.ok(!err);
            assert.ok( camera.spotMonitorStreams['spot_1'] );
            spotMonitorHelper.updateAllSpotMonitorStreams(camera_2, streams_2, function(err) {
                assert.ok(!err);
                done();
            });
        });
    });

    it ('should update stream if it already exists', function(done) {
        
        var camera_1 = _.clone( _cameraWithoutStreams );
        camera_1.spotMonitorStreams = {
            'stream_1': {
                id: 'stream_1',
                url: 'old_url',
                resolution: 'old_resolution'
            },
            'stream_2': {
                id: 'stream_2',
                quality: 'should_not_change_2',
                framerate: 'old_framerate'
            },
            'stream_3': {
                id: 'stream_3',
                url: 'url_3',
                framerate: 'should_not_change_3',
                quality: 'old_quality'
            },
            'stream_4': {
                id: 'stream_4',
                url: 'url_4',
                framerate: 'framerate_should_not_change_4',
                quality: 'quality_should_not_change_4'
            }
        };

        var streams = [
            {
                id: 'new_stream',
                resolution: 'x',
                quality: 'y',
                url: 'z'
            },
            {
                id: 'stream_1',
                resolution: 'new_resolution_1',
                quality: 'new_quality_1',
                url: 'new_url_1'
            },
            null,
            {},
            {
                id: 'stream_2',
                framerate: 'new_framerate_2',
            },
            {
                id: 'stream_3',
                quality: 'new_quality_3',
                url: 'new_url_3'
            },
        ];
        
        spotMonitorHelper.updateAllSpotMonitorStreams( camera_1, streams, function(err) {
            assert.ok(!err);
            var spotStreams = camera_1.spotMonitorStreams;

            //TODO: cleanup repetition
            assert.ok( spotStreams['new_stream'] );
            assert.ok( spotStreams['stream_3'] );
            assert.ok( spotStreams['stream_4'] );

            assert.ok( spotStreams['stream_1'] );
            assert.equal( spotStreams['stream_1'].id, 'stream_1' );
            assert.equal( spotStreams['stream_1'].quality, 'new_quality_1' );
            assert.equal( spotStreams['stream_1'].resolution, 'new_resolution_1' );

            assert.ok( spotStreams['stream_2'] );
            assert.equal( spotStreams['stream_2'].id, 'stream_2' );
            assert.equal( spotStreams['stream_2'].framerate, 'new_framerate_2' );
            assert.equal( spotStreams['stream_2'].quality, 'should_not_change_2' );

            assert.ok( spotStreams['stream_3'] );
            assert.equal( spotStreams['stream_3'].id, 'stream_3' );
            assert.equal( spotStreams['stream_3'].framerate, 'should_not_change_3' );
            assert.equal( spotStreams['stream_3'].quality, 'new_quality_3' );

            assert.ok( spotStreams['stream_4'] );
            assert.equal( spotStreams['stream_4'].id, 'stream_4' );
            assert.equal( spotStreams['stream_4'].framerate, 'framerate_should_not_change_4' );
            assert.equal( spotStreams['stream_4'].quality, 'quality_should_not_change_4' );

            done();
        });
    });
});
/* end of updateAllSpotMonitorStreams */


/**
 * updateSpotMonitorStream
 *
 * add array of spot monitor streams to given a camera
 *
 * @param { Camera object } camera  camera object
 * @param { object } stream         new stream attributes
 * @param { function } cb(err)      callback function
 */
describe('updateSpotMonitorStream', function() {

    var camera = _.clone( _cameraWithoutStreams );
    var new_streams = [];
    for (var i = 0; i < 5; i++) {
        var s = _.clone( _stream );
        s.id = 'stream_' + i;
        new_streams.push(s);
    }

    it('should reject invalid camera params', function(done) {

        spotMonitorHelper.updateSpotMonitorStream( null, new_streams, function(err) {
            assert.equal(err, 'invalid params');
            spotMonitorHelper.updateSpotMonitorStream( undefined, new_streams, function(err) {
                assert.equal(err, 'invalid params');
                spotMonitorHelper.updateSpotMonitorStream( 'x', new_streams, function(err) {
                    assert.equal(err, 'invalid params');
                    spotMonitorHelper.updateSpotMonitorStream( {}, new_streams, function(err) {
                        assert.equal(err, 'invalid params');
                        spotMonitorHelper.updateSpotMonitorStream( [], new_streams, function(err) {
                            assert.equal(err, 'invalid params');
                            done();
                        });
                    });
                });
            });
        });
    });


    it ('should reject invalid stream param', function(done) {

        spotMonitorHelper.updateSpotMonitorStream( camera, 'x', function(err) {
            assert.equal(err, 'invalid params');
            spotMonitorHelper.updateSpotMonitorStream( camera, null, function(err) {
                assert.equal(err, 'invalid params');
                spotMonitorHelper.updateSpotMonitorStream( camera, undefined, function(err) {
                    assert.equal(err, 'invalid params');
                    done();
                });
            });
        });
    });

    it ('should reject streams with invalid IDs', function(done) {
        camera.spotMonitorStreams = {
            'stream_1': {
                id: 'stream_1',
            }
        };

        var stream = {
            id: 'x'
        };

        spotMonitorHelper.updateSpotMonitorStream( camera, stream, function(err) {
            assert.equal(err, 'invalid stream ID');
            delete stream.id;
            spotMonitorHelper.updateSpotMonitorStream( camera, stream, function(err) {
                assert.equal(err, 'invalid stream ID');
                done();
            });
        });
    });


    it('should restart stream (update url) only when certain params are updated', function(done) {
        var camera_1 = _.clone( _cameraWithoutStreams );
        camera_1.spotMonitorStreams = {
            'stream_1': {
                id: 'stream_1',
                url: 'old_url_1',
                quality: 'old_quality_1'
            },
            'stream_2': {
                id: 'stream_2',
                url: 'old_url_2',
                framerate: 'old_framerate_2'
            }
        };

        var stream_1 = {
            id: 'stream_1',
            quality: 'new_quality_1'
        }

        var stream_2 = {
            id: 'stream_2',
            something_else: 'new_quality_1'
        }

        spotMonitorHelper.updateSpotMonitorStream( camera_1, stream_1, function(err) {
            assert.ok(!err);
            assert.equal(camera_1.spotMonitorStreams['stream_1'].url, 'fake_url');
            assert.equal(camera_1.spotMonitorStreams['stream_1'].quality, 'new_quality_1');
            spotMonitorHelper.updateSpotMonitorStream( camera_1, stream_2, function(err) {
                assert.ok(!err);
                assert.equal(camera_1.spotMonitorStreams['stream_2'].url, 'old_url_2');
                done();
            });
        });
    });
});
/* end of updateSpotMonitorStream */


/**
 * restartSpotMonitorStream
 *
 * setup camera when necessary, retrieve and update rtsp url
 *
 * @param { Camera object } camera      camera object
 * @param { array } streamId 
 * @param { function } cb(err)          callback function
 */
describe('restartSpotMonitorStream', function() {

    var camera = _.clone( _cameraWithoutStreams );

    camera.spotMonitorStreams = {
        'stream_1': {
            id: 'stream_1'
        }
    };

    it('should reject invalid camera params', function(done) {

        spotMonitorHelper.restartSpotMonitorStream( null, 'stream_1', function(err) {
            assert.equal(err, 'invalid params');
            spotMonitorHelper.restartSpotMonitorStream( undefined, 'stream_1', function(err) {
                assert.equal(err, 'invalid params');
                spotMonitorHelper.restartSpotMonitorStream( 'x', 'stream_1', function(err) {
                    assert.equal(err, 'invalid params');
                    spotMonitorHelper.restartSpotMonitorStream( {}, 'stream_1', function(err) {
                        assert.equal(err, 'invalid params');
                        spotMonitorHelper.restartSpotMonitorStream( [], 'stream_1', function(err) {
                            assert.equal(err, 'invalid params');
                            done();
                        });
                    });
                });
            });
        });
    });

    
    it('should reject invalid streamId', function(done) {
        spotMonitorHelper.restartSpotMonitorStream( camera, null, function(err) {
            assert.equal(err, 'invalid params');
            spotMonitorHelper.restartSpotMonitorStream( camera, 'x', function(err) {
                done();
            });
        });
    });
});
/* end of restartSpotMonitorStream */


/**
 * getSpotMonitorStreamsJSON
 *
 * Return spot monitor streams data as a json array
 * NOTE: update this method when changing spot monitor stream data attributes
 *
 * @param { Camera object } camera    camera object
 * @return { array } Json array containing all spot monitor streams object
 */
describe('getSpotMonitorStreamsJSON', function() {

    it('should reject invalid camera params', function() {

        var r = spotMonitorHelper.getSpotMonitorStreamsJSON( null );
        assert.equal(r, null);

        var r = spotMonitorHelper.getSpotMonitorStreamsJSON( undefined );
        assert.equal(r, null);

        var r = spotMonitorHelper.getSpotMonitorStreamsJSON( 'x' );
        assert.equal(r, null);

        var r = spotMonitorHelper.getSpotMonitorStreamsJSON( {} );
        assert.equal(r, null);

        var r = spotMonitorHelper.getSpotMonitorStreamsJSON( [] );
        assert.equal(r, null);
    });


    it('should return empty array when there are no streams', function() {

        var camera = _.clone( _cameraWithoutStreams );
        camera.spotMonitorStreams = {};

        var r = spotMonitorHelper.getSpotMonitorStreamsJSON( camera );
        assert.ok( _.isEqual(r, []) );
    });


    it('should return array with streams data', function() {

        var camera = _.clone( _cameraWithoutStreams );
        camera.spotMonitorStreams = {
            'stream_1': {
                id: 'stream_1',
                url: 'url_1',
                quality: 'quality_1'
            },
            'stream_2': {
                id: 'stream_2',
                name: 'name_2',
            }
        };

        var r = spotMonitorHelper.getSpotMonitorStreamsJSON( camera );
        assert.equal( r.length, 2 );

        assert.equal( r[0].id, 'stream_1' );
        assert.equal( r[0].url, 'url_1' );
        assert.equal( r[0].quality, 'quality_1' );
        assert.ok( !r[0].bitrate );

        assert.equal( r[1].id, 'stream_2' );
        assert.ok( !r[1].url);
        assert.equal( r[1].name, 'name_2' );
    });
});
/* end of getSpotMonitorStreamsJSON */


/**
 * removeSpotMonitorStream
 *
 * remove spot monitor from camera
 *
 * @param { CamerasController object } camerasController    camera object
 * @param { String } camId      camera ID
 * @param { String } streamId   stream ID
 * @param { function } cb       callback function
 */
describe('removeSpotMonitorStream', function() {

    it('should reject invalid cameraController param', function(done) {

        spotMonitorHelper.removeSpotMonitorStream( null, 'cam_1', 'stream_1', function(err) {
            assert.equal(err, 'invalid CamerasController object');
            spotMonitorHelper.removeSpotMonitorStream( undefined, 'cam_1', 'stream_1', function(err) {
                assert.equal(err, 'invalid CamerasController object');
                spotMonitorHelper.removeSpotMonitorStream( 'x', 'cam_1', 'stream_1', function(err) {
                    assert.equal(err, 'invalid CamerasController object');
                    done();
                });
            });
        });
    });

});
/* end of removeSpotMonitorStream */
