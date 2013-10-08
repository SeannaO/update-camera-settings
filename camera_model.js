var RECORDING = 0;
var NOT_RECORDING = 1;

function Camera( cam ) {
    this._id = cam._id;
    this.name = cam.name;
    this.ip = cam.ip;
    this.rtsp = cam.rtsp;
    this.status = cam.status;
}

Camera.prototype.startRecording = function() {
    
    if (this.status !== RECORDING) {
        console.log(this.name + " will start recording...");
        this.status = RECORDING; 
    } else {
        console.log(this.name + " is already recording.");
    }
}


Camera.prototype.stopRecording = function() {

    if (this.status !== NOT_RECORDING) {
        console.log(this.name + " will stop recording...");
        this.status = NOT_RECORDING;
    } else {
        console.log( this.name + " is already stopped.");
    }
}

module.exports = Camera;



