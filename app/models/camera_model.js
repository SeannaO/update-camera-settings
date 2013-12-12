var fs = require('fs');
var WeeklySchedule = require('weekly-schedule');
var RecordModel = require('./record_model');
var Dblite = require('../db_layers/dblite.js');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var rtspUrl = require('../helpers/camera_scanner/rtsp.js');

function Camera( cam, videosFolder ) {

	console.log("initializing camera " + cam._id);

    var self = this;

    this._id = cam._id;
    this.name = cam.name;
    this.ip = cam.ip;
    this.status = cam.status;
    this.manufacturer = cam.manufacturer;
    this.type = cam.type;
    console.log('manufacturer: ' + this.manufacturer);
	this.username = cam.username;
    this.password = cam.password;

	this.videosFolder = videosFolder + "/" + this._id;

	//    this.streams = cam.streams;
	this.streams = {};

	this.recording = false;
    this.enabled = cam.enabled;

    this.schedule = new WeeklySchedule(cam.schedule);
	this.schedule_enabled = cam.enableSchedule;
	
	this.lastChunkTime = Date.now();

	if ( !fs.existsSync( this.videosFolder) ){
        console.log(this.videosFolder);
		fs.mkdirSync( this.videosFolder );
	}

	// instantiates profiles
	for (var i in cam.streams) {
		self.addStream( cam.streams[i] );
	}

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


Camera.prototype.addStream = function( stream ) {

	var self = this;

	if (!stream.id) {
		stream.id = generateUUID();
	}
	stream.db = new Dblite( this.videosFolder + '/db_'+stream.id+'.sqlite' );
	stream.recordModel = new RecordModel( this, stream );

	stream.url = rtspUrl({
		manufacturer: self.manufacturer,
		ip: self.ip,
		user: self.username,
		password: self.password,
		resolution: stream.resolution,
		framerate: stream.framerate,
		quality: stream.quality
	});

	self.streams[stream.id] = stream;
	
	console.log( stream.url );

	if ( this.shouldBeRecording() ) {
		stream.recordModel.startRecording();
	}
};



Camera.prototype.updateStream = function( stream ) {

	for (var i in streams) {
		
		if (streams[i].id === stream.id) {

			streams[i].name = stream.name;
			streams[i].url = stream.url;
			streams[i].resolution = stream.resolution;
			streams[i].framerate = stream.framerate;
		}
	}

	// TODO: restart recording with new params
	// TODO: check rtsp url
};


Camera.prototype.shouldBeRecording = function() {

    return ( ( this.schedule_enabled && this.schedule.isOpen() ) || ( !this.schedule_enabled && this.enabled ) );
};


// TODO: specify stream
Camera.prototype.getOldestChunks = function( streamId, numberOfChunks, cb ) {

	if ( !this.streams[streamId] ) {
		console.log('[error] cameraModel.getOldestChunks: no stream with id ' + streamId);
		return;
	}
	
	var self = this;
	self.db.getOldestChunks( numberOfChunks, function( data ) {
		cb( data );
	});
};


//TODO: refactor recordModel to specify streamId
Camera.prototype.addChunk = function( streamId, chunk ) {
	
	if ( !this.streams[streamId] ) {
		console.log('[error] cameraModel.addChunk: no stream with id ' + streamId);
		return;
	}

	this.streams[ streamId ].db.insertVideo( chunk );
};


Camera.prototype.deleteChunk = function( streamId, chunk, cb ) {
	
	if ( !this.streams[streamId] ) {
		console.log('[error] cameraModel.deleteChunk: no stream with id ' + streamId);
		return;
	}
	
	var self = this;

	self.streams[ streamId ].db.deleteVideo( chunk.id, function( err ) {

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


// TODO: setup new_chunk listener for each stream
Camera.prototype.setupEvents = function( cb ) {

    var self = this;

	/*
    this.recordModel.on( 'new_chunk', function(data) {
		this.lastChunkTime = Date.now();
        self.emit( 'new_chunk', data);
    });

    this.recordModel.on('camera_status', function(data) {
        self.emit('camera_status', { cam_id: self._id, status: data.status } );
    });
	*/
};


Camera.prototype.isRecording = function() {
    return this.recording;
};


Camera.prototype.startRecording = function() {
    
    var self = this;

    if (this.recording) {
        console.log(this.name + " is already recording.");
    } else {
        console.log("* * * " + this.name + " will start recording...");
		for (var i in self.streams) {
			this.streams[i].recordModel.startRecording();
		}
		this.recording = true;
		this.enabled = true;		
    }
};


Camera.prototype.stopRecording = function() {

	var self = this;

    if (this.recording) {
        console.log(this.name + " will stop recording...");
        this.recording = false;
		this.enabled = false;
		for (var i in self.streams) {
			this.streams[i].recordModel.stopRecording();
		}
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


Camera.prototype.indexPendingFiles = function( streamList, cb ) {
 
	var self = this;

	if ( !streamList || typeof streamList === 'function' ) {
		if ( typeof streamList === 'function') cb = streamList;
		streamList = Object.keys( self.streams );
	}

	if ( streamList.length === 0) {
		if (cb) cb();
	} else {
		var streamId = streamList.shift();
		this.streams[streamId].recordModel.indexPendingFiles( function() {
			self.indexPendingFiles( streamList, cb );
		});
	}
};


Camera.prototype.getStreamsJSON = function() {

	var self = this;
	var keys = Object.keys(this.streams);
	var json = keys.map(function(s) { 
		return {
			url: s.url,
			resolution: s.resolution,
			quality: s.quality,
			framerate: s.framerate,
			name: s.name,
			id: s.id
		}; 
	});

	return json;

};

Camera.prototype.toJSON = function() {
    var info = {};
    
    info.name = this.name;
    info.ip = this.ip;
    info._id = this._id;
    info.enabled = this.enabled;
    info.status = this.status;
    info.type = this.type;
    info.manufacturer = this.manufacturer;
    info.username = this.username;
    info.password = this.password;
	
	info.streams = this.getStreamsJSON();
	
    if (this.id) {
        info.id = this.id;
    } else {
        info.id = this._id;
    }

    return info;
};


var deleteFolderRecursive = function( path ) {
	// TODO: mark stream for deletion and enqueues files for progressive deletion
	/*
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
	*/
};


module.exports = Camera;


function generateUUID() {
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x7|0x8)).toString(16);
    });
    return uuid;
}

