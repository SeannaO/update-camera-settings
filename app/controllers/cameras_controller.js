'use strict';

var _               = require('lodash');
var Datastore       = require('nedb');                           //
var Camera          = require('./../models/camera_model');       //
var EventEmitter    = require('events').EventEmitter;            //
var util            = require('util');                           //
var checkH264       = require('../helpers/ffmpeg.js').checkH264;
var Thumbnailer     = require('../helpers/thumbnailer.js');
var SensorData      = require('../models/sensor_model.js');
var mp4Handler      = require('./mp4_controller.js');
var cameraValidator = require('../helpers/cameraValidator.js');
var path            = require('path');
var fs              = require('fs');
var uuid            = require('../helpers/uuid');

var spotMonitorHelper = require('../helpers/spot-monitor.js');

function CamerasController( cam_db_filename, videosFolder, cb ) {

    var self = this;
	this.cameras = [];
	this.loaded = false;

	this.snapshotQ = [];

	this.thumbnailer = new Thumbnailer();

    this.db = new Datastore({ filename: cam_db_filename });

	self.setup( function(err) {

		if (err) {

			console.error('[CamerasController.setup]  ' + err);
			setTimeout( function() {
				console.error('[CamerasController.setup]  error when loading database; exiting...');
				process.exit();		
			}, 1000);

		} else {

			self.loaded = true;

			setTimeout( function() {
				if (cb) {
					cb(err);
				}
			}, 1000);
		}
	});

    this.videosFolder = videosFolder;

	this.mp4Handler = mp4Handler;

	self.deletionQueue = [];
	self.expiredQueue = [];

	self.checkSnapshotQ();
	
	self.periodicallyDeleteChunksOnQueue();
	self.periodicallyDeleteExpiredChunks();

	self.periodicallyCheckForExpiredChunks();

	self.thumbnailer.on('new_thumb', function(thumb) {
		self.emit('new_thumb', thumb);
	});
}

util.inherits(CamerasController, EventEmitter);

//
// remove one of the methods later
//
CamerasController.prototype.getAllCameras = function() {
	return this.cameras;
};

CamerasController.prototype.getCameras = function() {
    return this.cameras;
};
//
//


CamerasController.prototype.requestSnapshot = function( camId, req, res ) {

	var snapshot = {};
	snapshot.camId     = camId;
	snapshot.req       = req;
	snapshot.res       = res;
	snapshot.cancelled = false;

	res.on('close', function() {
		snapshot.cancelled = true;
	});

	this.snapshotQ.push( snapshot );
};


CamerasController.prototype.checkSnapshotQ = function() {
	
	var self = this;
	var snapshot = self.snapshotQ.shift();

	if ( snapshot && !snapshot.cancelled ) {
		self.takeSnapshot( snapshot.camId, snapshot.req, snapshot.res, function() {
			self.checkSnapshotQ();
		});
	} else {
		
		setTimeout( function() {
			self.checkSnapshotQ();
		}, 1000 );
	}
};

// TODO: this doesnt seem to be used 
CamerasController.prototype.getCameraOptions = function(params, cb){
    var self = this;
    var camId = params._id;
	this.getCamera( camId, function(err, cam) {
		if (err || !cam || cam.length === 0) {
			cb( err, null );
		} else {
			cam.api.setCameraParams(params);
			cam.api.getResolutionOptions(function(err, resolutions){
				cb( err, { framerate_range: cam.api.getFrameRateRange(), resolutions: resolutions, quality_range: cam.api.getVideoQualityRange()});
			});
			
		}
	});
};


CamerasController.prototype.takeSnapshot = function( camId, req, res, cb ) {

	var self = this;

    this.getCamera( camId, function(err, cam) {

		var streamId;

		if (cam) {
			streamId = req.query.stream || Object.keys(cam.streams)[0];
		}

        if ( err || !cam || !cam.streams || !cam.streams[streamId]) {
            res.json(500, { error: err } );
			if (cb) cb();
        } else {
			
            self.mp4Handler.takeSnapshot( cam.streams[streamId].db, cam, req, res, function() {
            	// res.json(500, {error:"unable to take snapshot because no data was found at this selected time."});
				if (cb) {
					cb();
				}
			});
        }
    });	
};


