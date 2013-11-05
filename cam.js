var Datastore = require('nedb');
var Camera = require('./camera_model');

var db = new Datastore({ filename: 'cam_db', autoload: true });

var cameras = [];
var videosDb;


function CamerasController( videosDatastore, videosFolder, socket ) {
    console.log("cameras controller constructor");
    videosDb = videosDatastore;
    this.videosFolder = videosFolder;

    this.setup( function(err) {} );    
   
    console.log(this);
}


function cameraInfo(camera) {
    var info = {};
    
    info.name = camera.name;
    info.rtsp = camera.rtsp;
    info.ip = camera.ip;
    info._id = camera._id;
    info.status = camera.status;

    console.log("camera.id: " + camera.id);
    if (camera.id) {
        info.id = camera.id;
    } else {
        info.id = camera._id;
    }

    return info;
}


CamerasController.prototype.listVideosByCamera = function( camId, start, end, cb ) {
    
    start = parseInt( start, 10 );
    end = parseInt( end, 10 );

    console.log("listing videos recorded by camera " + camId + " between " + start + " and " + end);
    videosDb.searchVideosByInterval( camId, start, end, function(err, fileList, offset) {
        if (err) {
            console.log("error while trying to list videos by camera: " + err);
            cb(err);
        } else {
            // console.log(fileList);
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


CamerasController.prototype.getCamera = function(camId, cb) {

    var self = this;

    refresh( function(err) {
        if (err) {
            cb( err, null );
        } else {
            var cam = self.findCameraById( camId ).cam;
            //console.log("getCamera: ");
            //console.log(cam);
            
            cb( err, cam );
        }
    });
};


CamerasController.prototype.insertNewCamera = function( cam, cb ) {

    var self = this;

    console.log( "inserting new camera: ");
    console.log( cam );

    db.insert( cam, function( err, newDoc ) {
        if (err) {
            console.log("error when inserting camera: " + err);
            cb( err, "{ success: false }" );
        } else {
            cb( err, newDoc );
            cameras.push( new Camera(newDoc, videosDb, self.videosFolder ) );
            console.log( newDoc );
        }
    });
};


CamerasController.prototype.removeCamera = function( camId, cb ) {

    var self = this;

    db.remove({ _id: camId }, {}, function (err, numRemoved) {
        if( err ) {
            cb( err, numRemoved );
        } else {
            var i = self.findCameraById( camId ).index;
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
    
    db.update({ _id: cam._id }, { 
        $set: { 
            name: cam.name, 
            rtsp: cam.rtsp, 
            ip: cam.ip 
        } 
    }, { multi: true }, function (err, numReplaced) {
        if (err) {
            cb(err);
        } else {
            
            camera.cam.name = cam.name;
            camera.cam.rtsp = cam.rtsp;
            camera.cam.ip = cam.ip;
            camera.cam.updateRecorder();

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
        console.log("found camera: ");
        console.log(cam);
           
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
        console.log(docs);
        if (err) {
            console.log(err);
            cb( err );
        } else {
            for ( var k = 0; k < docs.length; k++ ) {
                var cam = docs[k];
                console.log("camerasController.videosFolder: " + self.videosFolder);
                var newCam = new Camera(cam, videosDb, self.videosFolder );
                cameras.push( newCam );
            }
            cb( false );
        }
    });
};


CamerasController.prototype.findCameraById = function( id ) {
    // console.log("findCameraById: " + id);
    for (var i = 0; i < cameras.length; i++) { 
        var cam = cameras[i];
        if (cam._id === id) {
            return { index: i, cam: cam };
        }
    }
    return false;
};

module.exports = CamerasController;


