var Datastore = require('nedb');					// nedb datastore
var Camera = require('./../models/camera_model');	// 
var EventEmitter = require('events').EventEmitter;	// 
var util = require('util');							// for inheritance

function CamerasController( mp4Handler, filename, videosFolder, cb ) {

    var self = this;
	this.cameras = [];

	this.snapshotQ = [];

    this.db = new Datastore({ filename: filename });

    this.db.loadDatabase( function(err) {
		self.setup( function(err) {} );
		if (cb) {
			cb();
		}
	});

    this.videosFolder = videosFolder;

	this.mp4Handler = mp4Handler;

	self.deletionQueue = [];

	self.indexFiles();	
	self.checkSnapshotQ();	
	self.periodicallyDeleteChunksOnQueue();
	self.periodicallyCheckForExpiredChunks();
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
	snapshot.camId = camId;
	snapshot.req = req;
	snapshot.res = res;
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
    console.log(params);
	this.getCamera( camId, function(err, cam) {
		if (err || !cam || cam.length === 0) {
			cb( err, null );
		} else {
			cam.api.setCameraParams(params);
			console.log(cam.api);
			cam.api.getResolutionOptions(function(resolutions){
				cb( err, { framerate_range: cam.api.getFrameRateRange(), resolutions: resolutions, quality_range: cam.api.getVideoQualityRange()});
			})
			
		}
	});
};

