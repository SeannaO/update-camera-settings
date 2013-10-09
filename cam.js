var Datastore = require('nedb');
var Camera = require('./camera_model');

var db = new Datastore({ filename: 'cam_db', autoload: true });

var cameras = [];
var videosDb;


function CamerasController( videosDatastore ) {
    console.log("cameras controller constructor");
    videosDb = videosDatastore;
    setup( function(err) {} );
}


function cameraInfo(camera) {
    var info = {};
    
    info.name = camera.name;
    info.rtsp = camera.rtsp;
    info.ip = camera.ip;
    info._id = camera._id;
    info.status = camera.status;

    return info;
}

CamerasController.prototype.listCameras = function( cb ) {
    
    refresh( function(err) {
        if (err) {
            cb( err, [] );
        } else {
            
            
            cb( err, cameras.map(cameraInfo) );                        
        }
    });
}


CamerasController.prototype.getCamera = function(camId, cb) {

    refresh( function(err) {
        if (err) {
            cb( err, null );
        } else {
            var cam = findCameraById( camId ).cam;
            cb( err, cam );
        }
    });
}


CamerasController.prototype.insertNewCamera = function( cam, cb ) {

    db.insert( cam, function( err, newDoc ) {
        if (err) {
            console.log("error when inserting camera: " + err);
            cb( err, "{ success: false }" );
        } else {
            cb( err, newDoc );
            cameras.push( new Camera(cam, videosDb) );
        }
    });
}


CamerasController.prototype.removeCamera = function( camId, cb ) {

    db.remove({ _id: camId }, {}, function (err, numRemoved) {
        if( err ) {
            cb( err, numRemoved );
        } else {
            var i = findCameraById( camId ).index;
            cameras.splice(i,1);            
            refresh( function() {
                cb( err, numRemoved );
            });    
        }
    });
}


CamerasController.prototype.updateCamera = function(cam, cb) {

    var camera = findCameraById( cam._id );
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
            cb(err);
        }
    });    
}


CamerasController.prototype.startRecording = function (camId, cb) {

    refresh( function(err) {
        if (err) {
            cb( err );
            return false;
        }

        cam = findCameraById(camId).cam;
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
}


CamerasController.prototype.stopRecording = function (camId, cb) {

    refresh( function(err) {
        if (err) {
            cb( err );
            return false;
        }

        cam = findCameraById(camId).cam;
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
}


function refresh( cb ) {
    cb( false );
}


function setup( cb ) {
    
    db.loadDatabase();
    
    
    db.find( {}, function( err, docs ) {
        console.log(docs);
        if (err) {
            console.log(err);
            cb( err );
        } else {
            for ( var k = 0; k < docs.length; k++ ) {
                var cam = docs[k];
                var newCam = new Camera(cam, videosDb);
                cameras.push( newCam );
            }
            cb( false );
        }
    });
}


function findCameraById( id ) {
    for (var i = 0; i < cameras.length; i++) { 
        var cam = cameras[i];
        if (cam._id === id) {
            return { index: i, cam: cam };
        }
    }
    return false;
}

module.exports = CamerasController;


