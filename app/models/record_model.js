var ffmpeg       = require('./../helpers/ffmpeg.js');  // ffmpeg helper
var fs           = require('fs');                      // file system utils
var path         = require('path');                    // path manipulation utils
var Watcher      = require('./../helpers/watcher.js'); // watches folder for new chunks
var exec         = require('child_process').exec;      // for executing system commands
var EventEmitter = require('events').EventEmitter;     // for events
var util         = require('util');                    // for inheritin events class
var dbus         = require('node-dbus');

// record statuses
var RECORDING = 2,
    STOPPING  = 1,
    STOPPED   = 0,
    ERROR     = -1;

function RecordModel( camera, stream, cb) {

    var self = this;

    this.pending = [];                       // array of pending chunks on tmp folder

    this.lastChunkTime = 0;                  // last time a new chunk was recorded
    this.lastErrorTime = 0;                  // last time ffmpeg threw an error

    this.status = ERROR;                     // starts as an error until we actually have a chunk

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
	console.log("[RecordModel.stopRecording]  sending signal to pause rtsp_grabber thread");

	this.cleanTmpFolder();		// resets temp folder

	this.status = STOPPING;							// didn't stop yet
	this.sendSignal( 'stop', self.rtsp, self.folder + "/videos/tmp" );
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


/**
 * Index files on peding list
 *
 * @param { function } Callback that is called when all files have been indexed
 *
 */
RecordModel.prototype.indexPendingFilesAfterCorruptDatabase = function( cb ) {

    var self = this;

	if (self.filesToIndex.length == 0) {
		if (cb) cb();	// we're done					
	} else {
		var file = self.filesToIndex.shift();	// next file
		self.indexFileInDatabase( file, function() {
			self.indexPendingFilesAfterCorruptDatabase( cb );// recursive call
		});
    }
};


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

		try {
			RecordModel.dbusMonitorSignal.addMatch();
		} catch( e ) {
			console.log( e );
		}
	}
	
	RecordModel.dbusMonitorSignal.on ("signalReceipt", function () {

		var new_chunk = JSON.parse( arguments[1] );
		new_chunk.id = new_chunk.id.trim();

		if ( new_chunk.id === self.stream.id ) { // && self.lastIdReceived != parseInt( new_chunk.file_id) ) {

			self.lastIdReceived = parseInt( new_chunk.file_id );

			video = {
				cam:     self.camId,
				cam_name: self.camera.cameraName(),
				stream:  self.stream.id,         // appends stream id to the chunk
				start:   new_chunk.start_time * 1000,
				end:     ( Math.round(1000*new_chunk.start_time) + Math.round(1000*new_chunk.duration_secs ) ),
				file:    new_chunk.file_id + '.ts'
			};

			self.status = RECORDING;
			self.lastChunkTime = Date.now();

			self.emit('camera_status', {status: 'online', stream_id: self.stream.id});

			self.moveFile( video, function( err, v ) {
				if ( !err ) self.emit( 'new_chunk', v );
			});
		}
	});
}