CamerasController.prototype.listVideosByCamera = function( camId, streamId, start, end, cb ) {
    
    var self = this;
    var cam = self.findCameraById( camId ).cam;    

    if (!cam) {
        cb('camera ' + camId + ' not found');
        return;
    }
	if (!cam.streams[streamId]) {
		cb('stream ' + streamId + ' of camera ' + camId + ' not found');
		return;
	}

    start = parseInt( start, 10 );
    end   = parseInt( end, 10 );

    cam.streams[streamId].db.searchVideosByInterval( start, end, function(err, fileList, offset) {
        if (err) {
            cb(err);
        } else {
            cb(err, fileList, offset);
        }
    });
};


CamerasController.prototype.listCameras = function( cb ) {
    
	var self = this;
	var err;

	cb( err, self.cameras );                        
};


CamerasController.prototype.getCamera = function(camId, cb) {

    var self = this;
    var err;
    var cam = self.findCameraById( camId ).cam;
    cb( err, cam );
};


CamerasController.prototype.getMotion = function(camId, cb) {

    var self = this;

	this.getCamera( camId, function(err, cam) {
		if (err || !cam || cam.length === 0) {
			cb( err, null );
		} else {
			cb( err, cam.getMotionParams() );
		}
	});
};


/**
 * Periodically and recursively queries each camera for expired chunks,
 *   adding them to the 'expiredChunks' queue.
 *   It requests at most 'maxChunksPerCamera' expired files per camera.
 *
 * @param { cam_ids_list } array IDs of the cameras, used only for the recursive call;
 */
CamerasController.prototype.periodicallyCheckForExpiredChunks = function( cam_ids_list ) {
	
	var maxChunksPerCamera = 120;  // ~10s/chunk = ~60 chunks/10min/stream
	var millisPeriodicity  = 1000 * 60 * 10; // checks every 10 minutes
	
	if (process.env['NODE_ENV'] === 'development') {
		millisPeriodicity = 1000 * 10 * 1;		// !! checks each 10s - development only !!
	}

	var self = this;

	if (!cam_ids_list) {

		// limit size of 'expiredQueue' (deletion queue for expired chunks)
		// if not empty, check again 1 min later
		if ( self.expiredQueue.length > 0 ) {
			console.log('[camerasController.periodicallyCheckForExpiredChunks]  expiredQueue is not empty; will check again in 1 min');
			setTimeout( 
				function() {
					self.periodicallyCheckForExpiredChunks();
				},
				1 * 60 * 1000
			);
			return;
		}
		// - -

		var ids = self.cameras.map( 
			function(c) {
				return( c._id );
			}
		);
		
		self.periodicallyCheckForExpiredChunks( ids );

		return;
	}
	
	// base of recursion
	if (cam_ids_list.length === 0) {
		setTimeout( 
			function() {
				self.periodicallyCheckForExpiredChunks();
			},
			millisPeriodicity
		);

		return;
	}
	
	var camId = cam_ids_list.shift();
	
	self.getCamera( camId, function(err, cam) {

		if (cam && !err) {

			cam.getExpiredChunks( maxChunksPerCamera, 
				function( chunks ) {

					// add camera id to the chunk
					// before pushing it to 'expiredQueue'
					chunks = chunks.map( function(d) {
						d.cam_id = cam._id;
						return d;
					});
					
					self.addChunksToExpiredQueue( chunks );
					self.periodicallyCheckForExpiredChunks( cam_ids_list );
				}
			);
		} else {
			self.periodicallyCheckForExpiredChunks( cam_ids_list );
		}
	});
};


/**
 * Appends an array of chunks to 'expiredQueue'
 *
 * @param { chunks_list } array Chunk objects
 */
CamerasController.prototype.addChunksToExpiredQueue = function( chunk_list ) {

	var self = this;

	for (var c in chunk_list) {
		self.expiredQueue.push( chunk_list[c] );
	}
};


CamerasController.prototype.addChunksToDeletionQueue = function( chunk_list ) {

	var self = this;

	for (var c in chunk_list) {
		self.deletionQueue.push( chunk_list[c] );
	}
};


/**
 * Periodically pops a chunk from expiredQueue and deletes it;
 *   repeats every 150ms if queue is not empty
 *   otherwise, waits 5s before checking again
 */
