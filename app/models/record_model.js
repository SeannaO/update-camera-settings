var ffmpeg = require('./../helpers/ffmpeg.js');		// ffmpeg helper
var fs = require('fs');								// file system utils
var path = require('path');							// path manipulation utils
var Watcher = require('./../helpers/watcher.js');	// watches folder for new chunks
var exec = require('child_process').exec;			// for executing system commands
var EventEmitter = require('events').EventEmitter;	// for events
var util = require('util');							// for inheritin events class

// record statuses
var RECORDING = 2,
    STOPPING = 1,
    STOPPED = 0,
    ERROR = -1;

function RecordModel( camera, stream ) {

    var self = this;

    this.pending = [];		// array of pending chunks on tmp folder

    this.lastChunkTime = 0;	//	last time a new chunk was recorded
	this.lastErrorTime = 0;	//	last time ffmpeg threw an error

    this.status = ERROR;	// starts as an error until we actually have a chunk

	this.camera = camera;	
    this.camId = camera._id;
    this.rtsp = stream.rtsp || stream.url;	// supports different attribute names for rtsp 
											// (we might want to change that)
	this.stream = stream;	// corresponding stream
    this.db = stream.db;	// corresponding stream.db - for indexing
    
	//    this.error = false;		// 

    this.folder = "";		// stream folder - it's empty until we setup the folders

    this.setupFolders();	// creates folders if necessary

	// watcher will watch for new chunks on tmp folder
    this.watcher = new Watcher( self.folder + '/videos/tmp', 'ts');

    console.log("record constructor");    
    console.log("camera: " + camera.name);
    console.log("folder: " + this.folder);
    console.log("rtsp: " + this.rtsp);  
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
 
    var tmpFolder = this.folder + "/videos/tmp";

	// cleans up tmp folder
    fs.readdirSync(tmpFolder).forEach(function(file, index){

        var curPath = tmpFolder + "/" + file;

        if(fs.statSync(curPath).isDirectory()) { 
            deleteFolderRecursive(curPath);
        } else { 
            fs.unlinkSync(curPath);
        }
    });
};
// end of setupFolders
//


/**
 * Updates rtsp and camera id
 *  
 * @param { camera } obj 
 *     camera should contain: { _id }
 * @param { stream } obj 
 *     stream should contain: { url || rtsp }
 */
RecordModel.prototype.updateCameraInfo = function( camera, stream ) {

    this.rtsp = stream.url || stream.rtsp;	// supporting both attributes name
											// we might want to change that
    this.camId = camera._id;
};
// end of updateCameraInfo
// 


RecordModel.prototype.stopRecording = function() {

	console.log(" - - - record model stop recording - - - ");

    this.status = STOPPING;

    this.watcher.removeAllListeners('new_files');
    this.watcher.stopWatching();

    clearInterval( this.indexIntervalId );
    clearInterval( this.isRecordingIntervalId );

    if (this.ffmpegProcess) {
        console.log("killing ffmpeg process: " + this.ffmpegProcess.pid);

        this.ffmpegProcess.removeAllListeners('exit');
        this.ffmpegProcess.kill();
        var exec = require('child_process').exec;
        exec("kill -s 9 " + this.ffmpegProcess.pid, function(err) {});
        this.status = STOPPED;
    }
};


RecordModel.prototype.getStatus = function() {
    return this.status;
};

RecordModel.prototype.setStatus = function( status ) {
    this.status = status;
};

RecordModel.prototype.indexPendingFiles = function( cb ) {

    var self = this;

	//console.log(self.pending);

	if (self.pending.length <= 1) {
		if (cb) cb();
	} else {
        var file = self.pending.shift();
        self.moveAndIndexFile( file, function() {
			self.indexPendingFiles( cb );
		});
    }
};


