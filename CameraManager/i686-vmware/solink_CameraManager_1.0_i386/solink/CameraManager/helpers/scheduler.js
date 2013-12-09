// var fs = require('fs');
// var path = require('path');
function Scheduler( interval ) {

    // var self = this;
    // If it is a number greater than 0 otherwise 10000
    this.interval = typeof interval !== 'undefined' ? interval : 10000;
    this.processes = {};
}



Scheduler.prototype.launchForAllCameras = function( cameras ) {
    console.log("--------------launchForAllCameras-------------");
    for (var i = 0; i < cameras.length; i++) {
        this.launchForCamera(cameras[i]);
    }   
};

Scheduler.prototype.launchForCamera = function( camera ) {

    if ( !(camera._id in this.processes) && camera.schedule_enabled ){

        console.log("Launching Scheduler for camera:" + camera.name);
        this.processes[camera._id] = setInterval( function(){

            console.log("Checking Schedule for camera:" + camera.name);
            // self.emit("recording", { cameraId: camera._id, scheduled: schedule.isOpen() }))
            if (!camera.isRecording() && camera.shouldBeRecording()){
				console.log("Starting camera:" + camera.name);
                camera.startRecording();

            }else if (camera.isRecording() && !camera.shouldBeRecording()){

                console.log("Stopping camera:" + camera.name);
                camera.stopRecording();
            }
        }, 10000);        
    }
};

Scheduler.prototype.clearForAllCameras = function( cameras ) {
    for (var camera in cameras) {
        this.clearForCamera(camera);
    }   
};

Scheduler.prototype.clearAll = function( ) {
    for (var process in this.processes) {
        clearInterval(process);
    }   
};

Scheduler.prototype.clearForCamera = function( camera ) {
    console.log("Clearing Scheduler for camera:" + camera.name);
    clearInterval(this.processes[camera._id]);
    delete this.processes[camera._id];
};

// - - -


module.exports = Scheduler;

// Database model of the schedule for creating, updating, deleting a schedule, determining if it is within the schedule