CamerasController.prototype.periodicallyDeleteExpiredChunks = function() {
	
	var self = this;

	var chunk = self.expiredQueue.shift();
	

	if (!chunk) {
		setTimeout( function() {
			self.periodicallyDeleteExpiredChunks();
		}, 5000);
	} else {

		self.deleteChunk( chunk, function(data) {

			if (chunk.cb) {
				chunk.cb();
			}
		});

		// 150ms means ~6 chunks/sec will be deleted;
		// assuming each stream records 1 chunk/10s,
		// this would theoretically be able to keep up with 30 cameras with 2 streams each
		setTimeout( 
			function() {
				self.periodicallyDeleteExpiredChunks();
			}, 150
		);
	}
};


CamerasController.prototype.periodicallyDeleteChunksOnQueue = function() {
	
	var self = this;

	var chunk = self.deletionQueue.shift();
	
	if (!chunk) {
		setTimeout( function() {
			self.periodicallyDeleteChunksOnQueue();
		}, 5000);
	} else {

		self.deleteChunk( chunk, function(data) {

			if (chunk.cb) {
				chunk.cb();
			}
		});

		// 150ms means ~6 chunks/sec will be deleted;
		// assuming each stream records 1 chunk/10s,
		// this would theoretically be able to keep up with 30 cameras with 2 streams each
		setTimeout( 
			function() {
				self.periodicallyDeleteChunksOnQueue();
			}, 150
		);
	}
};


CamerasController.prototype.deleteChunk = function( chunk, cb ) {
	
	var self = this;

	self.getCamera(chunk.cam_id, function( err, cam ) {
		if(!err && cam) {
			cam.deleteChunk( chunk.stream_id, chunk, function(data) {
				// console.log( "- deleting chunk " + chunk.id + " from camera: " + cam._id );
				if (cb) cb( data );
			});
		} else {
			console.error( err );
			cb(err);
		}
	});
};


CamerasController.prototype.deleteOldestChunks = function( numChunks, cb ) {

	var self = this;

	if ( self.deletionQueue.length > 0 ) {
		return;
	}

	self.getOldestChunks( numChunks, function(oldChunks) {
			
		self.addChunksToDeletionQueue( oldChunks );
		cb( oldChunks );
	});
};


CamerasController.prototype.getOldestChunksFromCamera = function( numChunks, camera, cb ) {

	camera.getOldestChunks( numChunks, function( data ) {
		
		data = data.map( function(d) {
			d.cam_id = camera._id;
			return d;
		});

		cb( data );
	});
};


/**
 * Returns array of 'numChunks' oldest chunks from each camera
 *
 *   the returned array is shuffled so that each stream
 *   will have chunks deleted statistically at the same rate,
 *   preventing backpressure caused by prioritizing 
 *   the deletion of older (likely low bitrate) streams
 *   while recording high bitrate ones
 *
 * @param { numChunks } number Max number of oldest chunks per camera
 */
CamerasController.prototype.getOldestChunks = function( numChunks, cb ) {

	var self = this;

	var oldChunks = [];
	var n = 0;

	for (var c in self.cameras) {
		var cam = self.cameras[c];
		self.getOldestChunksFromCamera( numChunks, cam, function( data ) {
			
			oldChunks = oldChunks.concat( data );
			n++;
			if (n === self.cameras.length) {
				cb( _.shuffle(oldChunks) );
			}
		});
	}
};


