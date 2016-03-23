var ffmpeg       = require('./../helpers/ffmpeg.js');  // ffmpeg helper
var fs           = require('fs');                      // file system utils
var path         = require('path');                    // path manipulation utils
var exec         = require('child_process').exec;      // for executing system commands
var EventEmitter = require('events').EventEmitter;     // for events
var util         = require('util');                    // for inheritin events class
var dbus         = require('../libs/node-dbus');

// record statuses
var RECORDING = 2,
    STOPPING  = 1,
    STOPPED   = 0,
    ERROR     = -1,
	CREATED   = 3;

function RecordModel( camera, stream, cb) {

    var self = this;

    this.pending = [];                       // array of pending chunks on tmp folder

    this.lastChunkTime = 0;                  // last time a new chunk was recorded
    this.lastErrorTime = 0;                  // last time ffmpeg threw an error

    this.status = CREATED;                     // starts as CREATED  until we actually have a chunk

    this.camera = camera;
    this.camId  = camera._id;
    this.rtsp   = stream.rtsp || stream.url;   // supports different attribute names for rtsp
											 // TODO: we might want to change that
    this.stream = stream;                    // corresponding stream
    this.db = stream.db;                     // corresponding stream.db - for indexing

    this.folder = "";                        // stream folder - it's empty until we setup the folders

    this.setupFolders( function() {
		self.filesToIndex = [];
		
		self.setupDbusListener();

		// launch recording thread, enabling live stream and motion detection
		self.sendSignal( 'launch', self.rtsp, self.folder + "/videos/tmp" );
		self.sendSignal( 'start', self.rtsp, self.folder + "/videos/tmp" );

		if (cb) cb(self);
	});                     // creates folders if necessary
}
// end of constructor
//


util.inherits(RecordModel, EventEmitter);


/**
 * Sets up folders.
 *	Creates folders if non-existent,
 *	cleans up tmp folder.
 *
 *  folders structure:	[base folder]/:camera_id/:stream_id				
 *						[base folder]/:camera_id/:stream_id/tmp			- temp mp4 files
 *						[base folder]/:camera_id/:stream_id/videos		- indexed chunks
 *						[base folder]/:camera_id/:stream_id/videos/tmp	- new chunks
 *						[base folder]/:camera_id/:stream_id/thumbs		- thumbs
 */
RecordModel.prototype.setupFolders = function( cb ) {
   
	var self = this;

    this.folder = this.camera.videosFolder + '/' + this.stream.id ;

	this.setupFolderSync( this.camera.videosFolder );
    this.setupFolderSync(this.folder);
    this.setupFolderSync(this.folder + "/tmp");
    this.setupFolderSync(this.folder + "/videos");
    this.setupFolderSync(this.folder + "/videos/tmp");
    this.setupFolderSync(this.folder + "/thumbs");

	this.cleanTmpFolder();

	if (cb) cb();
	// exec('mkfifo ' + this.folder + '/videos/pipe.ts', function(error) {
	// 	if (error) console.error( error );
	// });
};
// end of setupFolders
//

RecordModel.prototype.cleanTmpFolder = function() {
	 
	var tmpFolder = this.folder + "/videos/tmp";

	fs.readdir(tmpFolder, function(err, files) {
		if (!err && files) {
			files.forEach(function(file, index){

				var curPath = tmpFolder + "/" + file;
				try {
					if(fs.statSync(curPath).isDirectory()) { 
						deleteFolderRecursive(curPath);
					} else { 
						fs.unlinkSync(curPath);
					}
				} catch (err) {
				}
			});

		}
	});
};


/**
 * Updates rtsp and camera id
 *  
 * @param { camera } obj 
 *     camera should contain: { _id }
 * @param { stream } obj 
 *     stream should contain: { url || rtsp }
 */
RecordModel.prototype.updateCameraInfo = function( camera, stream ) {

	if ( !stream || ( !stream.url && !stream.rtsp ) ) {
		console.error( '[RecordModel.updateCameraInfo] : corrupted stream object' );
		return;
	}
	if ( !camera || !camera._id ) {
		console.error( '[RecordModel.updateCameraInfo] : corrupted camera object' );
		return;
	}

    this.rtsp = stream.url || stream.rtsp;	// supporting both attributes name
											// we might want to change that
    this.camId = camera._id;
};
// end of updateCameraInfo
// 


