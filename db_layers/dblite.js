//
// dblite.js
//
// queries the sqlite3 db
//

var dblite = require('dblite');
var format = require('util').format;
var path = require('path');
var fs = require('fs');

var Dblite = function( db_path ) {
    this.db = dblite( db_path );

    this.db.query('CREATE TABLE IF NOT EXISTS videos (id INTEGER PRIMARY KEY, start INTEGER, end INTEGER, file TEXT)');
    this.db.query('.show');
};

/**
 * insertVideo
 *
 */
Dblite.prototype.insertVideo = function( data ) {
    if (!this.db) {
        console.log("db is not ready yet");
    }

    if ( !data || !data.start || !data.end || !data.file ) {
        return;
    }

    // console.log("* * * inserting video");
    // console.log(data);
    this.db.query('INSERT INTO videos(start, end, file) VALUES(?, ?, ?)', [data.start, data.end, data.file]);
};
// - - end of insertVideo
// - - - - - - - - - - - - - - - - - - - -
//


Dblite.prototype.sortByStartTimeDesc = function(a, b) {
    if (a.start > b.start) {
        return -1;
    } else if (a.start < b.start) {
        return 1;
    } else {
        return 0;
    }
};


Dblite.prototype.sortByStartTimeAsc = function(a, b) {
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
Dblite.prototype.searchVideosByInterval = function( start, end, cb ) {

    var fileList = this.db.query('SELECT start, end, file FROM videos WHERE start < ? AND end > ? ORDER BY start ASC', 
            [end+500, start-500], 
            ['start', 'end', 'file'], 
            function(err, data) {

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
Dblite.prototype.searchVideoByTime = function( startTime, cb ) {

    var fileList = this.db.query('SELECT start, end, file FROM videos WHERE start < ? AND end > ? ORDER BY start ASC', 
            [startTime+1500, startTime-1500], 
            ['start', 'end', 'file'], 
            function(err, data) {

                if (!data || data.length === 0) {
                     cb( "", 0 );
                } else {
                    offset = Math.round( (startTime - data[0].start)/1000.0 );
                    cb(data[0].file, offset);
                }
            });
    
    //console.log("- - - - - - - - - -");
    //console.log("search video by time");
    //console.log( camId + " : " + startTime );
    //console.log("- - - - - - - - - -");
   
};
// - - end of searchVideoByTime
// - - - - - - - - - - - - - - - - - - - -


/**
 * listAll
 *
 */
Dblite.prototype.listAll = function() {
    
    console.log("- - - - - - - - - -");
    console.log("listAll");
    console.log("- - - - - - - - - -");
    
};
// - - end of listAll
// - - - - - - - - - - - - - - - - - - - -


// exports
module.exports = Dblite;
//exports.searchVideosByInterval = searchVideosByInterval;
//exports.listAll = listAll;
//exports.insertVideo = insertVideo;
//exports.searchVideoByTime = searchVideoByTime;



