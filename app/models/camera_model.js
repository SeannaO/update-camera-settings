var fs             = require('fs');                     // fs utils
var WeeklySchedule = require('weekly-schedule');        // scheduler
var RecordModel    = require('./record_model');         // recorder
var Dblite         = require('../db_layers/dblite.js'); // sqlite layer
var util           = require('util');                   // for inheritance
var EventEmitter   = require('events').EventEmitter;    // events
var path           = require('path');
var Streamer       = require('../helpers/live_streamer.js');
var MotionStreamer = require('../helpers/live_motion.js');

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

	self.pendingMotion = [];

	self.lowestBitrateStream = {};

	var defaultMotionParams = {
		enabled:      false,
		threshold:    120,
		sensitivity:  50,
		roi:          "all"
	};

	self.motionParams = cam.motionParams || defaultMotionParams;

	self.updateMotionParamsInterval = setInterval( function() {
		self.setMotionParams( self.motionParams );
	}, 5000);
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
 *     stream should contain: { resolution, framerate, quality, bitrate}
 */
Camera.prototype.addStream = function( stream, cb ) {

	if (!stream) {
		if (cb) cb();
		return;
	}

	var self = this;
	stream.db = new Dblite( this.videosFolder + '/db_' + stream.id + '.sqlite', function(db){
 
		db.getEarliestAndLatestSegment( function( latestEarliest ) {
			var latest   = latestEarliest.latest ? latestEarliest.latest.start : null;
			var earliest = latestEarliest.earliest ? latestEarliest.earliest.start : null;

			stream.latest_segment_date   = parseInt(latest);
			stream.earliest_segment_date = parseInt(earliest);
		});

		if (stream.toBeDeleted) {
			self.streamsToBeDeleted[stream.id] = stream;
			if (cb) cb();
			return;
		}

		self.api.getRtspUrl({
			resolution:     stream.resolution,
			framerate:      stream.framerate,
			quality:        stream.quality,
			suggested_url:  stream.url,
			bitrate:        stream.bitrate,
			camera_no:      stream.camera_no
		}, function(url) {

			stream.url = url;
			self.streams[stream.id] = stream;

			stream.recordModel = new RecordModel( self, stream, function(recorder){
    			var folder = self.videosFolder + '/' + stream.id;
				stream.streamer = new Streamer(folder + '/videos/pipe.ts');
				stream.motionStreamer = new MotionStreamer(folder + '/videos/pipe.motion');
				stream.motionStreamer.on('grid', function( gridData ) {

					if (!self.motionParams.enabled) return;

					self.motionHandler( gridData );

					self.emit('grid', {
						cam_id:     self._id,
						stream_id:  stream.id,
						grid:       gridData
					});
				});

				stream.streamer.on('bps', function(d) {

					if (!self.streams[stream.id].bpsHist) self.streams[stream.id].bpsHist = [];
					if (!isNaN(d)) self.streams[stream.id].bpsHist.push(d);

					while (self.streams[stream.id].bpsHist.length > 30) {
						self.streams[stream.id].bpsHist.shift();
					}

					var avg = 0;
					for (var i = 0; i < self.streams[stream.id].bpsHist.length; i++) {
						avg += self.streams[stream.id].bpsHist[i];
					}
					avg /= self.streams[stream.id].bpsHist.length;
					avg = Math.round(avg);
					self.streams[stream.id].bpsAvg = avg;

					if ( !self.lowestBitrateStream.bps ) {
						self.lowestBitrateStream.id = stream.id;
						self.lowestBitrateStream.bps = avg;
					} else if ( avg > 0 && avg < self.lowestBitrateStream.bps || !self.streams[self.lowestBitrateStream.id] ) {
						self.lowestBitrateStream.id = stream.id;
						self.lowestBitrateStream.bps = avg;
					}

					self.emit('bps', {
						cam_id:     self._id,
						stream_id:  stream.id,
						bps:        d,
						avg:        avg,
						lowest:     self.lowestBitrateStream.id == stream.id
					});
				});
				// stream.streamer.on('restart_socket', function() {
				// 	recorder.restart();
				// }); 

				if ( self.shouldBeRecording() ) {
					recorder.startRecording();
				}

				recorder.on('new_chunk', function(data) {
					self.emit( 'new_chunk', data);
					self.emitPendingMotion(data);
				});
				recorder.on('camera_status', function(data) {
					self.status = data.status;

					// ---
					// COMMENTED OUT FOR EXPERIMENTAL PURPOSES
					self.emit('camera_status', { timestamp: new Date().getTime(), cam_id: self._id, cam_name: self.cameraName(), status: data.status, stream_id: stream.id } );
					// ---
				});

				// stream.recordModel mught be null here, 
				// so we assign it again with the object
				// returned by the RecordModel callback
				stream.recordModel = recorder;
				//
				
				if (cb) cb();
			});
		});

		db.db.on('error', function (err) {
		    console.error(err.toString());
		    var msg = err.toString();
		    if (msg.indexOf('disk image is malformed') !== -1){
				console.error('[Camera.Stream]  sqlite database is corrupted');
		    }
		});
	});
};
// end of addStream
//


