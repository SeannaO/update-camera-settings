var Datastore = require('nedb');

var db = new Datastore({ filename: 'cam_db', autoload: true });


var listCameras = function( cb ) {
    
    db.loadDatabase();

    db.find( {}, function( err, docs ) {
        if (err) {
            console.log(err);
            cb( err, "{ sucess: false }" );
        } else {
            cb( err, docs );
            console.log(docs);
        }
    });
}


var getCamera = function(camId, cb) {

    db.find( { _id: camId }, function( err, docs ) {
        if (err) {
            console.log(err);
            cb( err, "{ sucess: false }" );
        } else {
            cb( err, docs );
        }
    });
}

var insertNewCamera = function( cam, cb ) {

    db.insert( cam, function( err, newDoc ) {
        if (err) {
            console.log("error when inserting camera: " + err);
            cb( err, "{ success: false }" );
        } else {
            cb( err, newDoc );
        }
    });
}


var removeCamera = function( camId, cb ) {

    db.remove({ _id: camId }, {}, function (err, numRemoved) {
        cb( err, numRemoved );
    });
    
}


exports.listCameras = listCameras
exports.insertNewCamera = insertNewCamera
exports.removeCamera = removeCamera
exports.getCamera = getCamera



