// var fs = require('fs');
// var path = require('path');
function Scheduler( interval ) {

    // var self = this;
    // If it is a number greater than 0 otherwise 10000
    this.interval = typeof interval !== 'undefined' ? interval : 10000;
    this.processes = {};
}



Scheduler.prototype.launchForAllCameras = function( cameras ) {
    for (var i = 0; i < cameras.length; i++) {
        this.launchForCamera(cameras[i]);
    }   
};

Scheduler.prototype.launchForCamera = function( camera ) {

    if ( !(camera._id in this.processes)){

        // console.log("Launching Scheduler for camera:" + camera.name);
        this.processes[camera._id] = setInterval( function(){

            // console.log("Checking Schedule for camera:" + camera.name);
            // self.emit("recording", { cameraId: camera._id, scheduled: schedule.isOpen() }))
            if (!camera.isRecording() && camera.shouldBeRecording()){
				console.log("Starting camera:" + camera.name);
                camera.startRecording();

            } else if (camera.isRecording() && !camera.shouldBeRecording() && !camera.api.motion_enabled){

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
    // console.log("Clearing Scheduler for camera:" + camera.name);
    clearInterval(this.processes[camera._id]);
    delete this.processes[camera._id];
};

Scheduler.prototype.setupListeners = function( emitter ) {
    var scheduler = this
	emitter.on('create', function(camera) {
		// console.log("camera created calling launchForCamera on scheduler");
		scheduler.launchForCamera(camera);
	});

	emitter.on('delete', function(camera) {
		// console.log("camera deleted, removing scheduler");
		scheduler.clearForCamera(camera);
	});

	emitter.on('schedule_update', function(camera) {
		console.log("camera scheduler updated, relaunching scheduler");
		scheduler.clearForCamera(camera);
		scheduler.launchForCamera(camera);
	});
};

// - - -


module.exports = Scheduler;

// Database model of the schedule for creating, updating, deleting a schedule, determining if it is within the schedule
