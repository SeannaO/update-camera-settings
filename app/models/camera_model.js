var fs             = require('fs');                     // fs utils
var WeeklySchedule = require('weekly-schedule');        // scheduler
var RecordModel    = require('./record_model');         // recorder
var Dblite         = require('../db_layers/dblite.js'); // sqlite layer
var util           = require('util');                   // for inheritance
var EventEmitter   = require('events').EventEmitter;    // events
var find           = require('findit');
var path           = require('path');
var Streamer       = require('../helpers/live_streamer.js');

function Camera( cam, videosFolder, cb ) {

    var self = this;

    this._id = cam._id;

    if (cam.id) { 
        this.id = cam.id;		// id: assigned from lifeline - legacy
    } else {
        this.id = cam._id;		// _id: assigned from db
    } 

    this.motion = null;
	this.lastMotion = 0;

    this.name         = cam.name;
    this.ip           = cam.ip;
    this.status       = cam.status;
    this.manufacturer = cam.manufacturer;
    this.type         = cam.type;							// 'onvif' or 'psia'
    this.username     = cam.username || cam.user || '';
    this.password     = cam.password || '';

    this.videosFolder = videosFolder + "/" + this._id;

    this.streams            = {};
    this.streamsToBeDeleted = {};
    this.schedule_enabled   = cam.schedule_enabled;
    this.recording          = false;					// is the camera recording?

    this.api = require('../helpers/camera_scanner/cam_api/api.js').getApi( this.manufacturer );

    this.password = this.password ? this.password : '';
    this.username = this.username ? this.username : '';

	this.api.setCameraParams({
		id:        this._id,
		ip:        this.ip,
		password:  this.password,
		username:  this.username
	});
		
	if ( !cam.deleted ) {	// starts camera if it's not being deleted
		this.schedule = new WeeklySchedule(cam.schedule);
		
		if ( !fs.existsSync( this.videosFolder) ){
			fs.mkdirSync( this.videosFolder );
		}

		if ( !fs.existsSync( this.videosFolder + "/sensor") ){
			fs.mkdirSync( this.videosFolder + "/sensor");
		}		

		var streams = []
		for (var i in cam.streams){
			streams.push(cam.streams[i]);
		}

		this.addAllStreams(streams, function(){
			if (!self.recording && self.shouldBeRecording()) {
				console.log("[cameraModel] starting camera " + (self.name || self.ip));
				// setTimeout( function() {
					self.startRecording();
				// }, 5000);
			} else {
				console.log("[cameraModel] stopping camera " + (self.name || self.ip));
				self.stopRecording();
			}
			if (cb) cb(self);
		});
		// instantiates streams
	} else {	
		// nothing to be done
		if (cb) cb(self);
	}
}
// end of constructor
//

util.inherits(Camera, EventEmitter);


Camera.prototype.addAllStreams = function( streams, cb ) {
	var self = this;
	if (streams.length == 0) {
		if (cb) cb();                         // we're done
	} else {
		var stream = streams.shift();         // next file
		this.addStream( stream, function() {
			self.addAllStreams(streams, cb ); // recursive call
		});
    }
};

/**
 * Adds stream to camera, 
 *  gets rtsp url,
 *	instantiates corresponding record model
 *	and starts recording stream if camera should be recording
 *
 * @param {stream} obj 
 *     stream should contain: { resolution, framerate, quality }
 */
