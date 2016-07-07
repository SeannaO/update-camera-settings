'use strict';

/* * *
 * collection of functions used by camerasController and cameraModel to handle spot monitor streams
 */

var _    = require('lodash');
var uuid = require('./uuid');


/**
 * addAllSpotMonitorStreams
 *
 * add array of spot monitor streams to given a camera
 *
 * @param { Camera object } camera          camera object
 * @param { array } spotMonitorStreams      array of spot monitor streams
 * @param { function } cb(err)              callback function
 */
var addAllSpotMonitorStreams = function( camera, spotMonitorStreams, cb ) {

    cb = validateCallback( cb );

    if (
        !isValidCamera( camera ) ||
        !spotMonitorStreams || 
        !Array.isArray( spotMonitorStreams )
    ) {
        return cb('invalid params');
    }

    var nStreams = spotMonitorStreams.length,
        counter  = 0;

    if (!nStreams) {
        // nothing to be done
        return cb();
    }

    // TODO: async parallel
    for (var i in spotMonitorStreams) {
        var stream = spotMonitorStreams[i];
        addSpotMonitorStream( camera, stream, function() {
            counter++;
            if ( counter == nStreams ) { 
                cb(); 
            }
        });
    }
}; 
/* end of addAllSpotMonitorStreams */


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
var addSpotMonitorStream = function( camera, stream, cb ) {

    cb = validateCallback( cb );

    if (
        !isValidCamera( camera ) ||
        !isValidStream( stream )
    ) {
        return cb('invalid params');
    }

    if (!stream.id) {
        return cb('stream contains no ID');
    }

    camera.api.getRtspUrl({

        resolution:     stream.resolution,
        framerate:      stream.framerate,
        quality:        stream.quality,
        suggested_url:  stream.url,
        bitrate:        stream.bitrate,
        camera_no:      stream.camera_no

    }, function(url) {

        stream.url = url;
        camera.spotMonitorStreams[stream.id] = stream;
        cb( null, stream );
    });
};
/* end of addSpotMonitorStream */


/**
 * reAddMissingSpotMonitorStreams
 *
 * compare two camera objects, 
 * adding spot monitor streams from the first one that are missing in the second one
 *
 * @param { object } curr_camera    camera json object (current state)
 * @param { object } cam            camera json object (to be updated with missing streams)
 */
var reAddMissingSpotMonitorStreams = function( curr_camera, cam ) {

    if (
        !isValidCamera( curr_camera ) ||
        !isValidCamera( cam )
    ) {
        console.error('[spot-monitor-helper : reAddMissingSpotMonitorStreams ]  invalid params');
        return 'invalid params';
    }

    var spotMonitorStream_ids = _.map( cam.spotMonitorStreams, 'id' );

    // re-add missing streams
    for (var i in curr_camera.spotMonitorStreams) {

        var stream = curr_camera.spotMonitorStreams[i];

        if (spotMonitorStream_ids.indexOf( stream.id ) < 0 ) { 
            cam.spotMonitorStreams.push( stream );
        }
    }
};
/* end of reAddMissingSpotMonitorStreams */


/**
 * generateIDForNewStreams
 *
 * go through spot monitor streams in a camera object, generating ID if necessary (eg. new stream)
 * returns hash of the streams by ID
 *
 * @param { object } cam    camera json object
 *                          - this is the object coming from the request;
 *                            it has an array of spotMonitorStreams
 *                            instead of a hash
 * @return { object }       spot monitor streams hashed by ID
 */
