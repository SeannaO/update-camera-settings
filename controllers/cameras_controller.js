var Datastore = require('nedb');
var Camera = require('./../models/camera_model');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var db;
var cameras = [];

function CamerasController( filename, videosFolder ) {

    db = new Datastore({ filename: filename, autoload: true });

    this.videosFolder = videosFolder;

    this.setup( function(err) {} );

    this.indexFiles();
}

util.inherits(CamerasController, EventEmitter);

function cameraInfo(camera) {
    var info = {};
    
    info.name = camera.name;
    info.rtsp = camera.rtsp;
    info.ip = camera.ip;
    info._id = camera._id;
    info.status = camera.status;

    if (camera.id) {
        info.id = camera.id;
    } else {
        info.id = camera._id;
    }

    return info;
}


CamerasController.prototype.listVideosByCamera = function( camId, start, end, cb ) {
    
    var self = this;

    var cam = self.findCameraById( camId ).cam;    
    

    if (!cam) {
        cb("camera not found");
        return;
    }

    start = parseInt( start, 10 );
    end = parseInt( end, 10 );

    cam.db.searchVideosByInterval( start, end, function(err, fileList, offset) {
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
            cb( err, cameras.map(cameraInfo) );                        
        }
    });
};


CamerasController.prototype.indexFiles = function() {

    var k = 0;
    setInterval( 
        function() {
            k = (k + 1) % cameras.length;
            var cam = cameras[k];
            if (cam) {
                cam.indexPendingFiles();
            }
        }, 1000
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


CamerasController.prototype.insertNewCamera = function( cam, cb ) {

    var self = this;

    db.insert( cam, function( err, newDoc ) {
        if (err) {
            console.log("error when inserting camera: " + err);
            cb( err, "{ success: false }" );
        } else {
            var cam = new Camera(newDoc, self.videosFolder );
            self.pushCamera( cam );
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

    db.remove({ _id: camId }, {}, function (err, numRemoved) {
        if( err ) {
            cb( err, numRemoved );
        } else {
            var whichCam = self.findCameraById( camId );
            var cam = whichCam.cam;

            var i = whichCam.index;

            cam.stopRecording();
            cam.deleteAllFiles();

            cameras.splice(i,1);            
            refresh( function() {
                cb( err, numRemoved );
            });    
        }
    });
};


CamerasController.prototype.updateCamera = function(cam, cb) {

    var camera = this.findCameraById( cam._id );
    if (!camera) {
        cb("{error: 'camera not found'}");
        return;
    }
    
	console.log("*** updating camera:" );
	console.log(cam);

    db.update({ _id: cam._id }, { 
        $set: { 
            name: cam.name, 
            rtsp: cam.rtsp, 
            ip: cam.ip,
			id: cam.id
        } 
    }, { multi: true }, function (err, numReplaced) {
        if (err) {
            cb(err);
        } else {
            
            camera.cam.name = cam.name;
            camera.cam.rtsp = cam.rtsp;
            camera.cam.ip = cam.ip;
            camera.cam.updateRecorder();
			camera.cam.id = cam.id;
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
            db.update({ _id: cam._id }, { $set: { status: cam.status } }, { multi: true }, function (err, numReplaced) {
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
            db.update({ _id: cam._id }, { $set: { status: cam.status } }, { multi: true }, function (err, numReplaced) {
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

    db.loadDatabase();
    
    db.find( {}, function( err, docs ) {
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