Camera.prototype.addStream = function( stream, cb ) {

	if (!stream) {
		if (cb) cb();
		return;
	}

	var self = this;
	stream.db = new Dblite( this.videosFolder + '/db_' + stream.id + '.sqlite', function(db){
		if (!stream.toBeDeleted) {

			stream.url = self.api.getRtspUrl({
				resolution:     stream.resolution,
				framerate:      stream.framerate,
				quality:        stream.quality,
				suggested_url:  stream.url
			});

			self.streams[stream.id] = stream;
			stream.recordModel = new RecordModel( self, stream, function(recorder){
    			var folder = self.videosFolder + '/' + stream.id;
				stream.streamer = new Streamer(folder + '/videos/pipe.ts');
				// stream.streamer.on('restart_socket', function() {
				// 	recorder.restart();
				// }); 

				if ( self.shouldBeRecording() ) {
					recorder.startRecording();
				}

// 				// ---
// 				// EXPERIMENTAL
// 				stream.lastReset = Date.now();	
// 				stream.streamer.on('camera_disconnected', function() {
// 					self.emit('camera_status', { cam_id: self._id, status: 'disconnected', stream_id: stream.id });
// 					if (Date.now() - stream.lastReset > 5000) {
// 						recorder.restart();
// 						stream.lastReset = Date.now();
// 					}
// 				});
//
// 				stream.streamer.on('camera_connected', function() {
// 					recorder.lastChunkTime = Date.now();
// 					self.emit('camera_status', { cam_id: self._id, status: 'online', stream_id: stream.id });
// 				});
// 				// EXPERIMENTAL
// 				// ---

				recorder.on('new_chunk', function(data) {
					self.emit( 'new_chunk', data);
				});
				recorder.on('camera_status', function(data) {
					console.log('emit: ' + stream.id);

					// ---
					// COMMENTED OUT FOR EXPERIMENTAL PURPOSES
					self.emit('camera_status', { cam_id: self._id, cam_name: self.cameraName(), status: data.status, stream_id: stream.id } );
					// ---
				});

				// stream.recordModel mught be null here, 
				// so we assign it again with the object
				// returned by the RecordModel callback
				stream.recordModel = recorder;
				//
				
				if (cb) cb();
			});

		} else {
			self.streamsToBeDeleted[stream.id] = stream;
			if (cb) cb();
		}

		db.db.on('error', function (err) {
		    console.error(err.toString());
		    var msg = err.toString();
		    if (msg.indexOf('disk image is malformed') !== -1){
		    	self.restoreBackupAndReindex(stream);
		    }
		});
	});
};
// end of addStream
//

Camera.prototype.restoreBackupAndReindex = function( stream, cb ) {
	// delete the old database file
    // recreate the database
    var self = this;
	stream.db.backup.restore(function(err, backup){
		var storedVideosFolder = self.videosFolder + "/" + stream.id + "/videos";
		if (err){
			if (err === "empty"){
				fs.unlink(self.videosFolder + '/db_'+stream.id+'.sqlite', function (err) {
					if (err){
						console.log(err);
						console.error("unable to delete corrupt sqlite file");	
						if (cb) cb(err);
					}else{
						self.reIndexDatabaseFromFileStructure(stream, storedVideosFolder, cb);
					}
				});
			}else{
				console.error(err);
				if (cb) cb(err);
			}
		}else{
			stream.db.getNewestChunks(1,function(rows){
				if (rows && rows.length > 0){
					self.reIndexDatabaseFromFileStructureAfterTimestamp(stream, storedVideosFolder, rows[0], cb);
				}else{
					if (cb) cb();
				}
			});
		}
	});
};


Camera.prototype.reIndexDatabaseFromFileStructure = function(stream, storedVideosFolder, cb){
	var self = this;

	// create the database
	stream.db.createTableIfNotExists(function(err){
		if (err){
			console.log(err);
			console.error("unable to recreate table.");
			if (cb) cb(err);
		}else{
			var finder = find(storedVideosFolder);
			finder.on('file', function (file, stat) {
				self.parseFile(file, function(matches){
					if (matches){
						stream.recordModel.addFileToIndexInDatabase(file);
					}
				});
			});
			finder.on('end', function () {
				stream.recordModel.indexPendingFilesAfterCorruptDatabase(cb);
			});
		}
	});
};