/**
 * Stops recording
 *  kills ffmpeg process,
 *  stops watcher by clearing interval
 *  removes listeners
 *  
 */
RecordModel.prototype.stopRecording = function() {

	var self = this;
	console.log("[RecordModel.stopRecording]  clearing isRecordingIntervalId and updating recording status");

	this.status = STOPPING;							// didn't stop yet
	clearInterval( this.isRecordingIntervalId );	// clears listener that checks if recording is going ok
	this.status = STOPPED;						// now we stopped
};
// end of stopRecording
// 


/**
 * Quit recording
 *  sends signal to terminate recorder process,
 *  removes listeners
 *  
 */
RecordModel.prototype.quitRecording = function() {

	var self = this;

	console.log(" [RecordModel.quitRecording]  sending signal to terminate rtsp_grabber thread");

	self.sendSignal( 'quit', self.rtsp, self.folder + "/videos/tmp" );
	
	self.removeAllListeners();
	RecordModel.dbusMonitorSignal.removeListener( 'signalReceipt', self.receiveSignalCallback );
	if (self.dbusSignal) {
		self.dbusSignal.removeAllListeners();
	}

	this.status = STOPPING;							// didn't stop yet
	clearInterval( this.isRecordingIntervalId );	// clears listener that checks if recording is going ok
	this.status = STOPPED;						// now we stopped
};
// end of stopRecording
// 


/**
 * Returns recorder status
 *
 * @return { Number } Status code ( see beginning of the file )
 *  
 */
RecordModel.prototype.getStatus = function() {
    return this.status;
};
// end of getStatus
//


/**
 * Sets recorder status
 *
 * @param { status } number Status code ( see beginning of the file )
 *  
 */
RecordModel.prototype.setStatus = function( status ) {
    this.status = status;
};
// end of setStatus
//


RecordModel.prototype.setupDbusListener = function() {

	var self = this;
	
    this.lastIdReceived = -1;

	if( !RecordModel.dbusMonitorSignal ) {	
		RecordModel.dbusMonitorSignal = Object.create(dbus.DBusMessage, {
			path: {
				value:     '/ffmpeg/signal/Object',
				writable:  true
			},
			iface: {
				value:     'ffmpeg.signal.Type',
				writable:  true
			},
			member: {
				value:     'new_chunk',
				writable:  true
				},
			bus: {
				value:     dbus.DBUS_BUS_SYSTEM,
				writable:  true
			},
			variantPolicy: {
				value:     dbus.NDBUS_VARIANT_POLICY_DEFAULT,
				writable:  true
			},
			type: {
				value: dbus.DBUS_MESSAGE_TYPE_SIGNAL
			  }
		});

		RecordModel.dbusMonitorSignal.on('error', function(err) {
			console.error('[RecordModel.dbusMonitorSignal]  ' + err.message);
		});

		try {
			RecordModel.dbusMonitorSignal.addMatch();
		} catch( e ) {
			console.log( e );
		}
	}

	if (!self.receiveSignalCallback) {
		self.receiveSignalCallback = self.receiveSignal.bind(self);
	}

	RecordModel.dbusMonitorSignal.on("signalReceipt", self.receiveSignalCallback);
	RecordModel.setupRtspGrabberMonitor();
};