Camera.prototype.parseFile = function(file, cb){
	var re = /([\d]+)_([\d]+).ts/
	var matches = re.exec(file);
	if (matches && matches.length == 3){
		cb(matches);
	}else{
		cb(null);
	}
};


Camera.prototype.getMotionParams = function() {

	var self = this;
	return self.motionParams;
};


Camera.prototype.setROI = function( roi ) {

	var self = this;
	self.motionParams.roi = roi;
};


Camera.prototype.setMotionParams = function( params ) {
	
	var self = this;
	
	self.motionParams.enabled     = params.enabled;
	self.motionParams.threshold   = params.threshold 	|| self.motionParams.threshold;
	self.motionParams.sensitivity = params.sensitivity 	|| self.motionParams.sensitivity;

	var motionStream    = self.lowestBitrateStream.id;
	var isMotionEnabled = self.motionParams.enabled;
	var threshold       = self.motionParams.threshold;

	for ( var streamId in self.streams ) {
		if ( !motionStream || streamId && streamId == motionStream) {
			self.streams[streamId].recordModel.setMotion( isMotionEnabled );
			self.streams[streamId].recordModel.setThreshold( threshold );
		} else {
			self.streams[streamId].recordModel.setMotion( false );
		}
	}
};


Camera.prototype.stopMotionDetection = function() {
	var self = this;
	clearInterval( self.updateMotionParamsInterval );
};


Camera.prototype.motionHandler = function( motionGrid ) {

	var self = this;

	if (!self.motionParams.enabled) return;

	if (!motionGrid || motionGrid.length < 100) {
		return;
	}

	var isThereMotion = false;

	if (self.motionParams.roi && self.motionParams.roi.length == 100) { 
		for (var i in motionGrid) {
			var val = motionGrid.charCodeAt(i);
			if (val > 5 && self.motionParams.roi[i] == '1') {
				isThereMotion = true;
				break;
			}
		}
		if(!isThereMotion) return;
	}

	data = {};

	var timestamp = Date.now();

	var motion_data = data;

	motion_data.id        = self._id;
	motion_data.start     = timestamp || Date.now();
	motion_data.timestamp = timestamp;
	motion_data.name      = self.cameraName();

	if (Date.now() - self.lastMotion > 7000) {
		// self.emit("motion", motion_data);
		self.pendingMotion.push(motion_data);
		while(self.pendingMotion.length > 10) {
			self.pendingMotion.shift();
		}
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

		self.motion.motion[timestamp] = motion_data;

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
	}, 20000); // was 30000
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
			self.updateStream( stream, function() {
				total--;
				if (total == 0 && cb) cb();
			});	// ...or updates exiting stream otherwise
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
			total--;
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

	if (self.streams[streamId].motionStreamer) {
		self.streams[streamId].motionStreamer.stop();
		delete self.streams[streamId].motionStreamer;
	}

	self.streamsToBeDeleted[streamId] = self.streams[streamId];
	self.streamsToBeDeleted[streamId].toBeDeleted = true;

	self.streams[streamId].db.close();

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
	var restartParams = ['resolution', 'framerate', 'quality', 'url', 'ip', 'camera_no', 'bitrate'];

	// iterates through restart params, checks if any of them changed, 
	// sets restarting if needed
	for (var i in restartParams) {

		var param = restartParams[i];

		if ( stream[param] && self.streams[id][param] !== stream[param] ) {
					
			self.streams[id][param] = stream[param];
			need_restart = true;
			console.log('[cameraModel] restarting stream because of ' + param);
		}
	}
	
	if (need_restart) {
		console.log('*** updateStream: restarting stream after update...');
		self.restartStream( id, cb );
	} else {
		if(cb) cb();
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

Camera.prototype.emitPendingMotion = function(chunk) {

	var data = chunk;

	var self = this;

	if (self.pendingMotion.length > 0) {
		var d = self.pendingMotion[0];
		while (d && d.timestamp < data.end) {
			d = self.pendingMotion.shift();
			if (d.timestamp < data.start) d.timestamp = data.start;
			self.emit('motion', d);
			d = self.pendingMotion[0];
		}
	}
};


/**
 * Restarts a stream
 *	by stopping and deleting the corresponding recordModel,
 *	refreshing the rtsp url,
 *	and then lanching a new recordModel attached to the stream
 *
 * @param { streamId } int
 */
Camera.prototype.restartStream = function( streamId, cb ) {

	var self = this;

	// for safety reasons; avoids dealing with wrong stream ids
	if ( !self.streams[streamId] ) return; 

	var stream = self.streams[ streamId ];

	var oldRecordModel = self.streams[streamId].recordModel;

	// refreshes rtsp url
	self.api.getRtspUrl({
		resolution:     stream.resolution,
		framerate:      stream.framerate,
		quality:        stream.quality,
		bitrate:        stream.bitrate,
		suggested_url:  self.streams[streamId].url,
		camera_no:      stream.camera_no
	}, function(url) {

		// self.streams[streamId].recordModel.stopRecording();

		self.streams[streamId].url = url;
		self.streams[streamId].rtsp = url;
		self.streams[streamId].recordModel = new RecordModel( self, self.streams[streamId], function(recorder) {
			oldRecordModel.quitRecording();
			delete oldRecordModel;

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
					self.emitPendingMotion(data);
				});
				recorder.on('camera_status', function(data) {
					self.status = data.status;
					self.emit('camera_status', {
						timestamp:                new Date().getTime(),
						cam_id:                   self._id,
						cam_name:                 self.cameraName(),
						status:                   data.status,
						stream_id:                data.stream_id
					});
				});

				// stream.recordModel can be null here, 
				// so we assign it again with the object
				// returned by the RecordModel callback
				self.streams[streamId].recordModel = recorder;
				//
				if (cb) cb();
		});

	});
	
};
// end of restartStream
//


