var RecordModel = require('./record_model');

var RECORDING = 0;
var NOT_RECORDING = 1;

function Camera( cam, videosDb, videosFolder ) {
    
    this._id = cam._id;
    this.name = cam.name;
    this.ip = cam.ip;
    this.rtsp = cam.rtsp;
    this.videosFolder = videosFolder + "/" + this._id;
    this.status = cam.status;
    
    if (cam.id) {
        this.id = cam.id;
    } else {
        this.id = cam._id;
    }
    
    this.recordModel = new RecordModel( videosDb, this );

    if (this.status == RECORDING) {
        this.recordModel.startRecording();
    } else {
        this.recordModel.stopRecording();
    }

    console.log("camera constructor");    
    console.log(this);
}

Camera.prototype.startRecording = function() {
    
    var self = this;
    
    if (this.status !== RECORDING) {
        console.log(this.name + " will start recording...");
        this.status = RECORDING; 
        this.recordModel.startRecording();
    } else {
        console.log(this.name + " is already recording.");
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

module.exports = Camera;