RecordModel.setupRtspGrabberMonitor = function() {

	RecordModel.pingInterval = null;
	RecordModel.failedPingsCounter = 0;

	if( !RecordModel.rtspGrabberMonitorSignal ) {
		console.log('setting up RecordModel rtspGrabberMonitorSignal');
		RecordModel.rtspGrabberMonitorSignal  = Object.create(dbus.DBusMessage, {
			path: {
				value:     '/ffmpeg/signal/Object',
				writable:  true
			},
			iface: {
				value:     'ffmpeg.signal.Type',
				writable:  true
			},
			member: {
				value:     'pong',
				writable:  true
				},
			bus: {
				value:     dbus.DBUS_BUS_SYSTEM,
				writable:  true
			},
			variantPolicy: {
				value:     dbus.NDBUS_VARIANT_POLICY_DEFAULT,
				writable:  true
			},
			type: {
				value: dbus.DBUS_MESSAGE_TYPE_SIGNAL
			  }
		});

		RecordModel.arg1 = 'hello';
		RecordModel.arg2 = 'there';
		RecordModel.arg3 = Date.now();

		try {
			RecordModel.rtspGrabberMonitorSignal.addMatch();
		} catch( e ) {
			console.error( e );
		}

		RecordModel.rtspGrabberMonitorSignal.on('signalReceipt', function(msg_info, args) {
			
			var pongResponse, arg1, arg2, arg3;

			clearTimeout( RecordModel.rtspGrabberMonitorTimeout );

			try {
				pongResponse = JSON.parse( args );
				if (pongResponse.arg1.trim() != RecordModel.arg1 ||
					pongResponse.arg2.trim() != RecordModel.arg2 ||
					pongResponse.arg3.trim() != RecordModel.arg3) {
						console.error('[RecordModel: rtspGrabberMonitor]  pong response is different from expected: ');
						console.error(pongResponse);
						console.error(RecordModel.arg1 + ' ' + RecordModel.arg2 + ' ' + RecordModel.arg3);
						RecordModel.handlePingError();
					} else {
						RecordModel.failedPingsCounter = 0;
					}
			} catch(err) {
				console.error('[RecordModel: rtspGrabberMonitor]  error when parsing ping response: ' + err);
				RecordModel.handlePingError();
			}
	 
			clearTimeout( RecordModel.pingInterval );
			RecordModel.pingInterval = setTimeout( RecordModel.pingRtspGrabber, 15*1000 );
		});

		RecordModel.pingRtspGrabber();
	}

};


RecordModel.prototype.setThreshold = function(threshold) {
	
	var self = this;
	var id = self.stream.id;
	RecordModel.sendMessage( 'threshold', id, threshold );

};

RecordModel.prototype.setMotion = function( isMotionEnabled ) {
	
	var self = this;
	var id = self.stream.id;
	isMotionEnabled = isMotionEnabled ? 1 : 0;

	RecordModel.sendMessage( 'motion', id, isMotionEnabled );

};


RecordModel.pingRtspGrabber = function(arg1, arg2, arg3) {
	
	clearTimeout( RecordModel.rtspGrabberMonitorTimeout );

	var arg1 = RecordModel.arg1,
		arg2 = RecordModel.arg2,
		arg3 = RecordModel.arg3;

	RecordModel.rtspGrabberMonitorTimeout = setTimeout( function() {

		console.error('[RecordModel:rtspGrabber monitor] ping timed out; failCounter = ' + RecordModel.failedPingsCounter); 
		RecordModel.handlePingError();
		setTimeout ( RecordModel.pingRtspGrabber, 15*1000 );

	}, 60*1000);

	RecordModel.sendMessage('ping', arg1, arg2, arg3);
};


RecordModel.handlePingError = function() {

	var _maxFailedPings = 3;

	RecordModel.failedPingsCounter++;

	if (RecordModel.failedPingsCounter > _maxFailedPings) {
		console.error('[RecordModel:rtspGrabber monitor] rtspGrabber did not respond ' + _maxFailedPings + ' times in a row; restarting it...');
		RecordModel.failedPingsCounter = 0;
		exec('killall rtsp_grabber');
	}
};


RecordModel.prototype.receiveSignal = function( msg_info, args ) {

	var self = this;


	if (self.status == STOPPING || self.status == STOPPED) {
		this.lastChunkTime = Date.now();	// resets timer 
		return;
	}
	// -- 
	
	// var new_chunk = JSON.parse( arguments[1] );
	var new_chunk = JSON.parse( args );
	new_chunk.id = new_chunk.id.trim();
	
	if ( new_chunk.id === self.stream.id ) { // && self.lastIdReceived != parseInt( new_chunk.file_id) ) {

		self.lastIdReceived = parseInt( new_chunk.file_id );

		video = {
			cam:       self.camId,
			cam_name:  self.camera.cameraName(),
			stream:    self.stream.id,         // appends stream id to the chunk
			start:     new_chunk.start_time * 1000,
			end:       ( Math.round(1000*new_chunk.start_time) + Math.round(1000*new_chunk.duration_secs ) ),
			file:      new_chunk.file_id + '.ts'
		};

		if (self.status != RECORDING) {
			self.emit('camera_status', {status: 'connected', stream_id: self.stream.id});
		}

		self.status = RECORDING;

		self.moveFile( video, function( err, v ) {
			if ( !err ) {
				self.lastChunkTime = Date.now();

				self.emit('camera_status', {status: 'online', stream_id: self.stream.id});
				self.emit( 'new_chunk', v );
			}
		});
	}
};