Camera.prototype.reIndexDatabaseFromFileStructureAfterTimestamp = function(stream, storedVideosFolder, indexItem, cb){
	var self = this;
	fs.stat(indexItem.file, function(err, stats){
		var most_recent_dir = path.dirname(indexItem.file);
		var lastFileStored = indexItem.start;
		// finish indexing the folder that the last file was recorded in
		var finder = find(most_recent_dir);
		finder.on('file', function (file, stats) {
			self.parseFile(file, function(matches){
				if (matches && parseInt(matches[1]) > lastFileStored){
					stream.recordModel.addFileToIndexInDatabase(file);
				}
			});
		});
		finder.on('end', function () {
			// finish indexing all the folders after the last indexed file
			fs.readdir(storedVideosFolder, function(err, list){
				if (err){
					if (cb) cb();
				}else{
					var unindexed_folders = [];
					var re = /([\d]+)-([\d]+)-([\d]+)/
					var last_recorded_date = new Date(indexItem.start);
					var day_after_last_date = new Date(
						last_recorded_date.getUTCFullYear(), 
						last_recorded_date.getUTCMonth(),
						last_recorded_date.getUTCDate()
					);
					for (var idx in list) {

						var matches = re.exec(list[idx]);
						
						if (matches && matches.length == 4) {
							
							var year    = parseInt(matches[1]);
							var month   = parseInt(matches[2])-1;
							var day     = parseInt(matches[3]);
							var dirdate = new Date(year, month, day);
							
							if (dirdate > day_after_last_date){
								unindexed_folders.push(storedVideosFolder + "/" + list[idx]);
							}
						}
					}
					self.addFilesInFoldersToIndexInDatabase(unindexed_folders, stream.recordModel, function(){
						console.log("indexPendingFilesAfterCorruptDatabase");
						stream.recordModel.indexPendingFilesAfterCorruptDatabase(cb);
					});
				}
			});
		});
	});
};

Camera.prototype.parseFile = function(file, cb){
	var re = /([\d]+)_([\d]+).ts/
	var matches = re.exec(file);
	if (matches && matches.length == 3){
		cb(matches);
	}else{
		cb(null);
	}
};


Camera.prototype.addFilesInFoldersToIndexInDatabase = function( folders, recordModel, done ) {
	var self = this;
	if (folders.length == 0) {
		if (done) done();	// we're done					
	} else {
		var folder = folders.shift();	// next file
		var finder = find(folder);
		finder.on('file', function (file, stat) {
			self.parseFile(file,function(matches){
				if (matches){
					recordModel.addFileToIndexInDatabase(file);
				}
			});
		});
		finder.on('end', function () {
			self.addFilesInFoldersToIndexInDatabase(folders,recordModel,done);
		});
    }
};


Camera.prototype.setMotionDetection = function( cb ) {
	
	var motionParams = {
		enabled:      true,
		threshold:    10,
		sensitivity:  80
	};

	this.api.setMotionParams( motionParams, function( err, body ) {
		if (cb) cb();
	});
};


Camera.prototype.stopMotionDetection = function() {
	
	var self = this;
	this.api.stopListeningForMotionDetection();
};