RecordModel.prototype.sendSignal = function( command, url, path ) {

        var id = this.stream.id;

        var dbusSignal = Object.create(dbus.DBusMessage, {
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

        dbusSignal.appendArgs('svviasa{sv}',
                                command + ' ' + id + ' ' + url + ' ' + path,
                                'non-container variant',
                              {type:'default variant policy', value:0, mixedPropTypes:true},
                              73,
                              ['strArray1','strArray2'],
                              {dictPropInt: 31, dictPropStr: 'dictionary', dictPropBool: true});
        //send signal on session bus
        //check signal receipt in 'test-signal-listener' process
        //or on your terminal with $dbus-monitor --session
        dbusSignal.send();
};


/**
 * Starts recording if not already recording
 *  
 */
RecordModel.prototype.startRecording = function() {    
	console.log('[RecordModel]  startRecording');

    var self = this;
	if (this.status === RECORDING) {
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

	this.isRecordingIntervalId = setInterval( function() {

		var dt = Date.now() - self.lastChunkTime;	// interval since last chunk arrived

		// thresholds: 
		// 20s if recording
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

			self.sendSignal( 'restart', self.rtsp, self.folder + "/videos/tmp" );
		    // this.status = RECORDING;
	
			// restarts ffmpeg
			console.log('[RecordModel] monitor: no new chunks in a while, will attempt to stop/start recording');
			//self.stopRecording();
			//setTimeout( function() {	// wait a few millis before starting ffmpeg again
										// to avoid the cost of respawning a process
										// too frequently in case of a persistent error
			//	self.startRecording();
			//}, 100);
			
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


RecordModel.prototype.addFileToIndexInDatabase = function(file){
	this.filesToIndex.push(file);
};

RecordModel.prototype.indexFileInDatabase = function(file, cb){
	var self = this;
	var ext = file.split('.').pop();
	if (ext === 'ts'){
		this.calcDurationFromFile(file, function(err, videoChunk){								
			if (videoChunk){
				self.db.insertVideo(videoChunk);
				if (cb) cb(null, videoChunk);
			}else{
				self.calcDurationWithFileInfo(file, stat, function(err, videoChunk){
					if (videoChunk){
						self.db.insertVideo(videoChunk);
						if (cb) cb(null, videoChunk);
					}else{
						console.error("Unable to insert video into database after being corrupted: " + file);
						console.error(err);
						if (cb) cb(err);
					}
				});
			}
		});
	}else{
		if (cb) cb("not a .ts file");
	}
};


/**
 * Calculates chunk duration by parsing a previously stored file for recovery
 *  
 *  @param { file } string File path
 *  @param { cb } function Callback function that receives chunk object as parameter
 */
RecordModel.prototype.calcDurationFromFile = function( file, cb ) {

	var self = this;
	var re = /([\d]+)_([\d]+).ts/;
	var matches = re.exec(file);
		
	if (matches && matches.length == 3){
		var start = parseInt(matches[1]);
		var end   = start + parseInt(matches[2]);

		video = {
			cam:     self.camId,
			stream:  self.stream.id,		// appends stream id to the chunk
			start:   start,
			end:     end,
			file:    file
		};

		cb(null, video );
	}else{
		cb("[RecordModel.calcDurationFromFile]  file does not have start time and duration", null );
	}
};


/**
 * Calculates chunk duration using file system stats and ffmpeg
 *  
 *  @param { file } string File path
 *  @param { cb } function Callback function that receives chunk object as parameter
 */
RecordModel.prototype.calcDuration = function( file, cb ) {

	var self = this;

	if (!file) {
		cb( 'undefined file' );
		return;
	}

    fs.stat( file, function( err, fileInfo ) {
		
		if ( err ) { 
			console.error( err );
			cb(err);
			return;
		}
		self.calcDurationWithFileInfo(file, fileInfo, cb);
	});
};
// end of calcDuration
//


/**
 * Calculates chunk duration using file system stats and ffmpeg
 *  
 *  @param { file } string File path
 *  @param { cb } function Callback function that receives chunk object as parameter
 */
RecordModel.prototype.calcDurationWithFileInfo = function( file, fileInfo, cb ) {

	var self = this;

	var lastModified = ( new Date(fileInfo.mtime) ).getTime();	// mtime: last modified time
																// getTime: converts to Unix millis
	ffmpeg.calcDuration( file, function(err, duration) {
		if (!err && duration){

			var start = lastModified - duration;
			var end   = lastModified;

			video = {
				cam:     self.camId,
				stream:  self.stream.id,		// appends stream id to the chunk
				start:   start,
				end:     end,
				file:    file
			};

			cb(null, video );
		}else{
			if (!err && !duration) err = 'could not calculate duration for file ' + file;
			cb(err);
		}

	});
};
// end of calcDurationWithFileInfo
//


/**
 * TODO: check if this method is really necessary
 *			it was being used before the implementation of the monitor
 *  
 */
RecordModel.prototype.checkForConnectionErrors = function() {
	
	var self = this;

	if (this.status === STOPPING) {
		this.status = STOPPED;
	} else if ( Date.now() - this.lastErrorTime > 20000 ) {
	//	self.lastErrorTime = Date.now();
	//	if (self.status === ERROR) {
	//		self.emit('camera_status', {status: 'offline'});
	//	} else if (self.status === RECORDING) {
	//		self.emit('camera_status', {status: 'disconnected'});
	//	}
	//	this.status = ERROR;
	}	
};
// end of checkForConnectionErrors
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

					self.camera.addChunk( self.stream.id, video );	// the chunk will be indexed by the camera

					if (cb) cb(null, video);
				}                        
			});
		});
	});

};
// end of moveFile
//


/**
 * Adds files array to pending list
 *  
 *  @param { files } array Files array ( filenames only )
 */
RecordModel.prototype.addNewVideosToPendingList = function( files ) {

    var self = this;

    for ( var i in files ) {
		var file = files[i];
		self.pending.push(  self.folder + "/videos/tmp/" + file );
	}
};
// end of addNewVideosToPendingList
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

