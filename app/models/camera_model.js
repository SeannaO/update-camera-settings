var fs = require('fs');
var WeeklySchedule = require('weekly-schedule');
var RecordModel = require('./record_model');
var Dblite = require('../db_layers/dblite.js');
var util = require('util');
var EventEmitter = require('events').EventEmitter;


function Camera( cam, videosFolder ) {

	console.log("initializing camera " + cam._id);

    var self = this;

    this._id = cam._id;
    this.name = cam.name;
    this.ip = cam.ip;
    this.status = cam.status;
    this.manufacturer = cam.manufacturer;
    this.type = cam.type;
	this.videosFolder = videosFolder + "/" + this._id;
    
	this.recording = false;
    this.enabled = cam.enabled;

    this.schedule = new WeeklySchedule(cam.schedule);
	this.schedule_enabled = cam.enableSchedule;
	
	this.lastChunkTime = Date.now();

	if ( !fs.existsSync( this.videosFolder) ){
        console.log(this.videosFolder);
		fs.mkdirSync( this.videosFolder );
	}

    this.db = new Dblite( this.videosFolder + "/db.sqlite" );
	this.recordModel = new RecordModel( this );

    if (cam.id) {
        this.id = cam.id;
    } else {
        this.id = cam._id;
    } 
	
	this.setupEvents();

	console.log("should be recording? " + this.shouldBeRecording() );

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
	console.log("this.schedule_enabled: " + this.schedule_enabled);
	console.log("this.enabled: " + this.enabled );

    return ( ( this.schedule_enabled && this.schedule.isOpen() ) || ( !this.schedule_enabled && this.enabled ) );
};


Camera.prototype.getOldestChunks = function( numberOfChunks, cb ) {
	
	var self = this;
	self.db.getOldestChunks( numberOfChunks, function( data ) {
		cb( data );
	});
};


Camera.prototype.addChunk = function( chunk ) {
	this.db.insertVideo( chunk );
};


Camera.prototype.deleteChunk = function( chunk, cb ) {
	
	var self = this;

	self.db.deleteVideo( chunk.id, function( err ) {

		if (err && err !== "") {
			console.log( "error removing indexes from db" );
			console.log(err);
			cb( chunk, err );
		} else { 
			fs.exists(chunk.file, function(exists) {
				if (exists) {
					fs.unlink( chunk.file, function(err) {
						if (!err) {
							// attempts to delete the corresponding thumb
							var thumb = chunk.file.replace('/videos', '/thumbs');
							thumb = thumb.replace('.ts','.jpg');
							fs.unlink(thumb);
						} else {
							console.log( err );
						}
						cb( chunk );
					});
				} else {
					cb( chunk );
				}
				
			});
		}
	});	
};


Camera.prototype.deleteChunks = function( chunks, cb ) {
	
	var self = this;
	
	for (var c in chunks) {
		self.deleteChunk( chunks[c], function( data ) {
			if(cb) cb(data);
		});
	}
};


Camera.prototype.setupEvents = function( cb ) {

    var self = this;

    this.recordModel.on( 'new_chunk', function(data) {
		this.lastChunkTime = Date.now();
        self.emit( 'new_chunk', data);
    });

    this.recordModel.on('camera_status', function(data) {
        self.emit('camera_status', { cam_id: self._id, status: data.status } );
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
		this.enabled = true;
    }
};


Camera.prototype.stopRecording = function() {

    if (this.recording) {
        console.log(this.name + " will stop recording...");
        this.recording = false;
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


Camera.prototype.indexPendingFiles = function( cb ) {
 
    this.recordModel.indexPendingFiles( function() {
		if (cb) {
			cb();
		}
	});
};

Camera.prototype.indexPendingFiles = function( cb ) {
 
    this.recordModel.indexPendingFiles( function() {
		if (cb) {
			cb();
		}
	});
};

Camera.prototype.toJSON = function() {
    var info = {};
    
    info.name = this.name;
    info.ip = this.ip;
    info._id = this._id;
    info.enabled = this.enabled;
    info.status = this.status;
    info.type = this.type;
    info.manufacturer = this.manufacturer
    
    if (this.id) {
        info.id = this.id;
    } else {
        info.id = this._id;
    }

    return info;
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