Camera.prototype.startMotionDetection = function() {
		
	var self = this;

	this.api.startListeningForMotionDetection( function(timestamp, data) {
		
		if (!data) {
			return;
		}

		var motion_data = data;
		motion_data.id = self._id;
		motion_data.start = timestamp || Date.now();
		motion_data.timestamp = timestamp;
		motion_data.name = self.cameraName();

		if (Date.now() - self.lastMotion > 7000) {
			self.emit("motion", motion_data);
			self.lastMotion = Date.now();
		}
		// check to see if the camera already has a motion event
		if (self.motion == null){

			self.motion = {
				id:        self._id,
				start:     timestamp,
				duration:  0,
				ip:        self.ip,
				status:    'start',
				name:      self.cameraName(),
				motion:    {}
			};

			self.motion.motion[timestamp] = data;

			if ( !self.recording ) {
				self.startRecording();
			}
			self.emit("motionEvent", self.motion);

		} else {

			self.motion.status = 'open';
			self.motion.duration = timestamp - self.motion.start;
			self.motion.motion[timestamp] = data;
			if (self.stopRecordingTimeout) {
				clearTimeout( self.stopRecordingTimeout );
			}
		}


		self.stopRecordingTimeout = setTimeout (function() {
			var result = self.motion; 
			self.motion = null;
			if (!self.shouldBeRecording() ) {	
				self.stopRecording();
			}
			result.status = 'end';
			result.duration = Date.now() - result.start;
			// Broadcast that motion has ended with the duration, camera name, ID, and timestamp
			self.emit( 'motionEvent', result);
		}, 20000);

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
Camera.prototype.updateAllStreams = function( new_streams, cb ) {

	if (!new_streams) {
		if (cb) cb();
		return;
	}

	var self = this;

	this.api.setCameraParams({
		ip:        self.ip,
		password:  self.password,
		username:  self.username
	});


	var total = new_streams.length;

	for ( var s in new_streams ) {
		var stream = new_streams[s];

		if ( !stream.id || !self.streams[ stream.id ] ) { 
			self.addStream( stream, function() {
				total--;
				if (total <= 0 && cb) cb(); 
			});		// adds new stream if 'id' is blank or doesn't match
		} else {
			self.updateStream( stream );	// ...or updates exiting stream otherwise
			total --;
			if (total <= 0 && cb) cb();
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
			total --;
			if (total <= 0 && cb) cb();
		}
	}
};
// end of updateAllStreams
//


/**
 * Removes stream
 *
 * @param { streamId } string
 */
Camera.prototype.removeStream  = function( streamId ) {

	var self = this;

	if ( !self.streams[streamId] ) return;
	
	if ( self.streams[streamId].recordModel ) {
		self.streams[streamId].recordModel.quitRecording();
	}
	delete self.streams[streamId].recordModel;

	if (self.streams[streamId].streamer) {
		self.streams[streamId].streamer.stop();
		delete self.streams[streamId].streamer;
	}

	self.streamsToBeDeleted[streamId] = self.streams[streamId];
	self.streamsToBeDeleted[streamId].toBeDeleted = true;
	delete self.streams[streamId];
};
// end of removeStream
//


/**
 * Updates a specific camera stream,
 *  restarting the record model if the url changes
 *
 * @param { stream } obj
 */
Camera.prototype.updateStream = function( stream, cb ) {

	var self = this;

	if ( !self.streams[stream.id] ) return;

	var id = stream.id;

	var need_restart = false;

	self.streams[id].name = stream.name;
	self.streams[id].retention = stream.retention;

	// these are the parameters that requires restarting the recorder when they change,
	// because the rtsp url changes.
	var restartParams = ['resolution', 'framerate', 'quality', 'url', 'ip'];

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
		ip:        self.ip,
		password:  self.password,
		username:  self.username
	});
	
	for (var i in self.streams) {
		self.restartStream(i);
	}
};
// end of restartAllStreams
//


Camera.prototype.cameraName = function(){
	var name = this.name && this.name.length > 0 ? this.name : this.ip + " | " + this.manufacturer;
	return name;
}

/**
 * Restarts a stream
 *	by stopping and deleting the corresponding recordModel,
 *	refreshing the rtsp url,
 *	and then lanching a new recordModel attached to the stream
 *
 * @param { streamId } int
 */
Camera.prototype.restartStream = function( streamId ) {

	var self = this;

	// for safety reasons; avoids dealing with wrong stream ids
	if ( !self.streams[streamId] ) return; 

	var stream = self.streams[ streamId ];

	// self.streams[streamId].recordModel.stopRecording();
	self.streams[streamId].recordModel.quitRecording();

	delete self.streams[streamId].recordModel;
	
	// refreshes rtsp url
	self.streams[streamId].rtsp = self.streams[streamId].url = self.api.getRtspUrl({
		resolution:     stream.resolution,
		framerate:      stream.framerate,
		quality:        stream.quality,
		suggested_url:  self.streams[streamId].url
	});
	
	self.streams[streamId].recordModel = new RecordModel( self, self.streams[streamId], function(recorder) {

			// var folder = self.videosFolder + '/' + stream.id;
			// stream.streamer = new Streamer(folder + '/videos/pipe.ts');

			if ( self.shouldBeRecording() ) {
				recorder.startRecording();
			}

			recorder.on('new_chunk', function(data) {
				data.cause = 'schedule';
				if (self.motion != null){
					data.cause = 'motion';
				}
				self.emit( 'new_chunk', data);
			});
			recorder.on('camera_status', function(data) {
				self.emit('camera_status', { cam_id: self._id, cam_name: self.cameraName(), status: data.status, stream_id: data.stream_id } );
			});

			// stream.recordModel mught be null here, 
			// so we assign it again with the object
			// returned by the RecordModel callback
			self.streams[streamId].recordModel = recorder;
			//
	});

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
    return ( this.schedule_enabled && this.schedule.isOpen() );
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
		console.error('[error] cameraModel.getExpiredChunksFromStream: no stream with id ' + streamId);
		cb([]);
		return;
	}

	var stream = self.streams[streamId];
	
	// if there's no retention period, just return an empty array
	if ( !stream.retention || stream.retention <= 0) {
		cb([]);
		return;
	}

	var retentionToMillis = self.daysToMillis( stream.retention );	// converts to millis
	var expirationDate    = Date.now() - retentionToMillis;			// when should it expire?

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
		
		nChunks    = chunks;							//
		cb         = streamList;						//	cb is always the last param
		streamList = Object.keys( self.streams);		//	creates an array of streams id
		chunks     = [];								//	no chunks yet
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
		cb             = streamList;
		streamList     = Object.keys( self.streams );
		chunks         = [];
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
		console.error('[error] cameraModel.getOldestChunks: no stream with id ' + streamId);
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
		console.error('[cameraModel.addChunk]  no stream with id ' + streamId);
		return;
	}

	this.streams[ streamId ].db.insertVideo( chunk );
	this.streams[ streamId ].latestThumb = chunk.start + "_" + (chunk.end-chunk.start);	
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
		console.error('[cameraModel.deleteChunk]  no stream with id ' + streamId);
		cb('no stream with this id');
		return;
	}
	
	var self = this;

	self.streams[ streamId ].db.deleteVideo( chunk.id, function( err, rows ) {

		if ( err && (!rows || rows.length === 0) ) {
			console.error( "[Camera.deleteChunk]  error removing indexes from db" );
			console.error(err);
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
							fs.unlink(thumb, function() {});
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
        	data.cam_name = self.cameraName();
            self.emit( 'new_chunk', data);
        });
        this.streams[i].recordModel.on('camera_status', function(data) {
            // self.emit('camera_status', { cam_id: self._id, status: data.status } );
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
        console.log( (this.name || this.ip) + " is already recording.");
    } else {
        console.log("* * * " + (this.name || this.ip) + " will start recording...");
		for (var i in self.streams) {
			self.streams[i].recordModel.startRecording();
		}
		self.recording = true;
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
        console.log((this.name || this.ip) + " will stop recording...");
        this.recording = false;
		for (var i in self.streams) {
			this.streams[i].recordModel.stopRecording();
		}
    } else { 
        console.log( (this.name || this.ip) + " is already stopped.");
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
			retention:    s.retention,
			url:          s.url,
			rtsp:         s.rtsp,
			resolution:   s.resolution,
			quality:      s.quality,
			framerate:    s.framerate,
			name:         s.name,
			id:           id,
			latestThumb:  s.latestThumb
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
    
	info.name             = this.name;
	info.ip               = this.ip;
	info._id              = this._id;
	info.schedule_enabled = this.schedule_enabled;
	info.status           = this.status;
	info.type             = this.type;
	info.manufacturer     = this.manufacturer;
	info.username         = this.username || '';
	info.password         = this.password || '';

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
