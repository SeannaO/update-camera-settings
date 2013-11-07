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

    if ( !data || !data.start || !data.end || !data.cam || !data.file ) {
        return;
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
                    if ( data[0].start < start ) {
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

    var fileList = db.query('SELECT start, end, file FROM videos WHERE cam = ? AND start < ? AND end > ? ORDER BY start ASC', 
            [camId, startTime+1500, startTime-1500], 
            ['start', 'end', 'file'], 
            function(err, data) {

                if (!data || data.length === 0) {
                     cb( "", offset );
                } else {
                    offset = Math.round( (startTime - data[0].start)/1000.0 );
                    cb(data[0].file, offset);
                }
            });
    
    console.log("- - - - - - - - - -");
    console.log("search video by time");
    console.log( camId + " : " + startTime );
    console.log("- - - - - - - - - -");
   
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



