//
// dblite.js
//
// queries the sqlite3 db
//

var dblite = require('dblite');
var format = require('util').format;
var path = require('path');
var fs = require('fs');

var Dblite = function( db_path, cb ) {

	var self = this;
    this.db = dblite( db_path );

    this.db.query('CREATE TABLE IF NOT EXISTS videos (id INTEGER PRIMARY KEY, start INTEGER, end INTEGER, file TEXT)', function() {
		self.db.query('.show');
		if (cb) cb();
	});
    //this.db.query('.show');
};


Dblite.prototype.deleteVideo = function( id, cb ) {

	var query = 'DELETE FROM videos WHERE id = ' + parseInt(id);
	//console.log(query);

	this.db.query( query,
		function(err, rows) {
			//console.log("chunk " + id + " deleted");
			cb( err );		
		}
	);
};

/**
 * insertVideo
 *
 */
Dblite.prototype.insertVideo = function( data ) {
	
    if (!this.db) {
        console.log("db is not ready yet");
    }

    if ( !data || (typeof data !== 'object') || !data.file || !data.start || !data.end ) {
		console.log("!!! attempt to insert invalid data to database !!!");
		console.log( data );
		console.log("!!!");
        return;
    }

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


	if ( isNaN( start ) || isNaN( end ) )  {
		console.log( "[Dblite.searchVideosByInterval] invalid interval error: " + start + " : " + end );
		return;
	}

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


Dblite.prototype.getExpiredChunks = function( expirationDate, numberOfChunks, cb ) {

	var query = 'SELECT id, file, start FROM videos WHERE start < ? ORDER BY id ASC LIMIT ?';

    var fileList = this.db.query(
			query, 
            [expirationDate, numberOfChunks], 
            ['id', 'file', 'start'], 
            function(err, data) {
				console.log('get expired chunks: ');
				console.log( data );
                if (!data || data.length === 0) {
                     cb( [] );
                } else {
                    cb(data);
                }
            }
		);
};


Dblite.prototype.getOldestChunks = function( numberOfChunks, cb ) {

	var query = 'SELECT id, file, start FROM videos WHERE id in (SELECT id FROM videos ORDER BY id ASC LIMIT ?)';

    var fileList = this.db.query(
			query, 
            [numberOfChunks], 
            ['id', 'file', 'start'], 
            function(err, data) {

                if (!data || data.length === 0) {
                     cb( [] );
                } else {
                    cb(data);
                }
            }
		);
};

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