CamerasController.prototype.insertNewCamera = function( cam, cb ) {

    var self = this;

	var err = cameraValidator.validate( cam );
	if (err) {
		console.error('[camerasController.insertNewCamera]  input error: ' + err);
		return cb( err );
	}

	if (typeof cam.username == "undefined") {
		cam.username = '';
	}
	if (typeof cam.password == "undefined") {
		cam.password = '';
	}

	if (!cam.ip || !cam.manufacturer) {
		cb('wrong params when creating camera', '{error: wrong params when creating cameras}');
		return;
	}
    
	cam.schedule_enabled = true;
    cam.schedule = {"sunday":{"open":{"hour":0, "minutes":0},"close":{"hour":23, "minutes":59}},"monday":{"open":{"hour":0, "minutes":0},"close":{"hour":23, "minutes":59}},"tuesday":{"open":{"hour":0, "minutes":0},"close":{"hour":23, "minutes":59}},"wednesday":{"open":{"hour":0, "minutes":0},"close":{"hour":23, "minutes":59}},"thursday":{"open":{"hour":0, "minutes":0},"close":{"hour":23, "minutes":59}},"friday":{"open":{"hour":0, "minutes":0},"close":{"hour":23, "minutes":59}},"saturday":{"open":{"hour":0, "minutes":0},"close":{"hour":23, "minutes":59}}};


	var streamsHash = {};
	var original_streams = cam.streams;
	if (cam.streams && cam.streams.length > 0){
		for (var s in cam.streams) {
			if (!s || !cam.streams[s]) {
				console.error('[camerasController]  attempt to insert null stream');
				continue;
			}
			if (!cam.streams[s].id) {
				cam.streams[s].id = uuid.generateUUID();
			}
			streamsHash[ cam.streams[s].id ] = cam.streams[s];
		}
		cam.streams = streamsHash;
		cam.status = 'ready';
	}else{
		cam.status = 'missing camera stream(s)';
	}

        ////
        // spot monitor streams
        cam.spotMonitorStreams = spotMonitorHelper.generateIDForNewStreams( cam );
        //

	self.db.insert( cam, function( err, newDoc ) {
		if (err) {
			console.error("[camerasController]  error when inserting camera: " + err);
			cb( err, "{ success: false }" );
		} else {
			new Camera(newDoc, self.videosFolder, function( c ) {
				if (!c) {
					cb('undefined camera');
					return;
				}
				newDoc.streams = original_streams;
				self.pushCamera( c );
				self.emit("create", c);
				cb( null, c);          
			});
		}

		//if (self.indexFilesInterval) {
		//	clearInterval( self.indexFilesInterval );
		//	self.indexFiles();
		//}
	});
};


CamerasController.prototype.getCameraFromArray = function( i ) {
	return this.cameras[i];
};


CamerasController.prototype.pushCamera = function( cam ) {
  
	if (!cam) return;

    var self = this;
	
    self.cameras.push( cam );

	cam.on('bps', function(data) {
		self.emit('bps', data);
	});

	cam.on('grid', function(data) {
		self.emit('grid', data);
	});

    cam.on('new_chunk', function( data ) {
		
        self.emit('new_chunk', data );
		self.thumbnailer.addChunk( data );
    });

    cam.on('camera_status', function( data ) {
		self.emit('camera_status', data);
    });

	cam.on('motion', function(data) {

		var sensorData = new SensorData(self.videosFolder + '/' + data.id + '/sensor', 10);

		data.value = isNaN( data.value ) ? 1 : data.value;

		sensorData.insert({timestamp: data.timestamp, value: data.value, datatype: "motion"})

		self.emit('motion', data);
	});

	cam.on('motionEvent', function(data) {
		self.emit('motionEvent', data);
	});
};


CamerasController.prototype.removeStream = function( camId, streamId, cb ) {

	var self = this;

	var camera = this.findCameraById( camId );

	if (!camera || !camera.cam) {
		if (cb) { cb( 'camera not found' ); }
		return;
	}	
	camera = camera.cam;
	if ( !camera.streams || !camera.streams[streamId] ) {
		if (cb) { cb('stream not found'); }
		return;
	}

	var from = path.join( this.videosFolder, camId, streamId );
	var to   = path.join( this.videosFolder, 'trash', streamId );

	fs.rename( from, to, function( err ) {

		if ( err ) {
			console.error( '[CamerasController.removeStream]  ' + err );
			if( cb ) { cb( err ); }
		} else {
			self.removeStreamFromDb( camId, streamId, cb );
		}
	});
};