RecordModel.sendMessage = function( command, arg1, arg2, arg3 ) {

		if (!RecordModel.dbusSignal) {
			console.log('[RecordModel.sendMessage] creating dbusSignal object');
			RecordModel.dbusSignal = Object.create(dbus.DBusMessage, {
					  path: {
						value:     '/ffmpeg/signal/Object',
						writable:  true
					  },
					  iface: {
						value:     'ffmpeg.signal.Type',
						writable:  true
					  },
					  member: {
						value:     'rtsp',
						writable:  true
					  },
					  bus: {
						value:     dbus.DBUS_BUS_SYSTEM,
						writable:  true
					  },
					  variantPolicy: {
						value:     dbus.NDBUS_VARIANT_POLICY_DEFAULT,
						writable:  true
					  },
					  type: {
						value: dbus.DBUS_MESSAGE_TYPE_SIGNAL
					  }
			});

			RecordModel.dbusSignal.on('error', function(err) {
				console.error('[RecordModel.dbusSignal]  ' + err.message);
			});
		}
		
		RecordModel.dbusSignal.clearArgs();
        RecordModel.dbusSignal.appendArgs('svviasa{sv}',
                                command + ' ' + arg1 + ' ' + arg2 + ' ' + arg3,
                                'non-container variant',
                              {type:'default variant policy', value:0, mixedPropTypes:true},
                              73,
                              ['strArray1','strArray2'],
                              {dictPropInt: 31, dictPropStr: 'dictionary', dictPropBool: true});
        RecordModel.dbusSignal.send();
};


RecordModel.prototype.sendSignal = function( command, url, path ) {

        var id = this.stream.id;

		if (!id || !url || !path) {
			console.error('[sendSignal]  empty arguments');
			return;
		}

		if (!this.dbusSignal) {
		// if(true) {
			console.log('[RecordModel.sendSignal] creating dbusSignal object');
			this.dbusSignal = Object.create(dbus.DBusMessage, {
					  path: {
						value:     '/ffmpeg/signal/Object',
						writable:  true
					  },
					  iface: {
						value:     'ffmpeg.signal.Type',
						writable:  true
					  },
					  member: {
						value:     'rtsp',
						writable:  true
					  },
					  bus: {
						value:     dbus.DBUS_BUS_SYSTEM,
						writable:  true
					  },
					  variantPolicy: {
						value:     dbus.NDBUS_VARIANT_POLICY_DEFAULT,
						writable:  true
					  },
					  type: {
						value: dbus.DBUS_MESSAGE_TYPE_SIGNAL
					  }
			});

			this.dbusSignal.on('error', function(err) {
				console.error('[recordModel.dbusSignal]  ' + err.message);
			});
		}
		
		this.dbusSignal.clearArgs();
        this.dbusSignal.appendArgs('svviasa{sv}',
                                command + ' ' + id + ' ' + url + ' ' + path,
                                'non-container variant',
                              {type:'default variant policy', value:0, mixedPropTypes:true},
                              73,
                              ['strArray1','strArray2'],
                              {dictPropInt: 31, dictPropStr: 'dictionary', dictPropBool: true});
        //send signal on session bus
        //check signal receipt in 'test-signal-listener' process
        //or on your terminal with $dbus-monitor --session
        this.dbusSignal.send();
};


/**
 * Starts recording if not already recording
 *  
 */
RecordModel.prototype.startRecording = function() {    
	console.log('[RecordModel]  startRecording');

    var self = this;
	if (this.status === RECORDING || this.status === ERROR) {
													// avoids start recording twice,
													// which would launch multiple watchers,
													// which in turn would cause multiple events 
													// being triggered when a new chunk arrives
		return;
	}

    this.status = RECORDING;

	this.lastChunkTime = Date.now();	// resets timer 
	
	self.launchMonitor();		// launches monitor that periodically 
								// checks if recording is going ok    

	this.recordContinuously();	// finally, launches ffmpeg process
};
// end of startRecording
//
RecordModel.prototype.restart = function() {

	var self = this;
	self.lastChunkTime = Date.now();	// refreshes timer
	self.sendSignal( 'restart', self.rtsp, self.folder + "/videos/tmp" );
};


