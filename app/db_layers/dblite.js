//
// dblite.js
//
// queries the sqlite3 db
//

var dblite = require('dblite');
var format = require('util').format;
var path = require('path');
var fs = require('fs');
var FileBackup = require('../helpers/file_backup.js');

var Dblite = function( db_path, cb ) {

	var self = this;
    this.db_path = db_path;
    this.db = dblite( self.db_path );

    this.backup = new FileBackup(db_path, function(backup){
        backup.launch();
    });
    this.createTableIfNotExists(function(){
        if(cb) cb(self);
    });
};

Dblite.prototype.deleteVideo = function( id, cb ) {

	var query = 'DELETE FROM videos WHERE id = ' + parseInt(id);

	this.db.query( query,
		function(err, rows) {
			cb( err, rows );		
		}
	);
};

Dblite.prototype.createTableIfNotExists = function( cb ) {
    var self = this;

	var createTable = 'CREATE TABLE IF NOT EXISTS videos (id INTEGER PRIMARY KEY, start INTEGER, end INTEGER, file TEXT)';
	var createStartIndex = 'CREATE INDEX idx_start ON videos(start)';
	var createEndIndex = 'CREATE INDEX idx_end ON videos(end)';

	fs.exists(self.db_path, function(exist) {        
        if (typeof self.db === 'undefined' || !exist){
            self.db = dblite( self.db_path );
        }
		self.db.query(createTable, function() {
				self.db.query(createStartIndex, function() {
					console.log('created start index');
					self.db.query(createEndIndex, function() {
						self.db.query('.show');
						if (cb) cb();
					});
				});
        });
    });
};

/**
 * insertVideo
 *
 */
Dblite.prototype.insertVideo = function( data ) {
	
    if (!this.db) {
        console.error("db is not ready yet");
    }

    if ( !data || (typeof data !== 'object') || !data.file || !data.start || !data.end ) {
		console.error("!!! attempt to insert invalid data to database !!!");
		console.error( data );
		console.error("!!!");
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
		console.error( "[Dblite.searchVideosByInterval] invalid interval error: " + start + " : " + end );
		cb('invalid interval error');
		return;
	}

//    var fileList = this.db.query('SELECT start, end, file FROM videos WHERE start < ? AND end > ? ORDER BY start ASC', 
	var fileList = this.db.query('SELECT start, end, file FROM videos WHERE start BETWEEN ? AND ? ORDER BY start ASC', 
            [start-500, end], 
            ['start', 'end', 'file'], 
            function(err, data) {

                    var offset = {
                        begin: 0,
                        end: 0,
                        duration: 0
                    };

                if (err){
                    console.log("searchVideosByInterval");
                    console.log(err);
                }

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
    var self = this;
	var query = 'SELECT id, file, start FROM videos WHERE start < ? ORDER BY id ASC LIMIT ?';

    var fileList = this.db.query(
			query, 
            [expirationDate, numberOfChunks], 
            ['id', 'file', 'start'], 
            function(error, data) {
                if (error){
                    cb([]);
                }
                if (!data || data.length === 0) {
                     cb( [] );
                } else {
                    cb(data);
                }
            }
		);
};

Dblite.prototype.getChunks = function( options, cb ) {
    
	options = options || {};
    var limit = options.limit || '10';
    var sort = options.sort || "ASC";
    
    var query = 'SELECT id, file, start, end FROM videos ORDER BY id {sort} LIMIT ?';
	query = query.replace('{sort}', sort);

    var fileList = this.db.query(
        query, 
        [limit], 
        ['id', 'file', 'start', 'end'], 
        function(err, data) {
            if (err){
                console.log("getChunks");
                console.log(err);
            }
            if (!data || data.length === 0) {
                 cb( [] );
            } else {
                cb(data);
            }
        }
    );

};


Dblite.prototype.getOldestChunks = function( numberOfChunks, cb ) {
    this.getChunks({limit:numberOfChunks, sort: "ASC"}, cb);
};

Dblite.prototype.getNewestChunks = function( numberOfChunks, cb ) {
    var limit = numberOfChunks || 10;
    // var query = 'SELECT id, file, start, end FROM videos WHERE id in (SELECT id FROM videos ORDER BY end ? LIMIT ?)';
    var query = 'SELECT id, file, start, end FROM videos ORDER BY end DESC LIMIT ?';

    var fileList = this.db.query(
        query, 
        [limit], 
        ['id', 'file', 'start', 'end'], 
        function(err, data) {
            if (err){
                console.log("getNewestChunks");
                console.log(err);
            }
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

    var t0 = (startTime - 1500);
    var t1 = (startTime + 1500);

    var query = 'SELECT start, end, file FROM videos WHERE start BETWEEN '+t0+' AND '+t1+' ORDER BY start ASC';

    var fileList = this.db.query( 
			query, 
            ['start', 'end', 'file'], 
            function(err, data) {
                if (err){
                    console.log("searchVideoByTime");
                    console.log(err);
                }
                if (!data || data.length === 0) {
                     cb( "", 0 );
                } else {
                    offset = Math.round( (startTime - data[0].start)/1000.0 );
                    cb(data[0].file, offset);
                }
            });
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


