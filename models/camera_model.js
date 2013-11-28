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

    this.enabled = !cam.enabled;
    this.scheduleEnabled = cam.scheduleEnabled;
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

    if (cam.enabled) {
		console.log("starting camera " + this.name);
        this.startRecording();
    } else {
		console.log("stopping camera " + this.name);
        this.stopRecording();
    }
}

util.inherits(Camera, EventEmitter);

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
    return this.enabled;
}

Camera.prototype.startRecording = function() {
    
    var self = this;
    
	this.lastChunkTime = Date.now();

    if (this.enabled) {
        console.log(this.name + " is already recording.");
    } else {
        console.log("* * * " + this.name + " will start recording...");
        this.recordModel.startRecording();
        this.enabled = true;
    }
};


Camera.prototype.stopRecording = function() {

    if (!this.enabled) {
        console.log(this.name + " will stop recording...");
        this.enabled = false;
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



