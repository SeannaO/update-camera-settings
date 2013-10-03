//
// db.js
//
// queries the sqlite database
//

//var sqlite3 = require('sqlite3').verbose();
var sqlite3 = require('node-sqlite-purejs');
var path = require('path');
var fs = require('fs');


/**
 * setup
 *
 */
var setup = function() {
    createVideosTable();
}
// - - end of setup
// - - - - - - - - - - - - - - - - - - - -


/**
 * testIpForOnvifCamera
 *
 */
var createVideosTable = function() {
    sqlite3.open('db.sqlite', {}, function(err, db) {;
        db.exec("CREATE TABLE videos (id INTEGER PRIMARY KEY AUTOINCREMENT, cam INT, file TEXT, start INT, end INT)", function(err) {
            if (err) {
                console.log("error: " + err);
            }
        });
    });
}
// - - end of createVideosTable
// - - - - - - - - - - - - - - - - - - - -


/**
 * insertVideo
 *
 */
var insertVideo = function( data ) {
        //var db = new sqlite3.Database('db.sqlite');
    sqlite3.open("db.sqlite", {}, function(err), {
        db.exec("INSERT INTO videos( cam, file, start, end )" +
                "VALUES( \""+data.cam+"\", " +
                "\""+data.file+"\", " +
                "\""+data.start+"\", " +
                "\""+data.end+"\")",
                function(err){
                    if (err) { 
                        console.log("error inserting video: " + err); 
                    }
                });
    }
}
// - - end of insertVideo
// - - - - - - - - - - - - - - - - - - - -


/**
 * searchVideosByInterval
 *
 */
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
                    fileList.push({
                        start: rows[i].start,
                        end: rows[i].end,
                        file: rows[i].file 
                    });
                }
                db.close();
                cb( err, fileList, offset );
            });    
}
// - - end of searchVideosByInterval
// - - - - - - - - - - - - - - - - - - - -



/**
 * searchVideoByTime
 *
 */
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
// - - end of searchVideoByTime
// - - - - - - - - - - - - - - - - - - - -



/**
 * listAll
 *
 */
var listAll = function( table ) {
    sqlite3.open('db.sqlite', {}, function(err, db) {
    
        db.exec("SELECT * FROM " + table + " ORDER BY start ASC", function(err, results) {
            console.log(results);
        });

        //db.close();
    });
}
// - - end of listAll
// - - - - - - - - - - - - - - - - - - - -


// exports
exports.setup = setup
exports.searchVideosByInterval = searchVideosByInterval
exports.listAll = listAll
exports.insertVideo = insertVideo
exports.searchVideoByTime = searchVideoByTime


