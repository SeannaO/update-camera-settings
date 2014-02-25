var ffmpeg = require('./../helpers/ffmpeg.js');		// ffmpeg helper
var fs = require('fs');								// file system utils
var path = require('path');							// path manipulation utils
var Watcher = require('./../helpers/watcher.js');	// watches folder for new chunks
var exec = require('child_process').exec;			// for executing system commands
var EventEmitter = require('events').EventEmitter;	// for events
var util = require('util');							// for inheritin events class
var dbus = require('node-dbus');

// record statuses
var RECORDING = 2,
    STOPPING = 1,
    STOPPED = 0,
    ERROR = -1;

function RecordModel( camera, stream, cb) {

    var self = this;

    this.pending = [];		// array of pending chunks on tmp folder

    this.lastChunkTime = 0;	//	last time a new chunk was recorded
    this.lastErrorTime = 0;	//	last time ffmpeg threw an error

    this.status = ERROR;	// starts as an error until we actually have a chunk

    this.camera = camera;	
    this.camId = camera._id;
    this.rtsp = stream.rtsp || stream.url;	// supports different attribute names for rtsp 
											// TODO: we might want to change that
    this.stream = stream;	// corresponding stream
    this.db = stream.db;	// corresponding stream.db - for indexing
    
    //    this.error = false;		// apparently not being used

    this.folder = "";		// stream folder - it's empty until we setup the folders

    this.setupFolders();	// creates folders if necessary

    this.filesToIndex = [];
    
	this.setupDbusListener();

	if (cb) cb(self);
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
RecordModel.prototype.setupFolders = function() {
   
    this.folder = this.camera.videosFolder + '/' + this.stream.id ;

	this.setupFolderSync( this.camera.videosFolder );
    this.setupFolderSync(this.folder);
    this.setupFolderSync(this.folder + "/tmp");
    this.setupFolderSync(this.folder + "/videos");
    this.setupFolderSync(this.folder + "/videos/tmp");
    this.setupFolderSync(this.folder + "/thumbs");
 
	this.cleanTmpFolder();

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

	console.log(" - - - record model stop recording - - - ");
	
	this.cleanTmpFolder();		// resets temp folder

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
	
	var dbusMonitorSignal = Object.create(dbus.DBusMessage, {
		path: {
			value: '/ffmpeg/signal/Object',
			writable: true
		},
		iface: {
			value: 'ffmpeg.signal.Type',
			writable: true
		},
		member: {
			value: 'new_chunk',
			writable: true
			},
		bus: {
			value: dbus.DBUS_BUS_SYSTEM,
			writable: true
		},
		variantPolicy: {
			value: dbus.NDBUS_VARIANT_POLICY_DEFAULT,
			writable: true
		},
		type: {
			value: dbus.DBUS_MESSAGE_TYPE_SIGNAL
		  }
	});

	try {
		dbusMonitorSignal.addMatch();
	} catch( e ) {
		console.log( e );
	}

	dbusMonitorSignal.on ("signalReceipt", function () {

		var new_chunk = JSON.parse( arguments[1] );

		new_chunk.id = new_chunk.id.trim();

		if ( new_chunk.id === self.stream.id ) { // && self.lastIdReceived != parseInt( new_chunk.file_id) ) {

			console.log('==== received new chunk from rtsp_grabber');
			console.error("received signal from dbus: ");
			console.error( new_chunk );

			self.lastIdReceived = parseInt( new_chunk.file_id );

			video = {
				cam: self.camId,
				stream: self.stream.id,         // appends stream id to the chunk
				start: new_chunk.start_time * 1000,
				end: ( Math.round(1000*new_chunk.start_time) + Math.round(1000*new_chunk.duration_secs ) ),
				file: new_chunk.file_id + '.ts'
			};

			self.status = RECORDING;
			self.lastChunkTime = Date.now();

			self.emit('camera_status', {status: 'online', stream_id: self.stream.id});

			self.moveFile( video, function() {
				console.error( "emitting new_chunk event... dbus listener: ");
				console.error( video );
				self.emit( 'new_chunk', video );
			});
		}
	});
}


RecordModel.prototype.sendSignal = function( command, url, path ) {

        var id = this.stream.id;

        var dbusSignal = Object.create(dbus.DBusMessage, {
                  path: {
                    value: '/ffmpeg/signal/Object',
                    writable: true
                  },
                  iface: {
                    value: 'ffmpeg.signal.Type',
                    writable: true
                  },
                  member: {
                    value: 'rtsp',
                    writable: true
                  },
                  bus: {
                    value: dbus.DBUS_BUS_SYSTEM,
                    writable: true
                  },
                  variantPolicy: {
                    value: dbus.NDBUS_VARIANT_POLICY_DEFAULT,
                    writable: true
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
		// 30s if recording
		// 20s if there was an error - to avoid false alarms
		if ( (dt > 30*1000 && self.status === RECORDING) || (dt > 20*1000 && self.status === ERROR) ) 
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
			//console.log('[RecordModel] monitor: no new chunks in a while, will attempt to stop/start recording');
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
		var start =  parseInt(matches[1]);
		var end = start + parseInt(matches[2]);

		video = {
			cam: self.camId,
			stream: self.stream.id,		// appends stream id to the chunk
			start: start,
			end: end,
			file: file
		};

		cb(null, video );
	}else{
		cb("file does not have start time and duration", null );
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
			var start =  lastModified - duration;		
			var end = lastModified;

			video = {
				cam: self.camId,
				stream: self.stream.id,		// appends stream id to the chunk
				start: start,
				end: end,
				file: file
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
		console.error("Cannot move video file since it is undefined");
		cb('Cannot move video file since it is undefined');
		return;
	}

	var date = new Date(video.start);
	var dateString = date.getUTCFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();

	var toFolder = self.folder + '/videos/' + dateString;

	var from = self.folder + "/videos/tmp/" + path.basename( video.file );
	var to = toFolder + '/' + video.start + "_" + (video.end - video.start) + path.extname( video.file );

	fs.exists( from, function(exists) {
		
		if( !exists ) {
			if (cb) cb('cannot move video file since it does not exist');
			return;
		}

		fs.mkdir(toFolder, function(e) {
			fs.rename( from, to, function(err) { 
				if (err) {
					console.error('[RecordModel.moveFile]: error when moving file: ' + err);
					if (cb) cb(err);
				}
				else {

					video.file = to;	// updates file path after moving it

					video.thumbFolder =  self.folder + '/thumbs';
					// delegated to Thumbnailer
					// - camerasController should push chunk to Thumbmailer queue
					//ffmpeg.makeThumb( to, self.folder + "/thumbs", {width: 160, height: 120}, function() { 
						self.camera.addChunk( self.stream.id, video );	// the chunk will be indexed by the camera

						if (cb) {
							cb();
						}
					//});
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
	return;


	// the recording processess 
	// are being executed as high priority processess (nice -20)
	// which means the cpu will allocate longer time shares to them

	// ffmpeg params:
	// 		-rtsp_transport tcp  	: used for rtsp
	// 		-fflags +igndts			: ignores dts (avoids error when stream doesn't support dts)
	// 		-vcodec copy			: avoids transcoding by just copying the stream
	//		-f segment				: specifies file format, in this case, segment files
	//		-segment_time			: segment time, in seconds - this is not precise
	//		-bsf dump_extra			: dumps headers to the segment - necessary for the segment to be played correctly
	//		-segment_format	mpegts	: ts file
    if (self.rtsp.indexOf("rtsp") >= 0) {
         this.ffmpegProcess = exec( "nice -n -20 ffmpeg -rtsp_transport tcp -fflags +igndts -i '" + self.rtsp + "' -vcodec copy -an -map 0 -f segment -segment_time 10 -bsf dump_extra -flags -global_header -segment_format mpegts '" + self.folder + "/videos/tmp/capture-%03d.ts'",

                function (error, stdout, stderr) {

					// when error occurs, 
					// and it's not because the process was killed
                    if (error !== null  && error.signal != 'SIGKILL' ) {
						console.error("[ error ] RecordModel.recordContinuously: ffmpeg record error");
						console.error( error );
						setTimeout( function() {
							self.checkForConnectionErrors();	// TODO: this call might be obsolete
						}, 500 );
                    }
                }); 

		// when the process exits for any reason...
        this.ffmpegProcess.on('exit', function() {	
			
			setTimeout( function() {

				// ... and when it's not because it was stopped by the camera model
				if (self.status !== STOPPING && self.status !== STOPPED) {
					
					self.recordContinuously();			// ...attempts to restart it
					self.checkForConnectionErrors();	// TODO: this call might be obsolete
					
				}
			}, 500 );	// this timeout avoids that 
						// the app tries to restart the process too frequently
						// causing a CPU usage peak
		});
 
    } else if (self.rtsp.indexOf("http") >= 0) {	// this is for http streams 
													// (we only use it for tests, but might be useful)

        this.ffmpegProcess = exec( "nice -n -20 ffmpeg -i '" + self.rtsp + "' -vcodec copy -an -map 0 -f segment -segment_time 10 -bsf dump_extra -flags -global_header -segment_format mpegts '" + self.folder + "/videos/tmp/capture-%03d.ts'",

                function (error, stdout, stderr) {
					console.log("ffmpeg record error");
                    if (error !== null && error.signal !== 'SIGKILL') {
						setTimeout( function() {
							self.checkForConnectionErrors();
						}, 500 );
					} 
				}); 

        this.ffmpegProcess.on('exit', function() {
			
			setTimeout( function() {
				//if (self.status !== STOPPING && self.status !== STOPPED) {
					self.recordContinuously();
					self.checkForConnectionErrors();
				//}
			}, 500 );
		});   
    }
};
// end of recordContinuously
//


module.exports = RecordModel;