// TODO: specify a stream
CamerasController.prototype.takeSnapshot = function( camId, req, res, cb ) {

	var self = this;

    this.getCamera( camId, function(err, cam) {

		var firstStreamId;

		if (cam) {
			firstStreamId = Object.keys(cam.streams)[0];
		}

        if ( err || !cam || !cam.streams || !cam.streams[firstStreamId]) {
            res.json( { error: err } );
			if (cb) cb();
        } else {
			// TODO: specify a stream
			// for now, just select one of the streams
			
            self.mp4Handler.takeSnapshot( cam.streams[firstStreamId].db, cam, req, res, function() {
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
    end = parseInt( end, 10 );

    cam.streams[streamId].db.searchVideosByInterval( start, end, function(err, fileList, offset) {
        if (err) {
            console.log("error while trying to list videos by camera: " + err);
            cb(err);
        } else {
            cb(err, fileList, offset);
        }
    });
};


CamerasController.prototype.listCameras = function( cb ) {
    
	var self = this;

    refresh( function(err) {
        if (err) {
            cb( err, [] );
        } else {
            cb( err, self.cameras );                        
        }
    });
};


CamerasController.prototype.indexFiles = function() {

	var self = this;

    var k;
	
    self.indexFilesInterval = setInterval( 
        function() {
			if ( isNaN(k) ) k = 0;
            k = (k + 1) % self.cameras.length;
            var cam = self.getCameraFromArray( k );

            if (cam) {
                cam.indexPendingFiles();
            }
        }, 100
    );
};


CamerasController.prototype.getCamera = function(camId, cb) {

    var self = this;

    refresh( function(err) {
        if (err) {
            cb( err, null );
        } else {
            var cam = self.findCameraById( camId ).cam;
            cb( err, cam );
        }
    });
};

CamerasController.prototype.getMotion = function(camId, cb) {

    var self = this;

	this.getCamera( camId, function(err, cam) {
		if (err || !cam || cam.length === 0) {
			console.log(err);
			cb( err, null );
		} else {
			console.log(cam);
			cam.api.getMotionParams(function(motion_params){
				console.log(motion_params);
				cb( err, motion_params );
			});
		}
	});
};


CamerasController.prototype.periodicallyCheckForExpiredChunks = function( cam_ids_list ) {
	
	console.log('*** checking for expired chunks...');

	var maxChunksPerCamera = 100;			// limits query to 100 chunks per camera
											// to avoid having a large array in memory

	//var millisPeriodicity = 1000 * 60 * 15; // checks each 15 minutes
	var millisPeriodicity = 1000 * 10 * 1;		// !! checks each 10s - debug only !!

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

	console.log( 'new chunks to be deleted: ' );
	console.log( chunk_list );

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
				console.log( "- deleting chunk " + chunk.id + " from camera: " + cam._id );
				if (cb) cb( data );
			});
		} else {
			console.log( err );
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

	console.log(cam);

    cam.schedule_enabled = false;
    cam.enabled = false;
    cam.schedule = {"sunday":{"open":{"hour":0, "minutes":0},"close":{"hour":23, "minutes":59}},"monday":{"open":{"hour":0, "minutes":0},"close":{"hour":23, "minutes":59}},"tuesday":{"open":{"hour":0, "minutes":0},"close":{"hour":23, "minutes":59}},"wednesday":{"open":{"hour":0, "minutes":0},"close":{"hour":23, "minutes":59}},"thursday":{"open":{"hour":0, "minutes":0},"close":{"hour":23, "minutes":59}},"friday":{"open":{"hour":0, "minutes":0},"close":{"hour":23, "minutes":59}},"saturday":{"open":{"hour":0, "minutes":0},"close":{"hour":23, "minutes":59}}};

    self.db.insert( cam, function( err, newDoc ) {
        if (err) {
            console.log("##### error when inserting camera: " + err);
            cb( err, "{ success: false }" );
        } else {
            var c = new Camera(newDoc, self.videosFolder );
            self.pushCamera( c );
            self.emit("create", c);
            cb( err, newDoc );            
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
		console.log('new_chunk');
        self.emit('new_chunk', data );
    });

    cam.on('camera_status', function( data ) {
        self.emit('camera_status', data);
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

            var i = whichCam.index;

            cam.stopRecording();

			//
			// set camera.delete = true
			//
            
            self.emit("delete", cam);

            self.cameras.splice(i,1);            
            refresh( function() {
                cb( err, numRemoved );
            });    
        }
    });
};


CamerasController.prototype.updateCamera = function(cam, cb) {

	var self = this;
    var camera = this.findCameraById( cam._id );

    if (!camera) {
        cb( "{error: 'camera not found'}" );
        return;
    }
    
	console.log('*** update camera');
	console.log(cam);
	console.log('* * *');

	var streamsHash = {};

	for (var s in cam.streams) {
		if (!cam.streams[s].id) {
			cam.streams[s].id = generateUUID();
		}
		streamsHash[ cam.streams[s].id ] = cam.streams[s];
	}
	
    self.db.update({ _id: cam._id }, { 
        $set: { 
            name: cam.name							|| camera.cam.name, 
            manufacturer: cam.manufacturer			|| camera.cam.manufacturer, 
            ip: cam.ip								|| camera.cam.ip,
			id: cam.id								|| camera.cam.id,
            username: cam.username					|| camera.cam.username	|| '',
            password: cam.password					|| camera.cam.password	|| '',
            streams: streamsHash
        } 
    }, { multi: true }, function (err, numReplaced) {
        if (err) {
			console.log('*** update camera db error: ');
			console.log(err);
            cb(err);
        } else {

            self.db.loadDatabase();

            camera.cam.name = cam.name;
			camera.cam.id = cam.id;

			var need_restart_all_streams = false;

			if (cam.manufacturer && (camera.cam.manufacturer !== cam.manufacturer) ) {
				camera.cam.manufacturer = cam.manufacturer;
				need_restart_all_streams = true;
			}
			
			if ( cam.ip && (camera.cam.ip !== cam.ip) ) {
				camera.cam.ip_address = camera.cam.ip = cam.ip;
				need_restart_all_streams = true;
			}

			if ( cam.username && ( camera.cam.username !== cam.username ) ){
				camera.cam.username = cam.username;
				need_restart_all_streams = true;
			}

			if ( cam.password && ( camera.cam.password !== cam.password ) ){
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
            cb(err);
        }
    });    
};


CamerasController.prototype.updateCameraSchedule = function(params, cb) {

    console.log("*** updating camera schedule:" );
    console.log(params);
    var self = this;
    var camera = this.findCameraById( params._id );
    
	if (!camera) {
        cb("{error: 'camera not found'}");
        return;
    }
	

    self.db.update({ _id: params._id }, { 
        $set: {
            schedule_enabled: ( params.schedule_enabled === 1),
            "schedule": params.schedule
        } 
    }, { multi: false }, function (err, numReplaced) {
        if (err) {
            cb(err);
        } else {
			self.db.loadDatabase();
            camera.cam.schedule_enabled = params.schedule_enabled;
            camera.cam.setRecordingSchedule(params.schedule);
            camera.cam.updateRecorder();
            self.emit("schedule_update", camera.cam);
            cb(err);
        }
    });   

};


CamerasController.prototype.updateCameraMotion = function(params, cb) {

    console.log("*** updating camera motion:" );
    console.log(params);
    var self = this;
    var camera = this.findCameraById( params._id ).cam;
    
	if (!camera) {
        cb("{error: 'camera not found'}");
        return;
    }
	
	params.camera.motion.enabled = (params.camera.motion.enabled === '1') ? true : false
	console.log(params);
	camera.api.setMotionParams(params.camera.motion, function(error, body){
		if (!error && body) {
			self.emit("motion_update", {camera: camera, motion: params.camera.motion});

		}else{
			console.log(error);
		}
		cb(error, body);
	}); 
};


CamerasController.prototype.startRecording = function (camId, cb) {

    var self = this;

    refresh( function(err) {
        if (err) {
            cb( err );
            return false;
        }

        cam = self.findCameraById(camId).cam;
           
        if (cam) {
            cam.startRecording();  
            self.db.update({ _id: cam._id }, { $set: { enabled: cam.enabled } }, { multi: true }, function (err, numReplaced) {
                if (err) {
                    cb(err);
                } else {
                    cb(false);
                }
            });
        } else {
            console.log("this camera doesn't exist.");
            cb(true);
        }
    });
};


CamerasController.prototype.stopRecording = function (camId, cb) {

    var self = this;

    refresh( function(err) {
        if (err) {
            cb( err );
            return false;
        }

        cam = self.findCameraById(camId).cam;
        if (cam) {
            cam.stopRecording();  
            self.db.update({ _id: cam._id }, { $set: { enabled: cam.enabled } }, { multi: true }, function (err, numReplaced) {
                if (err) {
                    cb(err);
                } else {
                    cb(false);
                }
            });
        } else {
            console.log("this camera doesn't exist.");
            cb(true);
        }
    });
};


CamerasController.prototype.findCameraByLifelineId = function( lifelineId ) {

    for (var i = 0; i < this.cameras.length; i++) { 
        var cam = this.cameras[i];
        if ( (cam.id && cam.id === lifelineId) || (!cam.id && cam._id === lifelineId) ) {
            return { index: i, cam: cam };
        }
    }
    return false;
};


function refresh( cb ) {
    cb( false );
}


CamerasController.prototype.setup = function( cb ) {
    
	var self = this;

	self.db.loadDatabase( function( err ) {
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
				cb( false );
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

