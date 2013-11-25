var ffmpeg = require('./../helpers/ffmpeg.js');
var fs = require('fs');
var path = require('path');
var Watcher = require('./../helpers/watcher.js');
var exec = require('child_process').exec;
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var RECORDING = 2,
    STOPPING = 1,
    STOPPED = 0,
    ERROR = -1;

function RecordModel( datastore, camera ) {

    var self = this;

    this.pending = [];

    this.lastChunkTime = 0;
	this.lastErrorTime = 0;

    this.status = ERROR;

    this.rtsp = camera.rtsp;
    this.db = datastore;
    this.camId = camera._id;
    
    this.error = false;

    this.folder = "";

    this.setupFolders( camera );

    this.watcher = new Watcher( self.folder + '/videos/tmp', 'ts');

    console.log("record constructor");    
    console.log("camera: " + camera.name);
    console.log("folder: " + this.folder);
    console.log("rtsp: " + this.rtsp);  
}


util.inherits(RecordModel, EventEmitter);


RecordModel.prototype.setupFolders = function( camera ) {
   
    this.folder = camera.videosFolder;

    this.setupFolderSync(this.folder);
    this.setupFolderSync(this.folder + "/tmp");
    this.setupFolderSync(this.folder + "/videos");
    this.setupFolderSync(this.folder + "/videos/tmp");
    this.setupFolderSync(this.folder + "/thumbs");
 
    var tmpFolder = this.folder + "/videos/tmp";

    fs.readdirSync(tmpFolder).forEach(function(file, index){

        var curPath = tmpFolder + "/" + file;

        if(fs.statSync(curPath).isDirectory()) { 
            deleteFolderRecursive(curPath);
        } else { 
            fs.unlinkSync(curPath);
        }
    });
};


RecordModel.prototype.updateCameraInfo = function( camera ) {
    this.rtsp = camera.rtsp;
    this.camId = camera._id;
};


RecordModel.prototype.stopRecording = function() {
   
	console.log("record model stop recording...");

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
        exec("kill -s 9 " + this.ffmpegProcess.pid, function(err) {console.log(err);});
        this.status = STOPPED;
    }
};


RecordModel.prototype.getStatus = function() {
    return this.status;
};

RecordModel.prototype.setStatus = function( status ) {
    this.status = status;
};

RecordModel.prototype.indexPendingFiles = function() {

    var self = this;

    while (self.pending.length > 1)  {
        var file = self.pending.shift();        
        self.moveAndIndexFile( file );
    }
};


RecordModel.prototype.startRecording = function() {    

	console.log("record model start recording...");
    var self = this;

    this.status = RECORDING;
    this.lastChunkTime = Date.now();

    this.watcher.startWatching();
	
    this.watcher.on("new_files", function( files ) {
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

		if ( (dt > 20*1000 && self.status === RECORDING) || (dt > 10*1000 && self.status === ERROR) ) 
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


RecordModel.prototype.moveAndIndexFile = function( file ) {

    var self = this;

    self.calcDuration( file, function( video ) {
        self.moveFile( video );
        self.emit('new_chunk', video );
    });
};


RecordModel.prototype.calcDuration = function( file, cb ) {

    var self = this;

    var fileInfo = fs.statSync( file );
    var lastModified = ( new Date(fileInfo.mtime) ).getTime();
    
    ffmpeg.calcDuration( file, function(duration) {

        var start =  lastModified - duration;
        var end = lastModified;

        video = {
            cam: self.camId,
            start: start,
            end: end,
            file: file
        };

        cb( video );
    });    
};


RecordModel.prototype.checkForConnectionErrors = function() {
	
	var self = this;

	if (this.status === STOPPING) {
		console.log("STOPPING");
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

RecordModel.prototype.moveFile = function( video ) { 

    var self = this;

    var from = self.folder + "/videos/tmp/" + path.basename( video.file );
    var to = self.folder + "/videos/" + video.start + path.extname( video.file );
 
    fs.exists( from, function(exists) {
        fs.rename( from, to, function(err) { 
            if (err) {
                console.log("error when moving file: " + err);
            }
            else {
                video.file = to;
                ffmpeg.makeThumb( to, self.folder + "/thumbs", {width: 160, height: 120}, function() { 
                });
                self.db.insertVideo( video );
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

         this.ffmpegProcess = exec( "ffmpeg -rtsp_transport tcp -fflags +igndts -i " + self.rtsp + " -vcodec copy -an -map 0 -f segment -segment_time 10 -bsf dump_extra -flags -global_header -segment_format mpegts '" + self.folder + "/videos/tmp/capture-%03d.ts'",

                function (error, stdout, stderr) {
                    if (error !== null  && error.signal != 'SIGKILL' ) {
						self.checkForConnectionErrors();
                    }
                }); 

        this.ffmpegProcess.on('exit', function() {

			self.checkForConnectionErrors();
			self.recordContinuously();
		});
 
    } else if (self.rtsp.indexOf("http") >= 0) {
        this.ffmpegProcess = exec( "ffmpeg -i " + self.rtsp + " -vcodec copy -an -map 0 -f segment -segment_time 10 -bsf dump_extra -flags -global_header -segment_format mpegts '" + self.folder + "/videos/tmp/capture-%03d.ts'",

                function (error, stdout, stderr) {

                    if (error !== null && error.signal !== 'SIGKILL') {
						self.checkForConnectionErrors();
					}
				}); 

        this.ffmpegProcess.on('exit', function() {
			
			self.checkForConnectionErrors();
			self.recordContinuously();
		});   
    }
};
// - - -

module.exports = RecordModel;

