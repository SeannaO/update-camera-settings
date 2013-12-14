var Datastore = require('nedb');
var Camera = require('./../models/camera_model');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

//var db;
var cameras = [];

function CamerasController( mp4Handler, filename, videosFolder, cb ) {

    var self = this;

	this.snapshotQ = [];

    this.db = new Datastore({ filename: filename });

    this.db.loadDatabase( function(err) {
		self.setup( function(err) {} );
		self.indexFiles();
		if (cb) {
			cb();
		}
		self.checkSnapshotQ();
    });

    this.videosFolder = videosFolder;

	this.mp4Handler = mp4Handler;
}

util.inherits(CamerasController, EventEmitter);

//
// remove one of the methods later
//
CamerasController.prototype.getAllCameras = function() {
	return cameras;
};

CamerasController.prototype.getCameras = function() {
    return cameras;
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


CamerasController.prototype.takeSnapshot = function( camId, req, res, cb ) {

	var self = this;

    this.getCamera( camId, function(err, cam) {

        if (err) {
            res.json( { error: err } );
        } else {
            self.mp4Handler.takeSnapshot( cam.db, cam, req, res, function() {
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
    
    refresh( function(err) {
        if (err) {
            cb( err, [] );
        } else {
            cb( err, cameras );                        
        }
    });
};


CamerasController.prototype.indexFiles = function() {

	var self = this;

    var k = 0;
	
    setInterval( 
        function() {
            k = (k + 1) % cameras.length;
            var cam = cameras[k];
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


CamerasController.prototype.deleteChunksSequentially = function( chunks, cb ) {

	var self = this;

	if (chunks.length === 0) {
		cb();
	} else {
		var chunk = chunks.shift();
		self.deleteChunk( chunk, function(data) {
			setTimeout( 
				function() {
					self.deleteChunksSequentially( chunks, cb );
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
				console.log( "deleting chunk " + chunk.id + " from camera: " + cam._id );
				if (cb) cb( data );
			});
		} else {
			console.log( err );
		}
	});
};


CamerasController.prototype.deleteOldestChunks = function( numChunks, cb ) {
	
	var deletedChunks = [];
	var n = 0;

	var self = this;

	self.getOldestChunks( numChunks, function(oldChunks) {
		self.deleteChunksSequentially( oldChunks, function() {
			cb( oldChunks );
		});
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

	for (var c in cameras) {
		var cam = cameras[c];
		self.getOldestChunksFromCamera( numChunks, cam, function( data ) {
			
			oldChunks = oldChunks.concat( data );
			n++;
			if (n === cameras.length) {
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

    cam.schedule_enabled = false;
    cam.enabled = false
    cam.schedule = {"sunday":{"open":0,"close":"12:00 PM"},"monday":{"open":0,"close":"12:00 PM"},"tuesday":{"open":0,"close":"12:00 PM"},"wednesday":{"open":0,"close":"12:00 PM"},"thursday":{"open":0,"close":"12:00 PM"},"friday":{"open":0,"close":"12:00 PM"},"saturday":{"open":0,"close":"12:00 PM"}};

    self.db.insert( cam, function( err, newDoc ) {
        if (err) {
            console.log("error when inserting camera: " + err);
            cb( err, "{ success: false }" );
        } else {
            var cam = new Camera(newDoc, self.videosFolder );
            self.pushCamera( cam );
            self.emit("create", cam);
            cb( err, newDoc );            
        }
    });
};


CamerasController.prototype.pushCamera = function( cam ) {
    
    var self = this;

    cameras.push( cam );

    cam.on('new_chunk', function( data ) {
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
            cam.deleteAllFiles();
            
            self.emit("delete", cam);

            cameras.splice(i,1);            
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
            name: cam.name							|| camera.name, 
            manufacturer: cam.manufacturer			|| camera.manufacturer, 
            ip_address: cam.ip_address || cam.ip	|| camera.ip,
			id:cam.id								|| camera.id,
            username: cam.username					|| camera.username,
            password: cam.password					|| camera.password,
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
 
			if (camera.cam.manufacturer !== cam.manufacturer) {
				camera.cam.manufacturer = cam.manufacturer;
				camera.cam.restartAllStreams();
			}
			
			camera.cam.ip_address = camera.cam.ip = cam.ip_address || cam.ip;

			camera.cam.id = cam.id;
            camera.cam.username = cam.username;
            camera.cam.password = cam.password;
			
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

    for (var i = 0; i < cameras.length; i++) { 
        var cam = cameras[i];
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
    
    for (var i = 0; i < cameras.length; i++) { 
        var cam = cameras[i];
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

