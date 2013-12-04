var fs = require('fs');
var RecordModel = require('./record_model');
var Dblite = require('../db_layers/dblite.js');
var util = require('util');
var EventEmitter = require('events').EventEmitter;


function Camera( cam, videosFolder ) {

	console.log("initializing camera " + cam._id);

    var self = this;

	this.RECORDING = 0;
	this.NOT_RECORDING = 1;
	this.NEW = 2;

    this._id = cam._id;
    this.name = cam.name;
    this.ip = cam.ip;
    this.rtsp = cam.rtsp;
    this.videosFolder = videosFolder + "/" + this._id;
    
    this.status = this.NEW;
	this.lastChunkTime = Date.now();

	if ( !fs.existsSync( this.videosFolder) ){
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

    if (cam.status === this.RECORDING) {
		console.log("starting camera " + this.name);
        this.startRecording();
    } else {
		console.log("stopping camera " + this.name);
        this.stopRecording();
    }
}

util.inherits(Camera, EventEmitter);


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


Camera.prototype.startRecording = function() {
    
    var self = this;
    
	this.lastChunkTime = Date.now();

    if (this.status === this.RECORDING) {

        console.log(this.name + " is already recording.");
    } else {
        console.log("* * * " + this.name + " will start recording...");
        this.recordModel.startRecording();
        this.status = this.RECORDING;
    }
};


Camera.prototype.stopRecording = function() {

    if (this.status !== this.NOT_RECORDING) {
        console.log(this.name + " will stop recording...");
        this.status = this.NOT_RECORDING;
        this.recordModel.stopRecording();
    } else {
        console.log( this.name + " is already stopped.");
    }
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