/**
 * 'Simply' restarts all streams
 * 		just tell recordModel to send a dbus message to rtsp_grabber to restart the streams
 * 		it doesn't reinstantiates another instance of recordModel
 */
Camera.prototype.simplyRestartAllStreams = function() {

	var self = this;

	for (var i in self.streams) {
		if ( self.streams[i] && self.streams[i].recordModel ) {
			self.streams[i].recordModel.restart();
		}
	}
};


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
		console.error('[cameraModel.getExpiredChunksFromStream]  no stream with id ' + streamId);
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

	stream.db.getExpiredChunks( expirationDate, nChunks, function( data ) {
		cb( data );
	});
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
	
	// base of recursion
	if (streamList.length === 0) {	// done checking all streams
		cb( chunks );

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

			// appends chunks the array and recursively proceeds to next stream			
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

	var stream = this.streams[ streamId ];

	if (!stream.earliest_segment_date) {
		stream.earliest_segment_date = chunk.start
	}

	stream.latest_segment_date = chunk.start
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

		var stream = self.streams[ streamId ];

		if (chunk.start > stream.earliest_segment_date) {
			stream.earliest_segment_date = chunk.start
		}
		if (chunk.start > stream.latest_segment_date) {
			stream.latest_segment_date = chunk.start
		}

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
							var thumb = path.basename( chunk.file, '.ts' );	
							var thumb = process.env['BASE_FOLDER'] + '/' + self._id + '/' + streamId + '/thumbs/' + thumb + '.jpg';
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
			self.emitPendingMotion(data);
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

	for (var i in this.streams) {
		if( this.streams[i].recordModel.status == 2) {
			return true;
		}
	}

	return false;
    // return this.recording;
};
// end of isRecording
//


/**
 * Starts recording all the streams
 *
 */
Camera.prototype.startRecording = function() {
    
    var self = this;

    if (this.isRecording()) {	// avoids calling startRecording twice
        console.error( (this.name || this.ip) + " is already recording.");
    } else {
        // console.log("[cameraModel]  " + (this.name || this.ip) + " will start recording...");
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

    	// console.log("[cameraModel]  " + (this.name || this.ip) + " will stop recording...");
        this.recording = false;
		for (var i in self.streams) {
			this.streams[i].recordModel.stopRecording();
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
			retention:              s.retention,
			url:                    s.url,
			rtsp:                   s.rtsp,
			resolution:             s.resolution,
			quality:                s.quality,
			framerate:              s.framerate,
			bitrate:                s.bitrate,
			name:                   s.name,
			id:                     id,
			latestThumb:            s.latestThumb,
			camera_no:              s.camera_no,
			average_bps:            s.bpsAvg,
			latest_segment_date:    s.latest_segment_date,
			earliest_segment_date:  s.earliest_segment_date
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
	info.motionParams     = this.motionParams;

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


module.exports = Camera;
