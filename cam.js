var Datastore = require('nedb');
var Camera = require('./camera_model');

var db = new Datastore({ filename: 'cam_db', autoload: true });

var cameras = [];

function CamerasController() {
}


CamerasController.prototype.listCameras = function( cb ) {
    
    refresh( function(err) {
        if (err) {
            cb( err, [] );
        } else {
            cb( err, cameras );                        
        }
    });
}


CamerasController.prototype.getCamera = function(camId, cb) {

    refresh( function(err) {
        if (err) {
            cb( err, null );
        } else {
            var cam = findCameraById( camId );
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
            cameras.push( new Camera(cam) );
        }
    });
}


CamerasController.prototype.removeCamera = function( camId, cb ) {

    db.remove({ _id: camId }, {}, function (err, numRemoved) {
        if( err ) {
           cb( err, numRemoved );
        } else {
            refresh( function() {
                cb( err, numRemoved );
            });    
        }
    });
}


CamerasController.prototype.startRecording = function (camId, cb) {

    refresh( function(err) {
        if (err) {
            cb( err );
            return false;
        }

        cam = findCameraById(camId);
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

        cam = findCameraById(camId);
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
    
    db.loadDatabase();
    
    cameras = [];

    db.find( {}, function( err, docs ) {
        console.log(docs);
        if (err) {
            console.log(err);
            cb( err );
        } else {
            for ( var k = 0; k < docs.length; k++ ) {
                var cam = docs[k];
                cameras.push( new Camera(cam) );
            }
            cb( false );
        }
    });
}


function findCameraById( id ) {
    for (var i = 0; i < cameras.length; i++) { 
        var cam = cameras[i];
        if (cam._id === id) {
            return cam;
        }
    }
    return false;
}

module.exports = CamerasController;


