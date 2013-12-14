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
    this.indexing = false;
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

	// instantiates streams
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

	console.log('*** addStream');
	console.log(stream);
	console.log('* * *');

	var self = this;

	stream.db = new Dblite( this.videosFolder + '/db_'+stream.id+'.sqlite' );
	
	stream.url = rtspUrl({
		manufacturer: self.manufacturer,
		ip: self.ip,
		user: self.username,
		password: self.password,
		resolution: stream.resolution,
		framerate: stream.framerate,
		quality: stream.quality
	});

	console.log('stream.url: ' + stream.url);

	stream.recordModel = new RecordModel( this, stream );

	self.streams[stream.id] = stream;

	if ( this.shouldBeRecording() ) {
		stream.recordModel.startRecording();
	}
};


Camera.prototype.updateAllStreams = function( new_streams ) {

	var self = this;

	console.log('*** update all streams');
	console.log( new_streams );
	console.log('* * *');

	for ( var s in new_streams ) {
		var stream = new_streams[s];

		if ( !stream.id || !self.streams[ stream.id ] ) { 
			// adds new stream if id is blank or doesn't match
			self.addStream( stream );
		} else {
			self.updateStream( stream );
		}
	}

	// checks for streams to be deleted
	//
	var ids = [];
	if (new_streams) {
		// creates an array of the new streams ids
		ids = new_streams.map( function(s) {
			return s.id;
		});
	}

	for ( var streamId in self.streams ) {
		// removes streams that are not in the array
		if (streamId && ids.indexOf( streamId ) === -1) {
			self.removeStream( streamId );
		}
	}
};


Camera.prototype.removeStream  = function( streamId ) {

	var self = this;

	if ( !self.streams[streamId] ) return;

	self.streams[streamId].recordModel.stopRecording();
	delete self.streams[streamId].recordModel;
	delete self.streams[streamId];

	//TODO: delete stream files

};


Camera.prototype.updateStream = function( stream ) {

	var self = this;

	if ( !self.streams[stream.id] ) return;

	var id = stream.id;

	var need_restart = false;

	self.streams[id].name = stream.name;
	self.streams[id].retention = stream.retention;

	var restartParams = ['resolution', 'framerate', 'quality'];

	for (var i in restartParams) {
		var param = restartParams[i];
		if ( stream[param] && self.streams[id][param] !== stream[param] ) {
			self.streams[id][param] = stream[param];
			need_restart = true;
		}
	}
	
	if (need_restart) {
		console.log('*** updateStream: restarting stream after update...');
		self.restartStream( id );
	}
};


Camera.prototype.restartAllStreams = function() {
	
	var self = this;

	for (var i in self.streams) {
		self.restartStream(i);
	}
};

Camera.prototype.restartStream = function( streamId ) {

	console.log('*** restartStream: restarting stream ' + streamId);

	var self = this;

	if ( !self.streams[streamId] ) return;
	var stream = self.streams[ streamId ];

	self.streams[streamId].recordModel.stopRecording();
	delete self.streams[streamId].recordModel;
	
	stream.url = rtspUrl({
		manufacturer: self.manufacturer,
		ip: self.ip,
		user: self.username,
		password: self.password,
		resolution: stream.resolution,
		framerate: stream.framerate,
		quality: stream.quality
	});
	
	self.streams[streamId].recordModel = new RecordModel( self, stream );

	if ( self.shouldBeRecording ) {
		self.streams[streamId].recordModel.startRecording();
	}
};


Camera.prototype.shouldBeRecording = function() {

    return ( ( this.schedule_enabled && this.schedule.isOpen() ) || ( !this.schedule_enabled && this.enabled ) );
};


Camera.prototype.getOldestChunks = function( chunks, streamList, numberOfChunks, cb ) {

	var self = this;

	if ( !Array.isArray( streamList ) ) {
		
		numberOfChunks = chunks;
		cb = streamList;
		streamList = Object.keys( self.streams );
		chunks = [];
	}
	
	if (streamList.length === 0) {
		cb( chunks );
	} else {
		var streamId = streamList.shift();
		self.getOldestChunksFromStream( streamId, numberOfChunks, function( data ) {
			data = data.map( function(d) {
				d.stream_id = streamId;
				return d;
			});
			self.getOldestChunks( chunks.concat(data), streamList, numberOfChunks, cb );
		});		
	}
};


// TODO: specify stream
Camera.prototype.getOldestChunksFromStream = function( streamId, numberOfChunks, cb ) {

	if ( !this.streams[streamId] ) {
		console.log('[error] cameraModel.getOldestChunks: no stream with id ' + streamId);
		return;
	}
	
	var self = this;
	self.streams[streamId].db.getOldestChunks( numberOfChunks, function( data ) {
		cb( data );
	});
};


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
    for (var i in self.streams) {
        this.streams[i].recordModel.on( 'new_chunk', function(data) {
            self.emit( 'new_chunk', data);
        });
        this.streams[i].recordModel.on('camera_status', function(data) {
            self.emit('camera_status', { cam_id: self._id, status: data.status } );
        });
    }
	
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
	for (var i in this.streams) {
		this.streams[i].recordModel.updateCameraInfo( this, this.streams[i] );
	}
};


Camera.prototype.deleteAllFiles = function() {

    // deleteFolderRecursive( this.videosFolder );
};


Camera.prototype.indexPendingFiles = function( streamList, cb ) {

	var self = this;
	
	if ( !streamList || typeof streamList === 'function' ) {
		if (self.indexing) {
			console.log('*** this camera is already indexing');
			return;
		}
		if ( typeof streamList === 'function') cb = streamList;
		streamList = Object.keys( self.streams );
		self.indexing = true;
	}

	if ( streamList.length === 0 ) {
		if (cb) cb();
		self.indexing = false;
	} else {
		self.indexing = true;
		var streamId = streamList.shift();
		
		this.streams[streamId].recordModel.indexPendingFiles( function() {
			self.indexPendingFiles( streamList, cb );
		});
	}
};


Camera.prototype.getStreamsJSON = function() {
	
	var self = this;
	
	var streamIds = Object.keys(self.streams);

	var streams = [];

	for (var id in self.streams) {
		var s = self.streams[id];
		streams.push({
			retention: s.retention,
			url: s.url,
			rtsp: s.rtsp,
			resolution: s.resolution,
			quality: s.quality,
			framerate: s.framerate,
			name: s.name,
			id: id
		}); 
	}

	return streams;
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

