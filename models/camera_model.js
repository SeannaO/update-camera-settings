var fs = require('fs');
var RecordModel = require('./record_model');
var Dblite = require('../db_layers/dblite.js');

var RECORDING = 0;
var NOT_RECORDING = 1;

function Camera( cam, videosFolder ) {

    console.log( "*** videosFolder: " + videosFolder );

    this._id = cam._id;
    this.name = cam.name;
    this.ip = cam.ip;
    this.rtsp = cam.rtsp;
    this.videosFolder = videosFolder + "/" + this._id;
    this.status = cam.status;
    
    this.db = new Dblite( this.videosFolder + "/db.sqlite" );

    console.log("*** cam dblite: " + this.db);

    if (cam.id) {
        this.id = cam.id;
    } else {
        this.id = cam._id;
    }
    
    this.recordModel = new RecordModel( this.db, this );

    if (this.status == RECORDING) {
        this.recordModel.startRecording();
    } else {
        this.recordModel.stopRecording();
    }

}


Camera.prototype.setup = function( cb ) {

    var self = this;

    db.loadDatabase();
    
    db.find( {}, function( err, docs ) {
        if (err) {
            console.log(err);
            cb( err );
        } else {
            cb( false );
        }
    });
};


Camera.prototype.startRecording = function() {
    
    var self = this;
    
    if (this.status === RECORDING) {
        console.log(this.name + " is already recording.");
    } else {
        this.recordModel.startRecording();
        this.status = RECORDING;
    }
};


Camera.prototype.stopRecording = function() {

    if (this.status !== NOT_RECORDING) {
        console.log(this.name + " will stop recording...");
        this.status = NOT_RECORDING;
        this.recordModel.stopRecording();
    } else {
        console.log( this.name + " is already stopped.");
    }
};


Camera.prototype.updateRecorder = function() {
    this.recordModel.updateCameraInfo( this );
};


Camera.prototype.deleteAllFiles = function() {

    deleteFolderRecursive( this.videosFolder );
};


var deleteFolderRecursive = function( path ) {
    if( fs.existsSync(path) ) {
        fs.readdirSync(path).forEach(function(file,index){
            var curPath = path + "/" + file;
            if(fs.statSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};


module.exports = Camera;



