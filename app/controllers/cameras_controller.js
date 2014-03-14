var Datastore          = require('nedb');                           // nedb datastore
var Camera             = require('./../models/camera_model');       //
var EventEmitter       = require('events').EventEmitter;            //
var util               = require('util');                           // for inheritance
var checkH264          = require('../helpers/ffmpeg.js').checkH264;
var find               = require('findit');
var OrphanFilesChecker = require('../helpers/orphanFiles.js');
var Thumbnailer        = require('../helpers/thumbnailer.js');

// It seems that the mp4Handler should not be passed in as an argument. The mp4Handler is only used for taking snapshots and 
// this logic should be happening outside of the CamerasController, especially since it has request handling as part of it

function CamerasController( mp4Handler, filename, videosFolder, cb ) {

    var self = this;
	this.cameras = [];

	this.snapshotQ = [];

	this.thumbnailer = new Thumbnailer();

    this.db = new Datastore({ filename: filename });

	self.setup( function(err) {
			setTimeout( function() {
				this.orphanFilesChecker = new OrphanFilesChecker( self );
				this.orphanFilesChecker.periodicallyCheckForOrphanFiles( 10 * 60 * 1000 );  // checks for orphan files each 10 minutes
				
				if (cb) {
					cb(err);
				}
			}, 1000);
	});

    this.videosFolder = videosFolder;

	this.mp4Handler = mp4Handler;

	self.deletionQueue = [];

	self.checkSnapshotQ();
	
	self.periodicallyDeleteChunksOnQueue();
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

		var firstStreamId;

		if (cam) {
			streamId = req.query.stream || Object.keys(cam.streams)[0];
		}

        if ( err || !cam || !cam.streams || !cam.streams[streamId]) {
            res.json( { error: err } );
			if (cb) cb();
        } else {
			
            self.mp4Handler.takeSnapshot( cam.streams[streamId].db, cam, req, res, function() {
            	res.json();
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
        cb("camera not found");
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
			cam.api.getMotionParams(function(motion_params){
				console.log(motion_params);
				cb( err, motion_params );
			});
		}
	});
};


CamerasController.prototype.periodicallyCheckForExpiredChunks = function( cam_ids_list ) {
	
	var maxChunksPerCamera = 100;			// limits query to 100 chunks per camera
											// to avoid having a large array in memory

	var millisPeriodicity = 1000 * 60 * 10; // checks each 10 minutes
	
	if (process.env['NODE_ENV'] === 'development') {
		millisPeriodicity = 1000 * 10 * 1;		// !! checks each 10s - development only !!
	}

	var self = this;

	if (!cam_ids_list) {
		var ids = self.cameras.map( 
			function(c) {
				return( c._id );
			}
		);
		
		self.periodicallyCheckForExpiredChunks( ids );

		return;
	}
	
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

					chunks = chunks.map( function(d) {
						d.cam_id = cam._id;
						return d;
					});
					
					console.log('adding ' + maxChunksPerCamera + ' expired chunks for deletion: ');

					self.addChunksToDeletionQueue( chunks );
					self.periodicallyCheckForExpiredChunks( cam_ids_list );
				}
			);
		} else {
			self.periodicallyCheckForExpiredChunks( cam_ids_list );
		}
	});
};


CamerasController.prototype.addChunksToDeletionQueue = function( chunk_list ) {

	var self = this;
	if (chunk_list.length > 0){
		console.log( chunk_list.length + ' new chunks to be deleted: ' );
		//console.log( chunk_list );
	}

	for (var c in chunk_list) {
		self.deletionQueue.push( chunk_list[c] );
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
			setTimeout( 
				function() {
					self.periodicallyDeleteChunksOnQueue();
				}, 50 
			);
		});
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
		console.log('- deleteOldestChunks: the deletion queue is not empty; i will wait before deleting old chunks');
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
				oldChunks = oldChunks.sort( function(a, b) {
					return a.start - b.start;
				});
				
				cb( oldChunks.slice(0, numChunks) );
			}
		});
	}
};