CamerasController.prototype.removeStreamFromDb = function( camId, streamId, cb ) {
    
    var self = this;
	
    var camera = this.findCameraById( camId );
	
    if (!camera || !camera.cam) {
        cb( 'camera not found' );
        return;
    }	
	camera = camera.cam;
	if ( !camera.streams || !camera.streams[streamId] ) {
		cb('stream not found');
		return;
	}

	var streamsHash;

	self.db.find({ _id : camId  }, function(err, docs ) {

		if (!err) {

			if (!docs[0]) {
				console.error('[CamerasController.removeStream] camera ' + camId + ' not found on db');
				if(cb) cb('camera not found');
				return;
			}

			streamsHash = docs[0].streams;	

			if (!streamsHash || !streamsHash[streamId]) {
				console.error('[CamerasController.removeStream] stream ' + streamId + ' not found on db');
				if(cb) cb('stream not found');
				return;
			}

			// streamsHash[streamId].toBeDeleted = true;
			delete streamsHash[streamId];

			self.db.update({ _id : camId  }, { 
				$set: { 
					streams: streamsHash
				} 
			}, { multi: false }, function (err, numReplaced) {
				if (err) {
					console.error('[camerasController]  update camera db error: ');
					console.error(err);
					cb(err);
				} else {
					camera.removeStream( streamId );
					self.db.loadDatabase();
					self.emit('update', camera);
					cb();
				}
			});

		} else {
			cb('camera not found on db');		
			return;
		}
	});
};


CamerasController.prototype.removeCamera = function( camId, cb ) {

	var self = this;

	var camera = this.findCameraById( camId ).cam;
	if (!camera) {
		var err = '[CamerasController.removeCamera]  camera ' + camId + ' not found';
		console.error( err );
		if ( cb ) { cb( err ); }
		return;
	}

	var from = path.join( this.videosFolder, camId );
	var to   = path.join( this.videosFolder, 'trash', camId );

	fs.rename( from, to, function(rename_err) {

		if ( rename_err ) {
			console.error( '[CamerasController.removeCamera]  ' + rename_err );
			if( cb ) { cb( rename_err ); }
		} else {
			self.removeCameraFromDb( camId, cb );
		}
	});
};


CamerasController.prototype.removeCameraFromDb = function( camId, cb ) {

	var self = this;

	var camera = this.findCameraById( camId ).cam;
	if (!camera) {
		var err = '[CamerasController.removeCamera]  camera ' + camId + ' not found';
		console.error( err );
		if ( cb ) { cb( err ); }
		return;
	}

    self.db.remove({ _id: camId }, {}, function (err, numRemoved) {
        if( err ) {
            cb( err, numRemoved );
        } else {
			var whichCam = self.findCameraById( camId );
			if (!whichCam) {
				cb( err, 0 );
				return;
			}

			var cam = whichCam.cam;
			if (!cam) {
				cb( err, 0 );
				return;
			}

			var k = whichCam.index;

			cam.stopRecording();
			cam.stopMotionDetection();
			cam.removeAllListeners();
			cam.stopRetentionCheck();

			for (var i in cam.streams){
				cam.removeStream( i );	
			}
			//
			// set camera.delete = true
			//

			self.emit("delete", cam);

			self.cameras.splice(k,1);            
			refresh( function() {
				cb( err, numRemoved );
			});    
        }
    });
};


