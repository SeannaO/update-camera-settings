var fs = require('fs');
var WeeklySchedule = require('weekly-schedule');
var RecordModel = require('./record_model');
var Dblite = require('../db_layers/dblite.js');
var util = require('util');
var EventEmitter = require('events').EventEmitter;



function Camera( cam, videosFolder ) {

	console.log("initializing camera... ?");

    var self = this;

    this._id = cam._id;
    this.name = cam.name;
    this.ip = cam.ip;
    this.rtsp = cam.rtsp;
    this.videosFolder = videosFolder + "/" + this._id;
    this.schedule = new WeeklySchedule(cam.schedule);
    this.recording = false
    this.enabled = !cam.enabled;
    this.schedule_enabled = cam.schedule_enabled;
	this.lastChunkTime = Date.now();

	if ( !fs.existsSync( this.videosFolder) ){
        console.log(this.videosFolder);
		fs.mkdirSync( this.videosFolder );
	}

    this.db = new Dblite( this.videosFolder + "/db.sqlite" );
	this.recordModel = new RecordModel( this.db, this );

    if (cam.id) {
        this.id = cam.id;
    } else {
        this.id = cam._id;
    }
    
	
	this.setupEvents();

    if (!this.recording && this.shouldBeRecording()) {
		console.log("starting camera " + this.name);
        this.startRecording();
    } else {
		console.log("stopping camera " + this.name);
        this.stopRecording();
    }
}

util.inherits(Camera, EventEmitter);


Camera.prototype.shouldBeRecording = function() {
    return ((this.schedule_enabled == "1" && this.schedule.isOpen()) || (this.schedule_enabled == "0" && this.enabled == "1"));
};

Camera.prototype.setupEvents = function( cb ) {

    var self = this;

    this.recordModel.on( 'new_chunk', function(data) {
		this.lastChunkTime = Date.now();
        self.emit( 'new_chunk', data);
    });

    this.recordModel.on('camera_status', function(data) {
        self.emit('camera_status', { cam_id: self._id, status: data.enabled } );
    });
};

Camera.prototype.isRecording = function() {
    return this.recording;
};

Camera.prototype.startRecording = function() {
    
    var self = this;
    
	this.lastChunkTime = Date.now();

    if (this.recording) {
        console.log(this.name + " is already recording.");
    } else {
        console.log("* * * " + this.name + " will start recording...");
        this.recordModel.startRecording();
        this.recording = true;
    }
};


Camera.prototype.stopRecording = function() {

    if (this.recording) {
        console.log(this.name + " will stop recording...");
        this.recording = false;
        this.recordModel.stopRecording();
    } else {
        console.log( this.name + " is already stopped.");
    }
};

Camera.prototype.setRecordingSchedule = function(schedule) {
    this.schedule = new WeeklySchedule(schedule);
};


    

Camera.prototype.updateRecorder = function() {
    this.recordModel.updateCameraInfo( this );
};


Camera.prototype.deleteAllFiles = function() {

    deleteFolderRecursive( this.videosFolder );
};


Camera.prototype.indexPendingFiles = function() {
 
    this.recordModel.indexPendingFiles();
};


var deleteFolderRecursive = function( path ) {
    if( fs.existsSync(path) ) {
        fs.readdirSync(path).forEach(function(file,index){
            var curPath = path + "/" + file;
            if(fs.statSync(curPath).isDirectory()) { 
                deleteFolderRecursive(curPath);
            } else { 
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};


module.exports = Camera;