CamerasController.prototype.insertNewCamera = function( cam, cb ) {

    var self = this;

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
			if (!cam.streams[s].id) {
				cam.streams[s].id = generateUUID();
			}
			streamsHash[ cam.streams[s].id ] = cam.streams[s];
		}
		cam.streams = streamsHash;
		cam.status = 'ready';
	}else{
		cam.status = 'missing camera stream(s)';
	}


	self.db.insert( cam, function( err, newDoc ) {
		if (err) {
			console.error("[camerasController]  error when inserting camera: " + err);
			cb( err, "{ success: false }" );
		} else {
			var c = new Camera(newDoc, self.videosFolder );
			newDoc.streams = original_streams;
			self.pushCamera( c );
			self.emit("create", c);
			cb( null, c );            
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
   
    var self = this;

    self.cameras.push( cam );

    cam.on('new_chunk', function( data ) {
		
        self.emit('new_chunk', data );
		self.thumbnailer.addChunk( data );
    });

    cam.on('camera_status', function( data ) {
		self.emit('camera_status', data);
    });
};


CamerasController.prototype.removeStream = function( camId, streamId, cb ) {
    
	var self = this;
    var camera = this.findCameraById( camId );
	
    if (!camera || !camera.cam) {
        cb( "camera not found" );
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
				console.log('camera not found on db');
				return;
			}

			streamsHash = docs[0].streams;	

			if (!streamsHash || !streamsHash[streamId]) {
				cb('stream not found on db');
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

    self.db.remove({ _id: camId }, {}, function (err, numRemoved) {
        if( err ) {
            cb( err, numRemoved );
        } else {
            var whichCam = self.findCameraById( camId );
            var cam = whichCam.cam;

            var k = whichCam.index;

            cam.stopRecording();
	
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

// CamerasController.prototype.removeNonH264Streams = function(in_streams, api, out_streams, cb) {
// 	var self = this;
// 	var profile = in_streams.shift();
// 	if (typeof profile == "undefined"){
// 		cb(out_streams);
// 	}else{
// 		var url = api.getRtspUrl(profile);
// 		checkH264(url, function(isH264) {
// 			if (isH264){
// 				out_streams.push(profile);
// 				self.removeNonH264Streams(in_streams, api, out_streams, cb);
// 			}
// 		});
// 	}
// }


CamerasController.prototype.updateCamera = function(cam, cb) {

	var self = this;
    var camera = this.findCameraById( cam._id );

    if (!camera) {
        cb( "{error: 'camera not found'}" );
        return;
    }

	var streamsHash = {};
	if (cam.streams && cam.streams.length > 0) {
		for (var s in cam.streams) {
			if (typeof cam.streams[s].id == 'undefined' || !cam.streams[s].id || cam.streams[s].id.length <= 0) {
				cam.streams[s].id = generateUUID();
			}
			streamsHash[ cam.streams[s].id ] = cam.streams[s];
		}
		cam.status = 'ready';
	} else {
		cam.status = 'missing camera stream(s)';
	}

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
						
			camera.cam.updateAllStreams( cam.streams );
	        camera.cam.updateRecorder();

	        self.emit("update", camera.cam);
	        cb(err, camera.cam);
	    }
	});
};


CamerasController.prototype.updateCameraSchedule = function(params, cb) {

    var self = this;
    var camera = this.findCameraById( params._id );
    
	if (!camera) {
        cb("{error: 'camera not found'}");
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


CamerasController.prototype.updateCameraMotion = function(params, cb) {

    var self = this;
    var camera = this.findCameraById( params._id ).cam;
    
	if (!camera) {
        cb("{error: 'camera not found'}");
        return;
    }
	
	params.camera.motion.enabled = (params.camera.motion.enabled === '1');

	camera.api.setMotionParams(params.camera.motion, function(error, body){
		if (!error) {
			self.emit("motion_update", {camera: camera, motion: params.camera.motion});
			// Maybe we should really just be starting motion detection when scheduling is disabled or it is out of schedule
			// this might allow the response to returned faster
			if (params.camera.motion.enabled) {
				camera.startMotionDetection();
			} else {
				camera.stopMotionDetection();
			}
		}else{
		}
		cb(error, body);
	}); 
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
				for ( var k = 0; k < docs.length; k++ ) {
					var cam = docs[k];
					var newCam = new Camera(cam, self.videosFolder );
					self.pushCamera( newCam );
				}
				cb();
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

module.exports = CamerasController;


function generateUUID() {
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x7|0x8)).toString(16);
    });
    return uuid;
}

