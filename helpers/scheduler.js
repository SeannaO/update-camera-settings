// var fs = require('fs');
// var path = require('path');
function Scheduler( interval ) {

    // var self = this;
    // If it is a number greater than 0 otherwise 10000
    this.interval = typeof interval !== 'undefined' ? interval : 10000;
    this.processes = {};
}



Scheduler.prototype.launchForAllCameras = function( cameras ) {
    for (var camera in cameras) {
        this.launchForCamera(camera);
    }   
}

Scheduler.prototype.launchForCamera = function( camera ) {

    if (!(camera.id in this.processes) && camera.scheduleEnabled){
        this.processes[camera.id] = setInterval(this.checkSchedule(camera), 10000);        
    }
}

Scheduler.prototype.clearForAllCameras = function( cameras ) {
    for (var camera in cameras) {
        this.clearForCamera(camera);
    }   
}

Scheduler.prototype.clearAll = function( ) {
    for (var process in this.processes) {
        clearInterval(process);
    }   
}

Scheduler.prototype.clearForCamera = function( camera ) {
    clearInterval(this.processes[camera.id]);
}

Scheduler.prototype.checkSchedule = function( camera ) {
    var self = this;
    // self.emit("recording", { cameraId: camera.id, scheduled: schedule.isOpen() }))
    if (camera.isRecording() && camera.schedule.isClosed()){
        camera.stopRecording();
    }else if (!camera.isRecording() && camera.schedule.isOpened()){
        camera.startRecording();
    }
}

// - - -


module.exports = Scheduler;

// Database model of the schedule for creating, updating, deleting a schedule, determining if it is within the schedule