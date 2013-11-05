//
// dblite.js
//
// queries the sqlite3 db
//

var dblite = require('dblite');
var format = require('util').format;
var path = require('path');
var fs = require('fs');

var db = dblite('./db.sqlite');

db.query('CREATE TABLE IF NOT EXISTS videos (id INTEGER PRIMARY KEY, start INTEGER, end INTEGER, cam STRING, file TEXT)');
db.query('.show');
// db.loadDatabase();


/**
 * insertVideo
 *
 */
var insertVideo = function( data ) {
    if (!db) {
        console.log("db is not ready yet");
    }

    console.log("* * * inserting video");
    console.log(data);
    db.query('INSERT INTO videos(start, end, cam, file) VALUES(?, ?, ?, ?)', [data.start, data.end, data.cam, data.file]);
};
// - - end of insertVideo
// - - - - - - - - - - - - - - - - - - - -
var sortByStartTimeDesc = function(a, b) {
    if (a.start > b.start) {
        return -1;
    } else if (a.start < b.start) {
        return 1;
    } else {
        return 0;
    }
};


var sortByStartTimeAsc = function(a, b) {
    if (a.start < b.start) {
        return -1;
    } else if (a.start > b.start) {
        return 1;
    } else {
        return 0;
    }
};

/**
 * searchVideosByInterval
 *
 */
var searchVideosByInterval = function( camId, start, end, cb ) {
    
    // db.loadDatabase();
/*
    db.find({ $and: [ {cam: camId}, {start: { $lte: (end+500) }}, {end: {$gte: (start-500)}} ] }).toArray(function(err, docs) {
        if (err) {
            console.log("error searching for videos by interval: " + err);
            cb (err, [], 0);
            return;
        }
        
        var fileList = [];

        var offset = {
            begin: 0,
            duration: 0
        };
        
        docs = docs.sort(sortByStartTimeAsc);

        console.log("found " + docs.length + " videos");

        for (var i = 0; i < docs.length; i++) {
            if (i === 0 && docs[i].start < start) {
                offset.begin = start - docs[i].start;                                 
            } 
            if (i == docs.length-1) {
                var endOffset = 0;
                if (docs[i].end > end) {
                    endOffset = docs[i].end - end;
                }
                offset.duration = docs[i].end - docs[0].start - offset.begin - endOffset;
            }
            fileList.push(docs[i]);
        }
        cb( err, fileList, offset );   
    });
    */
    var fileList = db.query('SELECT start, end, file FROM videos WHERE cam = ? AND start < ? AND end > ? ORDER BY start ASC', 
            [camId, end+500, start-500], 
            ['start', 'end', 'file'], 
            function(err, data) {
                //console.log(data);

                    var offset = {
                        begin: 0,
                        end: 0,
                        duration: 0
                    };

                if (!data || data.length === 0) {
                    cb(err, [], offset);
                } else {
                    if ( docs[0].start < start ) {
                        offset.begin = start - data[0].start;
                    }
                    offset.end = data[data.length-1].end - end;
                    offset.duration = data[data.length-1].end - data[0].start - offset.begin - offset.end;
                
                    cb(err, data, offset);
                }
            });
};
// - - end of searchVideosByInterval
// - - - - - - - - - - - - - - - - - - - -



/**
 * searchVideoByTime
 *
 */
var searchVideoByTime = function( camId, startTime, cb ) {

   //db.loadDatabase();
   //console.log("done");
    
    /*
   db.find({ $and: [ {cam: camId}, {start: { $lte: (startTime+2500) }}, {end: {$gte: (startTime-2500) }} ] }).toArray(function(err, docs) {
       if (err) {
           console.log("error while searching videos by time: ");
           console.log(err);
           return;
       }

       //docs = docs.sort(sortByStartTimeDesc);
       
       var offset = 0;
       //console.log("found " + docs.length + " videos");
       if (docs.length > 0 ) {
           doc = docs[0];
           // console.log("found video: " + doc.file);
           offset = Math.round( (startTime - doc.start)/1000.0 );
           cb( doc.file, offset );
       } else {
           console.log("video not found");
           cb( "", offset );                
        }
   });
   */

    console.log("- - - - - - - - - -");
    console.log("search video by time");
    console.log( camId + " : " + startTime );
    console.log("- - - - - - - - - -");

    cb("", 0);

   
};
// - - end of searchVideoByTime
// - - - - - - - - - - - - - - - - - - - -



/**
 * listAll
 *
 */
var listAll = function( camId ) {
    
    //console.log(db);
    // db.loadDatabase();

    /*
    if (camId === "" || camId === undefined) {
        console.log("listing data from all cameras");
        db.find({}).toArray(function(err, docs) {
            if (err) {
                console.log(err);
                return;
            }
            console.log(docs);
        });
    } else {
        db.find({ cam: camId }, function (err, docs) {
            if (err) {
                console.log(err);
                return;
            }
            // console.log(docs);
        });
    }
    */

    console.log("- - - - - - - - - -");
    console.log("listAll");
    console.log( camId  );
    console.log("- - - - - - - - - -");
    
};
// - - end of listAll
// - - - - - - - - - - - - - - - - - - - -


// exports
exports.searchVideosByInterval = searchVideosByInterval;
exports.listAll = listAll;
exports.insertVideo = insertVideo;
exports.searchVideoByTime = searchVideoByTime;



