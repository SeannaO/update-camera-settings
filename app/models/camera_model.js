var fs = require('fs');											// fs utils
var WeeklySchedule = require('weekly-schedule');				// scheduler
var RecordModel = require('./record_model');					// recorder
var Dblite = require('../db_layers/dblite.js');					// sqlite layer
var util = require('util');										// for inheritance
var EventEmitter = require('events').EventEmitter;				// events


function Camera( cam, videosFolder ) {

	console.log("initializing camera " + cam._id);

    var self = this;

    this._id = cam._id;

	if (cam.id) { 
        this.id = cam.id;		// id: assigned from lifeline - legacy
    } else {
        this.id = cam._id;		// _id: assigned from db
    } 

    this.name = cam.name;
    this.ip = cam.ip;
    this.status = cam.status;
    this.manufacturer = cam.manufacturer;
    this.type = cam.type;					// 'ovif' or 'psia'
    this.indexing = false;					// lock for indexPendingFiles
	this.username = cam.username;			
    this.password = cam.password;

	this.videosFolder = videosFolder + "/" + this._id;

	this.streams = {};

	this.recording = false;					// is the camera recording?
    this.enabled = cam.enabled;				// is the camera enabled?
	

	this.api = require('../helpers/camera_scanner/cam_api/api.js').getApi( this.manufacturer );

	this.api.setCameraParams({
		ip: this.ip,
		password: this.password,
		username: this.username
	});

	// motion detection test -- TESTS ONLY
	self.setMotionDetection( function() {
		self.startMotionDetection();
	});
	//
	
	if ( !cam.deleted ) {	// starts camera if it's not being deleted					
		this.schedule = new WeeklySchedule(cam.schedule);
		this.schedule_enabled = cam.enableSchedule;
		
		if ( !fs.existsSync( this.videosFolder) ){
			console.log(this.videosFolder);
			fs.mkdirSync( this.videosFolder );
		}

		// instantiates streams
		for (var i in cam.streams) {
			self.addStream( cam.streams[i] );
		}
	
		this.setupEvents();

		if (!this.recording && this.shouldBeRecording()) {
			console.log("starting camera " + this.name);
			this.startRecording();
		} else {
			console.log("stopping camera " + this.name);
			this.stopRecording();
		}
	} else {	// if camera is being deleted, starts deletion process 

		//TODO:	periodically push chunks to the deletion queue until db is empty
		//		then recursively deletes cam folders 
		//		and finally removes the camera from the cameras db
	}
}
// end of constructor
//


util.inherits(Camera, EventEmitter);


/**
 * Adds stream to camera, 
 *  gets rtsp url,
 *	instantiates corresponding record model
 *	and starts recording stream if camera should be recording
 *
 * @param {stream} obj 
 *     stream should contain: { resolution, framerate, quality }
 */
Camera.prototype.addStream = function( stream ) {

	console.log('[Camera.prototype.addStream] ');
	console.log(stream);
	console.log('* * *');

	var self = this;

	stream.db = new Dblite( this.videosFolder + '/db_'+stream.id+'.sqlite' );
	
	stream.url = this.api.getRtspUrl({
		resolution: stream.resolution,
		framerate: stream.framerate,
		quality: stream.quality
	});

	stream.recordModel = new RecordModel( this, stream );

	self.streams[stream.id] = stream;

	if ( this.shouldBeRecording() ) {
		stream.recordModel.startRecording();
	}
};
// end of addStream
//


Camera.prototype.setMotionDetection = function( cb ) {
	
	var motionParams = {
		enabled: true,
		threshold: 10,
		sensitivity: 80
	};

	this.api.setMotionParams( motionParams, function( err, body ) {
		if (cb) cb();
	});
};


Camera.prototype.startMotionDetection = function() {
	
	var self = this;

	this.api.startListeningForMotionDetection( function() {

		// console.log("* * * motion " + Date.now() + " * * * " + self.manufacturer);
		
		if ( !self.recording ) {
			self.startRecording();
			if (self.stopRecordingTimeout) {
				clearInterval( self.stopRecordingTimeout );
			}
			self.stopRecordingTimeout = setTimeout (function() {
				self.stopRecording();
			},30000);
		}
	});
};


/**
 * Updates all camera streams from an array of streams,
 *  adding new stream if 'id' is empty or doesn't match,
 *  and deleting existing streams that are not listed on the array.
 *
 * @param { new_streams } Array
 *     new_streams is just an array of streams
 */
