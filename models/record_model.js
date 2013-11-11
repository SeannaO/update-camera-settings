var ffmpeg = require('./../helpers/ffmpeg.js');
var fs = require('fs');
var path = require('path');
var Watcher = require('./../helpers/watcher.js');
var exec = require('child_process').exec;


function RecordModel( datastore, camera ) {

    var self = this;

    this.pending = [];

    this.rtsp = camera.rtsp;
    this.db = datastore;
    this.camId = camera._id;
    this.lastVideo = 0;
    
    this.folder = "";

    this.setupFolders( camera );

    this.watcher = new Watcher( self.folder + '/videos/tmp', 'ts');
    
    this.watcher.on("new_files", function( files ) {
        //console.log("new files");
        //console.log(files);
        self.addNewVideosToPendingList( files );
    });

    setInterval( function() {
        self.indexPendingFiles();
    }, 5000);

    console.log("record constructor");    
    console.log("camera: " + camera.name);
    console.log("folder: " + this.folder);
    console.log("rtsp: " + this.rtsp);  
}


RecordModel.prototype.setupFolders = function( camera ) {

    this.folder = camera.videosFolder;
    console.log( "*** folder: " + this.folder );
    
    
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
    
    if (this.ffmpegProcess) {
        console.log("killing ffmpeg process: " + this.ffmpegProcess.pid);

        this.ffmpegProcess.removeAllListeners('exit');
        this.ffmpegProcess.kill();
        var exec = require('child_process').exec;
        exec("kill -s 9 " + this.ffmpegProcess.pid, function(err) {console.log(err);});
        
    }
};

RecordModel.prototype.indexPendingFiles = function() {
    
    //console.log("index pending files");
    //console.log(this.pending);

    var self = this;

    while (self.pending.length > 1)  {
        var file = self.pending.shift();        
        self.moveAndIndexFile( file );
    }
};


RecordModel.prototype.startRecording = function() {    
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
                    if (error !== null) {
                        error = true;
                    }
                }); 

        this.ffmpegProcess.on('exit', function() {
            self.recordContinuously();
        });
 
    } else if (self.rtsp.indexOf("http") >= 0) {
        this.ffmpegProcess = exec( "ffmpeg -i " + self.rtsp + " -vcodec copy -an -map 0 -f segment -segment_time 10 -bsf dump_extra -flags -global_header -segment_format mpegts '" + self.folder + "/videos/tmp/capture-%03d.ts'",
                function (error, stdout, stderr) {
                    if (error !== null) {
                        error = true;
                        console.error('FFmpeg\'s  exec error: ' + stderr);
                    }
                }); 

        this.ffmpegProcess.on('exit', function() {
            console.log( "ffmpeg terminated, restarting..." );
            self.recordContinuously();
        });   
    }
};
// - - -

module.exports = RecordModel;