var generateIDForNewStreams = function( cam ) {

    if ( !isValidCamera(cam) ) {
        return {};
    }

    var spotMonitorStreamsHash = {};

    for (var s in cam.spotMonitorStreams) {

        if ( !isValidStream(cam.spotMonitorStreams[s]) ) { continue; }

        if (
            typeof cam.spotMonitorStreams[s].id == 'undefined' || 
            !cam.spotMonitorStreams[s].id || 
            !cam.spotMonitorStreams[s].id.length
        ) {
            cam.spotMonitorStreams[s].id = uuid.generateUUID();
        }

        spotMonitorStreamsHash[ cam.spotMonitorStreams[s].id ] = cam.spotMonitorStreams[s];
    }

    return spotMonitorStreamsHash;
};
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
var updateAllSpotMonitorStreams = function( camera, new_streams, cb ) {

    cb = validateCallback( cb );

    if ( !isValidCamera( camera ) ) {
        return cb('invalid camera');
    }

    if ( !new_streams || !Array.isArray(new_streams) ) {
        return cb('invalid streams');
    }

    if ( new_streams.length == 0 ) {
        // nothing to add/update
        return cb();
    }

    camera.api.setCameraParams({
        ip:        camera.ip,
        password:  camera.password,
        username:  camera.username
    });

    var total = new_streams.length,
        done  = false;

    for ( var s in new_streams ) {

        var stream = new_streams[s];
        if ( !isValidStream(stream) || !stream.id ) { continue; }

        // add a new stream
        if ( !camera.spotMonitorStreams[ stream.id ] ) { 
            addSpotMonitorStream( camera, stream, function() {
                total--;
                if (total <= 0 && !done && cb) {
                    done = true;
                    cb(); 
                }
            });
        } else {  // or update a stream if it already exists
            updateSpotMonitorStream( camera, stream, function() {
                total--;
                if (total <= 0 && !done && cb) {
                    done = true;
                    cb();
                }
            });
        }
    }
};
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
var updateSpotMonitorStream = function( camera, stream, cb ) {

    cb = validateCallback( cb );

    if (
        !isValidCamera( camera ) ||
        !isValidStream( stream )
    ) {
        return cb('invalid params');
    }

    var id = stream.id,
        need_restart = false;

    if (
        !id || 
        !camera.spotMonitorStreams[id]
    ) { 
        return cb('invalid stream ID'); 
    }

    camera.spotMonitorStreams[id].name = stream.name;

    // these are the parameters that require restarting the stream / re-configuring the camera
    var restartParams = ['resolution', 'framerate', 'quality', 'url', 'ip', 'camera_no', 'bitrate'];

    // iterates through restart params, checks if any of them changed, 
    // restarting stream if needed
    for (var i in restartParams) {

        var param = restartParams[i];

        if ( stream[param] && camera.spotMonitorStreams[id][param] !== stream[param] ) {

            camera.spotMonitorStreams[id][param] = stream[param];
            need_restart = true;
            console.log('[spot-monitor-helper : updateSpotMonitorStream] reconfiguring stream because of ' + param);
        }
    }

    if (need_restart) {
        restartSpotMonitorStream( camera, id, cb );
    } else {
        cb();
    }
};
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
var restartSpotMonitorStream = function( camera, streamId, cb ) {

    cb = validateCallback( cb );

    if (
        !isValidCamera( camera ) ||
        !isValidStream( camera.spotMonitorStreams[streamId] ) 
    ) {
        return cb('invalid params');
    }

    var stream = camera.spotMonitorStreams[ streamId ];

    // refreshes rtsp url
    camera.api.getRtspUrl({
        resolution:     stream.resolution,
        framerate:      stream.framerate,
        quality:        stream.quality,
        bitrate:        stream.bitrate,
        suggested_url:  stream.url,
        camera_no:      stream.camera_no
    }, function(url) {

        camera.spotMonitorStreams[streamId].url  = url;
        camera.spotMonitorStreams[streamId].rtsp = url;

        cb();
    });
};
/* end of restartSpotMonitorStream */


/**
 * Return spot monitor streams data as a json array
 * NOTE: update this method when changing spot monitor stream data attributes
 *
 * @param { Camera object } camera    camera object
 * @return { array } Json array containing all spot monitor streams object
 */