RecordModel.prototype.startRecording = function() {    

	console.log(" - - - record model start recording - - - ");
	
    var self = this;
	if (this.status === RECORDING) {
		console.log('-- already recording! --');
		return;
	}

    this.status = RECORDING;
    this.lastChunkTime = Date.now();

    this.watcher.startWatching();
	
    this.watcher.on("new_files", function( files ) {
		console.log("new file");
		console.log(files);
		if (self.status === ERROR) {
			self.emit('camera_status', {status: 'connected'});
		} else {
			self.emit('camera_status', {status: 'online'});
		}
		self.status = RECORDING;
        self.lastChunkTime = Date.now();
        self.addNewVideosToPendingList( files );
    });

	this.isRecordingIntervalId = setInterval( function() {
		
		var dt = Date.now() - self.lastChunkTime;

		if ( (dt > 30*1000 && self.status === RECORDING) || (dt > 20*1000 && self.status === ERROR) ) 
		{	
			if ( self.status !== ERROR ) {
				self.emit('camera_status', { status: 'disconnected' });
				self.status = ERROR;
			} else {
				self.emit('camera_status', { status: 'offline' });
			}
			self.lastChunkTime = Date.now();
			self.stopRecording();
			
			setTimeout( function() {
				self.startRecording();
			}, 100);
			
		}
	}, 5000);
    
	this.recordContinuously();
};


RecordModel.prototype.setupFolderSync = function(folder) {

    if ( fs.existsSync(folder) ){
        return true;
    } else {
        fs.mkdirSync(folder);
        return false;
    }
};


RecordModel.prototype.moveAndIndexFile = function( file, cb ) {

    var self = this;
	console.log( '***moveAndIndexFile ' + file );
    self.calcDuration( file, function( video ) {
        self.moveFile( video, function() {
			self.emit('new_chunk', video );
			if ( cb ) {
				cb();
			}
		});
	});
};


RecordModel.prototype.calcDuration = function( file, cb ) {

	var self = this;

    fs.stat( file, function( err, fileInfo ) {
		
		//console.log("Fileinfo" + fileInfo);
		//console.log( file );
		if (err ) console.log( err );

		var lastModified = ( new Date(fileInfo.mtime) ).getTime();

		ffmpeg.calcDuration( file, function(duration) {

			var start =  lastModified - duration;
			var end = lastModified;

			video = {
				cam: self.camId,
				stream: self.stream.id,
				start: start,
				end: end,
				file: file
			};

			cb( video );
		});
	});
};


RecordModel.prototype.checkForConnectionErrors = function() {
	
	var self = this;

	if (this.status === STOPPING) {
		this.status = STOPPED;
	} else if ( Date.now() - this.lastErrorTime > 20000 ) {
	//	self.lastErrorTime = Date.now();
	//	if (self.status === ERROR) {
//			self.emit('camera_status', {status: 'offline'});
	//	} else if (self.status === RECORDING) {
//			self.emit('camera_status', {status: 'disconnected'});
	//	}
	//	this.status = ERROR;
	}	

};

RecordModel.prototype.moveFile = function( video, cb ) { 

    var self = this;

    var from = self.folder + "/videos/tmp/" + path.basename( video.file );
    var to = self.folder + "/videos/" + video.start + path.extname( video.file );
 
    fs.exists( from, function(exists) {
        fs.rename( from, to, function(err) { 
            if (err) {
                console.log("error when moving file: " + err);
				if (cb) cb(err);
            }
            else {
                video.file = to;
                ffmpeg.makeThumb( to, self.folder + "/thumbs", {width: 160, height: 120}, function() { 
					self.camera.addChunk( self.stream.id, video );
					if (cb) {
						cb();
					}
                });
            }                        
        });
    });
};


RecordModel.prototype.addNewVideosToPendingList = function( files ) {

    var self = this;

    for ( var i in files ) {
		var file = files[i];
		self.pending.push(  self.folder + "/videos/tmp/" + file );
	}
};

// - -
//
RecordModel.prototype.recordContinuously = function() {

    var self = this;

    if (self.rtsp.indexOf("rtsp") >= 0) {
         this.ffmpegProcess = exec( "nice -n -20 ffmpeg -rtsp_transport tcp -fflags +igndts -i '" + self.rtsp + "' -vcodec copy -an -map 0 -f segment -segment_time 10 -bsf dump_extra -flags -global_header -segment_format mpegts '" + self.folder + "/videos/tmp/capture-%03d.ts'",

                function (error, stdout, stderr) {

                    if (error !== null  && error.signal != 'SIGKILL' ) {
						console.log("ffmpeg record error");
						console.log( error );
						setTimeout( function() {
							self.checkForConnectionErrors();
						}, 500 );
                    }
                }); 

        this.ffmpegProcess.on('exit', function() {
			
			setTimeout( function() {
				if (self.status !== STOPPING && self.status !== STOPPED) {
					self.recordContinuously();
					self.checkForConnectionErrors();
				}
			}, 500 );
		});
 
    } else if (self.rtsp.indexOf("http") >= 0) {
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
// - - -

module.exports = RecordModel;