Camera.prototype.updateAllStreams = function( new_streams ) {

	var self = this;

	this.api.setCameraParams({
		ip: self.ip,
		password: self.password,
		username: self.username
	});

	
	for ( var s in new_streams ) {
		var stream = new_streams[s];

		if ( !stream.id || !self.streams[ stream.id ] ) { 
			self.addStream( stream );		// adds new stream if 'id' is blank or doesn't match
		} else {
			self.updateStream( stream );	// ...or updates exiting stream otherwise
		}
	}

	// checks for streams to be deleted
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
// end of updateAllStreams
//


/**
 * Removes stream
 *	TODO: marking stream for deletion and storing 'stream.deleted = true' on the db
 *
 * @param { streamId } string
 */
Camera.prototype.removeStream  = function( streamId ) {

	var self = this;

	if ( !self.streams[streamId] ) return;

	self.streams[streamId].recordModel.stopRecording();
	delete self.streams[streamId].recordModel;
	delete self.streams[streamId];

	//TODO: mark stream for deletion and store it on db
	//TODO: delete stream files
};
// end of removeStream
//


/**
 * Updates a specific camera stream,
 *  restarting the record model if the url changes
 *
 * @param { stream } obj
 */
Camera.prototype.updateStream = function( stream ) {

	var self = this;

	if ( !self.streams[stream.id] ) return;

	var id = stream.id;

	var need_restart = false;

	self.streams[id].name = stream.name;
	self.streams[id].retention = stream.retention;

	// these are the parameters that requires restarting the recorder when they change,
	// because the rtsp url changes.
	var restartParams = ['resolution', 'framerate', 'quality'];

	// iterates through restart params, checks if any of them changed, 
	// sets restarting if needed
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
// end of updateStream
//



/**
 * Restarts all camera streams
 *
 */
Camera.prototype.restartAllStreams = function() {
	
	
	var self = this;

	this.api.setCameraParams({
		ip: self.ip,
		password: self.password,
		username: self.username
	});
	
	for (var i in self.streams) {
		self.restartStream(i);
	}
};
// end of restartAllStreams
//


/**
 * Restarts a stream
 *	by stopping and deleting the corresponding recordModel,
 *	refreshing the rtsp url,
 *	and then lanching a new recordModel attached to the stream
 *
 * @param { streamId } int
 */
Camera.prototype.restartStream = function( streamId ) {

	console.log('*** restartStream: restarting stream ' + streamId);

	var self = this;

	// for safety reasons; avoids dealing with wrong stream ids
	if ( !self.streams[streamId] ) return; 

	var stream = self.streams[ streamId ];

	self.streams[streamId].recordModel.stopRecording();
	delete self.streams[streamId].recordModel;
	
	// refreshes rtsp url
	self.streams[streamId].rtsp = self.streams[streamId].url = self.api.getRtspUrl({
		resolution: stream.resolution,
		framerate: stream.framerate,
		quality: stream.quality
	});
	console.log("#### url: " + self.streams[streamId].url );
	
	self.streams[streamId].recordModel = new RecordModel( self, self.streams[streamId] );

	if ( self.shouldBeRecording() ) {
		self.streams[streamId].recordModel.startRecording();
	}
};
// end of restartStream
//


/**
 * Checks if camera should be recording
 *	it depends on the scheduler
 *
 * @return {boolean} 'true' iff camera should be recording
 */
Camera.prototype.shouldBeRecording = function() {

    return ( ( this.schedule_enabled && this.schedule.isOpen() ) || ( !this.schedule_enabled && this.enabled ) );
};
// end of shouldBeRecording
//


/**
 * Converts from days to millis
 *
 * @return {Number} converted value in millis
 */
Camera.prototype.daysToMillis = function(days) {
	
	return days * 24 * 60 * 60 * 1000;
	// return days * 1000; // seconds instead of days - !!! tests only !!!
};
// end of daysToMillis
//


/**
 * Gets chunks from a given stream that expired retention period time,
 *	limiting the number of chunks to be returned (for performance reasons)
 *
 * @param { streamId } string 
 * @param { nChunks } int Max number of chunks to be returned
 * @param { cb } function Callback, receives an array of chunks as param
 */
Camera.prototype.getExpiredChunksFromStream = function( streamId, nChunks, cb ) {
	
	var self = this;

	// for safety reasons, avoids non-existing ids
	if ( !this.streams[streamId] ) {
		console.log('[error] cameraModel.getExpiredChunksFromStream: no stream with id ' + streamId);
		return;
	}

	var stream = self.streams[streamId];
	
	// if there's no retention period, just return an empty array
	if ( !stream.retention || stream.retention <= 0) {
		cb([]);
		return;
	}

	var retentionToMillis = self.daysToMillis( stream.retention );	// converts to millis
	var expirationDate = Date.now() - retentionToMillis;			// when should it expire?

	// TODO: check if this condition is indeed working and really necessary
	// try to avoid call to db when we know that there are no expired chunks
	if ( stream.oldestChunkDate && ( Date.now() - stream.oldestChunkDate < retentionToMillis ) ) {
		console.log('- no expired chunks');
		cb([]);
	} else {
		stream.db.getExpiredChunks( expirationDate, nChunks, function( data ) {
			if ( data.length === 0 ) {
				// we reched the last expired chunk, 
				// so let's try to avoid hitting the db unnecessarily
				stream.oldestChunkDate = Date.now() - retentionToMillis;
			}
			cb( data );
		});
	}
};
// end of getExpiredChunksFromStream
//


/**
 * Gets expired chunks from all streams, one stream at a time,
 *	returning the chunks in an array as a callback param.
 *	Getting chunks one stream at a time avoids CPU usage peaks.
 *	To achieve that, this function calls itself recursively 
 *	after getting the chunks from each stream.
 *
 * @param { chunks } array Used for the recursive call. 
 *		- not necessary when first calling the method
 * @param { streamList } array List of the streams ids, used for the recursive call. 
 *		- not necessary when first calling the method
 * @param { nChunks } int Max number of chunks per stream (for performance reasons)		
 * @param { cb } function Callback, receives an array of chunks as param
 */
Camera.prototype.getExpiredChunks = function(  chunks, streamList, nChunks, cb ) {
	
	var self = this;
	
	// checks if method is being called for the first time
	if ( !Array.isArray( streamList ) ) {
		
		nChunks = chunks;							//	
		cb = streamList;							//	cb is always the last param
		streamList=Object.keys( self.streams);		//	creates an array of streams id
		chunks=[];									//	no chunks yet
	}
	
	if (streamList.length === 0) {	// we are done checking all streams
		cb( chunks );				// ...so let's pass the list of chunks

	} else {

		var streamId = streamList.shift();	

		self.getExpiredChunksFromStream( streamId, nChunks, function( data ) {

			// appends stream id to the chunk object,
			// so that when we return the data from all streams,
			// we know which chunk is from which stream
			data = data.map( function(d) {
				d.stream_id = streamId;
				return d;
			});
			
			// appends chunks to our array and recursively proceeds to next stream
			self.getExpiredChunks( chunks.concat(data), streamList, nChunks, cb );
		});		
	}
};
// end of getExpiredChunks
//


/**
 * Gets oldest chunks from all streams, one stream at a time,
 *	returning the chunks in an array as a callback param.
 *	Getting chunks one stream at a time avoids CPU usage peaks.
 *	To achieve that, this function calls itself recursively 
 *	after getting the chunks from each stream.
 *
 * @param { chunks } array Used for the recursive call. 
 *		- not necessary when first calling the method
 * @param { streamList } array List of the streams ids, used for the recursive call. 
 *		- not necessary when first calling the method
 * @param { numberOfChunks } int Max number of chunks per stream (for performance reasons)		
 * @param { cb } function Callback, receives an array of chunks as param
 */
Camera.prototype.getOldestChunks = function( chunks, streamList, numberOfChunks, cb ) {

	var self = this;

	if ( !Array.isArray( streamList ) ) {
		
		numberOfChunks = chunks;
		cb = streamList;
		streamList = Object.keys( self.streams );
		chunks = [];
	}
	
	if (streamList.length === 0) {	// we are done checking all streams
		cb( chunks );				// ...so let's pass the list of chunks

	} else {

		var streamId = streamList.shift();
		
		self.getOldestChunksFromStream( streamId, numberOfChunks, function( data ) {

			// appends stream id to the chunk object,
			// so that when we return the data from all streams,
			// we know which chunk is from which stream			
			data = data.map( function(d) {
				d.stream_id = streamId;
				return d;
			});

			// appends chunks to our array and recursively proceeds to next stream			
			self.getOldestChunks( chunks.concat(data), streamList, numberOfChunks, cb );
		});		
	}
};
// end of getOldestChunks
//


/**
 * Gets oldest chunks from a given stream,
 *	limiting the number of chunks to be returned (for performance reasons)
 *
 * @param { streamId } string 
 * @param { nChunks } int Max number of chunks to be returned
 * @param { cb } function Callback, receives an array of chunks as param
 */
Camera.prototype.getOldestChunksFromStream = function( streamId, numberOfChunks, cb ) {

	// for safety reasons, avoids non-existing ids
	if ( !this.streams[streamId] ) {
		console.log('[error] cameraModel.getOldestChunks: no stream with id ' + streamId);
		return;
	}
	
	var self = this;
	
	self.streams[streamId].db.getOldestChunks( numberOfChunks, function( data ) {
		cb( data );
	});
};
// end of getOldestChunksFromStream
//


/**
 * Indexes new chunk
 *
 * @param { streamId } string 
 * @param { chunk } obj Chunk object
 *	chunk should contain: { start, end, file }
 */
Camera.prototype.addChunk = function( streamId, chunk ) {
	
	// for safety reasons, avoids non-existing ids
	if ( !this.streams[streamId] ) {
		console.log('[error] cameraModel.addChunk: no stream with id ' + streamId);
		return;
	}
	
	this.streams[ streamId ].db.insertVideo( chunk );
};
// end of addChunk
//


/**
 * Deletes a given chunk and the corresponding thumbnail,
 *	after removing it from db
 *
 * @param { streamId } string 
 * @param { chunk } obj Chunk object
 *	chunk should contain: { file }
 */
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
			fs.exists(chunk.file, function(exists) {	// check if file really exists before deleting
														// it might not be necessary,  
														// it's only being used now for extra safety reasons
				if (exists) {
					fs.unlink( chunk.file, function(err) {
						if (!err) {
							// attempts to delete the corresponding thumb
							// notice that the thumb file has the same name as the chunk file
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
// deleteChunk
//


/**
 * Sets up listeners and emitters
 *
 */
Camera.prototype.setupEvents = function() {

    var self = this;
    for (var i in self.streams) {
        this.streams[i].recordModel.on( 'new_chunk', function(data) {
			console.log("!!! new chunk !!!");
            self.emit( 'new_chunk', data);
        });
        this.streams[i].recordModel.on('camera_status', function(data) {
            self.emit('camera_status', { cam_id: self._id, status: data.status } );
        });
    }
	
};
// end of setupEvents
//


/**
 * Is camera recording?
 *
 * @return { boolean }
 */
Camera.prototype.isRecording = function() {
    return this.recording;
};
// end of isRecording
//


/**
 * Starts recording all the streams
 *
 */
Camera.prototype.startRecording = function() {
    
    var self = this;

    if (this.recording) {	// avoids calling startRecording twice
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
// end of startRecording
//


/**
 * Stops recording all the streams
 *
 */
Camera.prototype.stopRecording = function() {

	var self = this;

    if (this.recording) { // avoids calling stopRecording twice
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
// stopRecording
//


/**
 * Sets recording schedule
 *
 * @param { schedule } obj 
 */
Camera.prototype.setRecordingSchedule = function(schedule) {

    this.schedule = new WeeklySchedule(schedule);
};
// end of setRecordingSchedule
//


/**
 * Updates all streams recorders
 *
 */
Camera.prototype.updateRecorder = function() {

	for (var i in this.streams) {
		this.streams[i].recordModel.updateCameraInfo( this, this.streams[i] );
	}
}; 
// end of updateRecorder
//


/**
 * Index pending chunks on each stream,
 *	one stream at a time to avoid CPU peaks.
 *
 * @param { streamList } array Used for the recursive call
 *		- this param is not necessary when first calling the method
 *	@param { cb } function Callback, called when done with all streams	
 */
Camera.prototype.indexPendingFiles = function( streamList, cb ) {

	//console.log("####### indexPendingFiles");

	var self = this;
	
	// checks if method is being called for the first time
	// or if it's a recursive call
	if ( !streamList || typeof streamList === 'function' ) {

		if (self.indexing) {									// avoids calling the method
																// while the camera is still indexing
			console.log('*** this camera is already indexing');
			return;
		}

		//console.log("######### streams: " + self.streams.length);

		if ( typeof streamList === 'function') cb = streamList;	
		streamList = Object.keys( self.streams );				// sets up array with all streams ids
		self.indexing = true;									// this camera is now indexing
	}

	if ( streamList.length === 0 ) {	// we're done with all the streams
		
		if (cb) cb();					// .. so let's call the callback
		self.indexing = false;			// .. and we're not indexing anymore
	} else {

		self.indexing = true;				// we're indexing now
		var streamId = streamList.shift();
		
		// index pending files on a stream
		this.streams[streamId].recordModel.indexPendingFiles( function() {
														// done indexing on that stream
			self.indexPendingFiles( streamList, cb );	// recursive call, index pending files on the next stream
		});
	}
};
// indexPendingFiles
//


/**
 * Renders streams info as a json array
 * NOTE: remember to edit this method when changing stream data attributes
 *
 * @return { array } Json array containing all streams object
 */
Camera.prototype.getStreamsJSON = function() {
	
	var self = this;
	
	// array with all streams ids
	var streamIds = Object.keys(self.streams);

	// json array to be returned
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
// end of getStreamsJSON
//


/**
 * Renders camera as a json object
 * NOTE: remember to edit this method when changing camera data attributes
 *
 * @return { array } Json array containing all streams object
 */
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
// end of toJSON
//


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


/**
 * Helper method: generates UUID for streams
 *
 * @return { string } UUID string 
 */
function generateUUID() {
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x7|0x8)).toString(16);
    });
    return uuid;
}
// end of generateUUID
//