/**
 * Periodically monitors the recorder 
 *  and checks if new chunks are being 
 *  
 */
RecordModel.prototype.launchMonitor = function() {
		
	var self = this;

	clearInterval( this.isRecordingIntervalId );

	this.isRecordingIntervalId = setInterval( function() {

		var dt = Date.now() - self.lastChunkTime;	// interval since last chunk arrived

		// thresholds: 
		// 30s if recording
		// 40s if there was an error - to avoid false alarms
		if ( (dt > 30*1000 && self.status === RECORDING) || (dt > 40*1000 && self.status === ERROR) ) 
		{	
			if ( self.status !== ERROR ) {								// if camera WAS recording
				self.emit('camera_status', { status: 'disconnected' });	// tells that it was disconnected
				self.status = ERROR;

			} else {
				self.emit('camera_status', { status: 'offline' });		// otherwise, tells that it keeps offline
			}

			self.lastChunkTime = Date.now();	// refreshes timer

			// refresh rtsp url
			// necessary for cameras like HIK, where the rtsp url can't be pre-generated
			self.camera.refreshRtspUrl( self.stream.id, function(err, rtsp_url) {
				if (err || !rtsp_url) {
					console.error('[RecordModel.monitor]  ' + err);
				}
				// send dbus signal to restart recording
				self.rtsp = rtsp_url || self.rtsp;
			});

			console.log('[RecordModel.monitor]  no new chunks in a while, sending signal to restart recording');
			self.sendSignal( 'restart', self.rtsp, self.folder + "/videos/tmp" );

		}
	}, 5000);	// the monitor will check back after 5s
};


/**
 * Synchronously creates folder
 * TODO: as a minor optimization, change this code to async
 *	in that case, we'll need a cb to launch the recorder when folders are ready
 *  
 *  @param { folder } string Folder path
 */
RecordModel.prototype.setupFolderSync = function(folder) {

    if ( fs.existsSync(folder) ){
        return true;
    } else {
        fs.mkdirSync(folder);
        return false;
    }
};
// end of setupFolderSync
//


/**
 * Moves file to appropriate folder and generates thumb
 *  
 *  @param { video } obj Chunk object
 *		- contains { start, end, stream_id, cam_id, file_name }
 *  @param { cb } function Callback
 *
 *	TODO: we don't want to generate thumbs for all streams of the same camera
 */
RecordModel.prototype.moveFile = function( video, cb ) {

    var self = this;

	if (!video) {
		console.error('[RecordModel.moveFile]  cannot move video file since it is undefined');
		cb('[RecordModel.moveFile]  cannot move video file since it is undefined');
		return;
	}

	var date = new Date(video.start);
	var dateString = date.getUTCFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();

	var toFolder = self.folder + '/videos/' + dateString;

	var from = self.folder + '/videos/tmp/' + path.basename( video.file );
	var to = toFolder + '/' + video.start + '_' + (video.end - video.start) + path.extname( video.file );

	fs.exists( from, function(exists) {
		
		if( !exists ) {
			console.error('[RecordModel.moveFile]  cannot move video file since it does not exist');
			if (cb) cb('[RecordModel.moveFile]  cannot move video file since it does not exist');
			return;
		}

		fs.mkdir(toFolder, function(e) {
			fs.rename( from, to, function(err) { 
				if (err) {
					console.error('[RecordModel.moveFile]  error when moving file: ' + err);
					if (cb) cb(err);
				}
				else {
					video.file        = to;							// updates file path after moving it
					video.thumbFolder = self.folder + '/thumbs';

					// if recording
					self.camera.addChunk( self.stream.id, video );	// the chunk will be indexed by the camera
					// else 
					// 	delete file

					if (cb) cb(null, video);
				}                        
			});
		});
	});
};
// end of moveFile
//


/**
 * Launches ffmpeg recording process
 *
 */
RecordModel.prototype.recordContinuously = function() {

	var self = this;

	if (!self.rtsp) {
		console.error('[RecordModel.recordContinuously] : error : empty rtsp string');
		return;
	}

	self.sendSignal( 'launch', self.rtsp, self.folder + "/videos/tmp" );
	self.sendSignal( 'start', self.rtsp, self.folder + "/videos/tmp" );
};
// end of recordContinuously
//


module.exports = RecordModel;