CamerasController.prototype.updateCamera = function(cam, cb) {

    var self = this;

    if (!cam || typeof(cam) !== 'object') {
        console.error('[CamerasController : updateCamera]  invalid params');
        return cb('invalid params');
    }

    var camera = this.findCameraById( cam._id );

    if (!camera) {
        cb( 'camera not found' );
        return;
    }

	// update current camera with new values;
	// missing streams need to be re-added
	var curr_camera = camera.cam.toJSON();
	cam = _.assign( curr_camera, cam );

	var err = cameraValidator.validate( cam ) || cameraValidator.validate( curr_camera );
	if (err) {
            console.error('[camerasController.updateCamera]  input error: ' + err);
            return cb( err );
	}

	// re-add streams that are missing from the request
	var stream_ids = _.map( cam.streams, 'id' );
	for (var i in curr_camera.streams) {
		var stream = curr_camera.streams[i];
                if (!stream) { continue; }
		if ( stream_ids.indexOf( stream.id ) < 0 ) { 
			cam.streams.push( stream );
		}
	}
	
	var streamsHash = {};
	if (cam.streams && cam.streams.length > 0) {
		for (var s in cam.streams) {
                    if (!cam.streams[s]) { continue; }
			if (typeof cam.streams[s].id == 'undefined' || !cam.streams[s].id || cam.streams[s].id.length <= 0) {
				cam.streams[s].id = uuid.generateUUID();
			}
			streamsHash[ cam.streams[s].id ] = cam.streams[s];
		}
		cam.status = 'ready';
	} else {
		cam.status = 'missing camera stream(s)';
	}

        ////
        // re-add missing spot monitor streams and generate ID for new ones
        spotMonitorHelper.reAddMissingSpotMonitorStreams( curr_camera, cam );
        var spotMonitorStreamsHash = spotMonitorHelper.generateIDForNewStreams( cam );
        //

	if (typeof cam.username == "undefined") {
		cam.username = camera.cam.username	|| '';
	}
	if (typeof cam.password == "undefined") {
		cam.password = camera.cam.password	|| '';
	}	

	self.db.update({ _id: cam._id }, { 
	    $set: {
	        name         : cam.name         || camera.cam.name,
	        manufacturer : cam.manufacturer || camera.cam.manufacturer,
	        ip           : cam.ip           || camera.cam.ip,
			id           : cam.id           || camera.cam.id,
	        username     : cam.username,
	        password     : cam.password,
	        streams      : streamsHash,
                spotMonitorStreams: spotMonitorStreamsHash,
	        status       : cam.status
	    } 
	}, { multi: true }, function (err, numReplaced) {
	    if (err) {
			console.log('[camerasController]  update camera db error: ');
			console.log(err);
	        cb(err);
	    } else {

	        self.db.loadDatabase();

	        camera.cam.name   = cam.name;
			camera.cam.id     = cam.id;
			camera.cam.status = cam.status;

			var need_restart_all_streams = false;

			if (cam.manufacturer && (camera.cam.manufacturer !== cam.manufacturer) ) {
				camera.cam.manufacturer = cam.manufacturer;
				need_restart_all_streams = true;
			}
			
			if ( cam.ip && (camera.cam.ip !== cam.ip) ) {
				camera.cam.ip_address = camera.cam.ip = cam.ip;
				need_restart_all_streams = true;
			}

			if ( camera.cam.username !== cam.username ){
				camera.cam.username = cam.username;
				need_restart_all_streams = true;
			}

			if ( camera.cam.password !== cam.password ){
				camera.cam.password = cam.password;
				need_restart_all_streams = true;
			}

			camera.cam.api.setCameraParams({
				ip: camera.cam.ip,
				password: camera.cam.password,
				username: camera.cam.username
			});
			
			if (need_restart_all_streams) {
				camera.cam.restartAllStreams();
			}
						
			camera.cam.updateAllStreams( cam.streams, function() {
				camera.cam.updateRecorder();
				self.emit("update", camera.cam);
				cb(err, camera.cam);
			});

                        spotMonitorHelper.updateAllSpotMonitorStreams( camera.cam, cam.spotMonitorStreams, function(err) {
                            if (err) {
                                console.error('[CamerasController : updateCamera]  ' + err);
                            }
                        });
	    }
	});
};
/* end of updateCamera */


/**
 * removeSpotMonitorStream
 *
 * a wrapper to spot-monitor-helper function of same name
 *
 * @param { String } camId    
 * @param { String } streamId
 * @param { function } cb  callback function
 */
CamerasController.prototype.removeSpotMonitorStream = function( camId, streamId, cb ) {
    spotMonitorHelper.removeSpotMonitorStream( this, camId, streamId, cb );
};


CamerasController.prototype.updateCameraSchedule = function(params, cb) {

    var self = this;
    var camera = this.findCameraById( params._id );
    
	if (!camera) {
        cb('camera not found');
        return;
    }
	
    var update_params = {schedule_enabled: params.schedule_enabled};
    if (params.schedule){
    	update_params = {
			schedule: params.schedule,
			schedule_enabled: params.schedule_enabled
		}
    }

    self.db.update({ _id: params._id }, { 
        $set: {
			schedule: params.schedule,
			schedule_enabled: params.schedule_enabled
		}
    }, { multi: false }, function (err, numReplaced) {
        if (err) {
            cb(err);
        } else {
			self.db.loadDatabase();
            camera.cam.schedule_enabled = params.schedule_enabled;
            if (params.schedule){
				camera.cam.setRecordingSchedule(params.schedule);
            }
            camera.cam.updateRecorder();
            self.emit("schedule_update", camera.cam);
            cb(err, camera.cam);
        }
    });   

};