var getSpotMonitorStreamsJSON = function( camera ) {

    if ( !isValidCamera(camera) ) {
        return; 
    }

    var streamIds = Object.keys(camera.spotMonitorStreams);
    var streams = [];

    for (var id in camera.spotMonitorStreams) {
        var s = camera.spotMonitorStreams[id];
        streams.push({
            url:         s.url,
            rtsp:        s.rtsp,
            resolution:  s.resolution,
            quality:     s.quality,
            framerate:   s.framerate,
            bitrate:     s.bitrate,
            name:        s.name,
            id:          id,
            camera_no:   s.camera_no,
        }); 
    }

    return streams;
}; 
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
var removeSpotMonitorStream = function( camerasController, camId, streamId, cb ) {

    cb = validateCallback( cb );

    if ( !isValidController( camerasController ) ) {
        return cb('invalid CamerasController object');
    }

    var camera = camerasController.findCameraById( camId );
    
    if ( !camera || !isValidCamera( camera.cam ) ) {
        return cb('camera not found');
    }	

    camera = camera.cam;

    if ( !camera.spotMonitorStreams[streamId] ) {
        return cb('stream not found');
    }

    camerasController.db.find({ _id : camId  }, function(err, docs) {

        if (err) {
            return cb('camera not found in db');
        }

        if ( !docs || !docs[0] ) {
            console.error('[spot-monitor-helper : removeSpotMonitorStream]  camera ' + camId + ' not found in db');
            return cb('camera not found');
        }

        var spotMonitorStreamsHash = docs[0].spotMonitorStreams;	

        if ( !spotMonitorStreamsHash || !spotMonitorStreamsHash[streamId] ) {
            console.error('[spot-monitor-helper : removeSpotMonitorStream]  spotMonitorStream ' + streamId + ' not found in db');
            return cb('stream not found');
        }

        delete spotMonitorStreamsHash[streamId];

        camerasController.db.update({ _id : camId  }, { 
            $set: { 
                spotMonitorStreams: spotMonitorStreamsHash
            } 
        }, { multi: false }, function (err, numReplaced) {
            if (err) {

                console.error('[spot-monitor-helper : removeSpotMonitorStream]  update camera db error: ');
                console.error(err);
                cb(err);

            } else {

                delete camera.spotMonitorStreams[ streamId ];
                camerasController.db.loadDatabase();
                camerasController.emit('update', camera);
                cb();
            }
        });
    });
};
/* end of removeSpotMonitorStream */


/**
 * isValidController
 *
 * check if camerasController is a valid input
 *
 * @param { CamerasController object }    camerasController
 * @return { boolean }  'true' if valid
 */
var isValidController = function( camerasController ) {

    return (
        camerasController &&
        typeof camerasController === 'object'
    );
};


/**
 * isValidCamera
 *
 * check if camera is a valid input
 *
 * @param { Camera object } camera    camera object
 * @return { boolean }  'true' if valid
 */
var isValidCamera = function( camera ) {

    return (
        camera &&
        typeof camera === 'object' &&
        camera.spotMonitorStreams && 
        typeof camera.spotMonitorStreams === 'object'
    );
};


/**
 * isValidStream
 *
 * check if stream is a valid input
 *
 * @param { object } camera    stream object
 * @return { boolean }  'true' if valid
 */
var isValidStream = function( stream ) {

    return (
        stream && 
        typeof stream === 'object'
    );
};


/**
 * validateCallback
 *
 * check if callback is a valid function;
 * return callback if valid, or a dummy function if not valid
 *
 * @param { function } f
 * @return { function }  'f' if valid function, dummy function otherwise
 */
var validateCallback = function( f ) {
    if (f && typeof(f) === 'function') {
        return f
    } else {
        return function() {};
    }
};


exports.isValidStream     = isValidStream;
exports.isValidCamera     = isValidCamera;
exports.isValidController = isValidController;
exports.validateCallback  = validateCallback;

exports.addSpotMonitorStream        = addSpotMonitorStream;
exports.removeSpotMonitorStream     = removeSpotMonitorStream;
exports.updateSpotMonitorStream     = updateSpotMonitorStream;
exports.restartSpotMonitorStream    = restartSpotMonitorStream;
exports.addAllSpotMonitorStreams    = addAllSpotMonitorStreams;
exports.getSpotMonitorStreamsJSON   = getSpotMonitorStreamsJSON;
exports.updateAllSpotMonitorStreams = updateAllSpotMonitorStreams;

exports.generateIDForNewStreams        = generateIDForNewStreams;
exports.reAddMissingSpotMonitorStreams = reAddMissingSpotMonitorStreams;
