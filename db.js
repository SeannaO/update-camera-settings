var sqlite3 = require('sqlite3').verbose();
var path = require('path');
var fs = require('fs');

var setup = function() {
    
    createVideosTable();
    createNewVideosTable();
}


var createVideosTable = function() {
    var db = new sqlite3.Database('db.sqlite');

    db.run("CREATE TABLE videos (id INTEGER PRIMARY KEY AUTOINCREMENT, cam INT, file TEXT, start INT, end INT)", function(err) {
        if (err) {
            console.log("error: " + err);
        }
        db.close();
    });
}


var createNewVideosTable = function() {
    var db = new sqlite3.Database('db.sqlite');
    
    db.run("CREATE TABLE new_videos (id INTEGER PRIMARY KEY AUTOINCREMENT, cam INT, file TEXT, start INT, end INT)", function(err) {
        if (err) {
            console.log("error: " + err);
        }
        db.close();
    });
}


var getNewVideos = function(cb) {

    var db = new sqlite3.Database('db.sqlite');
    
    var videosList = [];

    db.all("SELECT file, start FROM new_videos ORDER BY start ASC", 
            function(err, rows) {    

                if (err) {
                    console.log("error retrieving list of new videos: " + err);
                }

                var offset = 0;
                console.log("found " + rows.length + "new videos");
                for (var i = 0; i < rows.length; i++) {
                    videosList.push( rows[i] );
                }
                db.close();
                cb( err, videosList );
            });      
}

//
var getNewVideoByFilename = function( filename, cb ) {
    
    filename = path.basename( filename );
    
    var db = new sqlite3.Database('db.sqlite');
    var videosList = [];

    db.all("SELECT * FROM new_videos", 
            function(err, rows) {    

                if (err) {
                    console.log("error retrieving list of new videos: " + err);
                } 
                else {
                    for (var i = 0; i < rows.length; i++) {
                        if ( filename == path.basename( rows[i].file ) ) { 
                            var video = {
                                id: rows[i].id,
                                file: rows[i].file,
                                cam: rows[i].cam,
                                start: rows[i].start,
                                end: rows[i].end
                            };
                            videosList.push( rows[i] );
                        }
                    }
                }
                db.close();
                cb( err, videosList );
            });     
}

//
archiveNewVideoByFilename = function( filename, cb ) {
    getNewVideoByFilename( filename, function(err, list) {
        if (err) {
            console.log("error while archiving new video: " + err);
        }
        else if (list.length > 0) {
            var video = list[0];
            archiveNewVideo(video, function() {});

        } else {
            console.log("no new videos yet");
        }
    });
}

//
archiveNewVideo = function( video, cb ) {
    console.log("archiving...");
    console.log(video);

    var filename = video.file;

    removeNewVideo( video.id, function(err) {
        if (err) {
            console.log("error archiving video: " + err);
        }
        else {
            var dest = __dirname + "/videos/" + Date.now() + path.extname(filename);
            fs.rename( filename, dest, function(err) {
                if (err) {
                    console.log("an error occurred when trying to move " + filename + " to " + dest);
                }
                else {
                    video.file = dest;
                    insertVideo( video );
                }
            });            
        }
    });
}


var removeNewVideo = function( new_video_id, cb ) {
     var db = new sqlite3.Database('db.sqlite');

     db.run("DELETE FROM new_videos WHERE id = " + new_video_id, function(err) {

         if (err) {
             console.log("error removing new video " + new_video_id + "from database: " + err);
         }
         
         cb(err);

         db.close();
     });
}


var insertNewVideo = function( data ) {
    var db = new sqlite3.Database('db.sqlite');

    db.run("INSERT INTO new_videos( cam, file, start, end )" +
            "VALUES( \""+data.cam+"\", " +
            "\""+data.file+"\", " +
            "\""+data.start+"\", " +
            "\""+data.end+"\")",
            function(err){
                if (err) { 
                    console.log("error inserting new video: " + err); 
                }
                db.close();
            });
}


var insertVideo = function( data ) {
    var db = new sqlite3.Database('db.sqlite');

    db.run("INSERT INTO videos( cam, file, start, end )" +
            "VALUES( \""+data.cam+"\", " +
            "\""+data.file+"\", " +
            "\""+data.start+"\", " +
            "\""+data.end+"\")",
            function(err){
                if (err) { 
                    console.log("error inserting video: " + err); 
                }
                db.close();
            });
}


var searchVideosByInterval = function( start, end, cb ) {

    var db = new sqlite3.Database('db.sqlite');
    
    var fileList = [];

    db.all("SELECT file, start, end FROM videos WHERE (start <= " + end + " AND end >= " + start + ") ORDER BY start ASC", 
            function(err, rows) {    

                if (err) {
                    console.log("error searching for videos by interval: " + err);
                }
                
                var offset = {
                    begin: 0,
                    duration: 0
                }
                
                console.log("found " + rows.length + " videos");

                for (var i = 0; i < rows.length; i++) {
                    if (i == 0 && rows[i].start < start) {
                        offset.begin = start - rows[i].start;                                 
                    } 
                    if (i == rows.length-1) {
                        var endOffset = 0;
                        if (rows[i].end > end) {
                            endOffset = rows[i].end - end;
                        }
                        offset.duration = rows[i].end - rows[0].start - offset.begin - endOffset;
                    }
                    fileList.push( rows[i].file );
                }
                db.close();
                cb( err, fileList, offset );
            });    
}

var searchVideoByTime = function( startTime, cb ) {
    var db = new sqlite3.Database('db.sqlite');

    db.all("SELECT file, start FROM videos WHERE start <= " + startTime + " AND end >= " + startTime + " ORDER BY start DESC", 
            function(err, rows) {
                
                if (err) {
                    console.log("error searching for videos by start time: " + err);
                    cb("", 0);
                } else {
                    var offset = 0;
                    console.log("found " + rows.length + " videos");
                    if (rows.length > 0 ) {
                        row = rows[0];
                        console.log("found video: " + row.file);
                        offset = Math.round( (startTime - row.start)/1000.0 );
                        cb( row.file, offset );
                    } else {
                        console.log("video not found");
                        cb("", 0);
                    }
                }

                db.close();
            });
}


var listAll = function( table ) {
    var db = new sqlite3.Database('db.sqlite');
    
    db.each("SELECT * FROM " + table + " ORDER BY start ASC", function(err, row) {
        console.log(row);
    });

    db.close();
}


exports.setup = setup
exports.searchVideosByInterval = searchVideosByInterval
exports.listAll = listAll
exports.insertVideo = insertVideo
exports.insertNewVideo = insertNewVideo
exports.archiveNewVideoByFilename = archiveNewVideoByFilename
exports.searchVideoByTime = searchVideoByTime
exports.getNewVideoByFilename = getNewVideoByFilename