CamerasController.prototype.saveMotionParams = function( camera, cb ) {

	var self = this;

	self.db.update({ _id: camera._id }, { 
	    $set: {
			motionParams: camera.motionParams
	    } 
	}, { multi: true }, function (err, numReplaced) {
	    if (err) {
			console.log('[camerasController]  update camera db error: ');
			console.log(err);
	        cb(err);
	    } else {
	        self.db.loadDatabase();
			cb(null, '');
		}
	});
};

CamerasController.prototype.setROI = function(params, cb) {


    var self = this;
    var camera = this.findCameraById( params._id ).cam;
    
	if (!camera) {
        cb("{error: 'camera not found'}");
        return;
    }

	camera.setROI( params.roi );

	self.saveMotionParams( camera, cb );
};


/**
 * Get retention stats for a specific camera
 *
 * @param { cam_id } String  id of the camera
 * @param { start } Number  interval start
 * @param { end } Number  interval end
 *
 * @param { cb } Function callback( err, d )
 * 		- err (String): error message, null if none
 * 		- d (Object): hash of stats object per stream, null on error
 * 			{ <stream_id>: {retention_stats} }
 */
CamerasController.prototype.getRetention = function( cam_id, start, end, cb ) {

	if (!cb) { return; }

    var self = this;
    var camera = this.findCameraById( cam_id ).cam;
    
	if (!camera) {
        cb('camera not found');
        return;
    }

	camera.getRetention( start, end, function(err, ret) {
		cb( err, ret );
	});
};


CamerasController.prototype.updateCameraMotion = function(params, cb) {

    var self = this;
    var camera = this.findCameraById( params._id ).cam;
    
	if (!camera) {
        cb("{error: 'camera not found'}");
        return;
    }
	
	var isEnabled = (params.camera.motion.enabled === '1');
	var threshold =  params.camera.motion.threshold;
	threshold = isNaN( threshold ) ? null : parseInt( threshold );
	var roi = params.camera.motion.roi;

	var motionParams = {
		enabled:    isEnabled,
		threshold:  threshold,
	};

	camera.setMotionParams( motionParams );

	if (roi) {
		camera.setROI( params.camera.motion.roi );
	}

	self.emit("motion_update", {
		camera:  camera,
		motion:  params.camera.motion
	});

	self.saveMotionParams( camera, cb );
};


function refresh( cb ) {
    cb( false );
}

CamerasController.prototype.setup = function( cb ) {
    
	var self = this;

	self.db.loadDatabase( function( err ) {
		if (err) {
			console.error("[CamerasController.setup]  error when loading database");
			console.error( err );
			cb(err);
			return;
		}
		self.db.find( {}, function( err, docs ) {
			if (err) {
				console.log(err);
				cb( err );
			} else {
				var total = docs.length;
				if (total == 0) {
					if (cb) cb();
					return;
				}
				for ( var k = 0; k < docs.length; k++ ) {
					var cam = docs[k];
					var newCam = new Camera(cam, self.videosFolder, function(cam) { 
						self.pushCamera( cam );
						total--;
						if( total<=0 && cb ) cb();
					});
				}
			}
		});    
	});
};


CamerasController.prototype.findCameraById = function( id ) {

    for (var i = 0; i < this.cameras.length; i++) { 
        var cam = this.cameras[i];
        if (cam._id === id) {
            return { index: i, cam: cam };
        }
    }
    return false;
};


/**
 * 'Simply' restart recording
 * 		just send a dbus message to d-bus to restart recording.
 * 		this is being called by app.js when rtsp_grabber is relaunched, 
 * 		in order to speed up resuming the streams recording
 */
CamerasController.prototype.simplyRestartRecording = function() {
	console.log('[CamerasController] simply restart recording');
	for (var i in this.cameras) {
		this.cameras[i].simplyRestartAllStreams();
	}
};


CamerasController.prototype.restartRecording = function() {
	console.log('[CamerasController] restart recording');
	for (var i in this.cameras) {
		this.cameras[i].restartAllStreams();
	}
};


module.exports = CamerasController;
