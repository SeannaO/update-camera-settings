var RecordModel = require('./record_model');

var RECORDING = 0;
var NOT_RECORDING = 1;

function Camera( cam, videosDb ) {
    console.log("camera constructor");
    this._id = cam._id;
    this.name = cam.name;
    this.ip = cam.ip;
    this.rtsp = cam.rtsp;
    this.status = cam.status;

    this.recordModel = new RecordModel(videosDb, this);

    if (this.status == RECORDING) {
        this.recordModel.startRecording();
    } else {
        this.recordModel.stopRecording();
    }

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
}


Camera.prototype.stopRecording = function() {

    if (this.status !== NOT_RECORDING) {
        console.log(this.name + " will stop recording...");
        this.status = NOT_RECORDING;
        this.recordModel.stopRecording();
    } else {
        console.log( this.name + " is already stopped.");
    }
}

module.exports = Camera;



