//
// dblite.js
//
// queries the sqlite3 db
//

var dblite     = require('dblite');
var format     = require('util').format;
var path       = require('path');
var fs         = require('fs');
var FileBackup = require('../helpers/file_backup.js');

var SensorDblite = function( db_path, cb ) {

	var self = this;
    this.db_path = db_path;
    this.db = dblite( self.db_path );

//    this.backup = new FileBackup(db_path, function(backup){
    //     backup.launch();
    // });
    this.createTableIfNotExists(function(){
        if(cb) cb(self);
    });
};

SensorDblite.prototype.deleteById = function( id, cb ) {

	var query = 'DELETE FROM videos WHERE id = ' + parseInt(id);

	this.db.query( query,
		function(err, rows) {
			cb( err, rows );		
		}
	);
};

SensorDblite.prototype.createTableIfNotExists = function( cb ) {
    var self = this;

	var createTable = 'CREATE TABLE IF NOT EXISTS sensor_data (id INTEGER PRIMARY KEY, timestamp INTEGER, value REAL, datatype TEXT)';
	var createTimestampIndex = 'CREATE INDEX idx_timestamp ON sensor_data(timestamp)';
	var createDataTypeIndex = 'CREATE INDEX idx_datatype ON sensor_data(datatype)';

	fs.exists(self.db_path, function(exist) {        
        if (typeof self.db === 'undefined' || !exist){
            self.db = dblite( self.db_path );
        }
		self.db.query(createTable, function() {
				self.db.query(createTimestampIndex, function() {
					console.log('created start index');
					self.db.query(createDataTypeIndex, function() {
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
SensorDblite.prototype.insert = function( data ) {
	
    if (!this.db) {
        console.error("db is not ready yet");
    }

    if ( !data || (typeof data !== 'object') || !data.timestamp || !data.value || !data.datatype ) {
		console.error("!!! attempt to insert invalid data to database !!!");
		console.error( data );
		console.error("!!!");
        return;
    }

    this.db.query('INSERT INTO sensor_data(timestamp, value, datatype) VALUES(?, ?, ?)', [data.timestamp, data.value, data.datatype]);
};
// - - end of insertVideo
// - - - - - - - - - - - - - - - - - - - -
//


SensorDblite.prototype.sortByTimestampDesc = function(a, b) {
    if (a.timestamp > b.timestamp) {
        return -1;
    } else if (a.timestamp < b.timestamp) {
        return 1;
    } else {
        return 0;
    }
};


SensorDblite.prototype.sortByTimestampAsc = function(a, b) {
    if (a.timestamp < b.timestamp) {
        return -1;
    } else if (a.timestamp > b.timestamp) {
        return 1;
    } else {
        return 0;
    }
};

/**
 * searchVideosByInterval
 *
 */
SensorDblite.prototype.find = function( options, cb ) {

    var q = 'SELECT timestamp, value, datatype FROM sensor_data';
    var queryArgs = [];
    var queryStatements = [];
    if (options && options.type){
        queryStatements.push('datatype = ?');
        queryArgs.push(options.type);
    }
    if (options && !isNaN(options.start) && !isNaN(options.end)){
        queryStatements.push('timestamp BETWEEN ? AND ?');
        queryArgs.push(options.start);
        queryArgs.push(options.end);
    }else if (!isNaN(options.start) && isNaN(options.end)){
        queryStatements.push('timestamp > ?');
        queryArgs.push(options.start);
    }else if (isNaN(options.start) && !isNaN(options.end)){
        queryStatements.push('timestamp < ?');
        queryArgs.push(options.end);
    }else{

    }
    if (queryStatements.length > 0){
        q +=  " WHERE " + queryStatements.join(" AND ") + ' ORDER BY timestamp ASC';
    }else{
        q += ' ORDER BY timestamp ASC';
    }
    
    // console.log(q);

//    var fileList = this.db.query('SELECT start, end, file FROM videos WHERE start < ? AND end > ? ORDER BY start ASC', 
	var fileList = this.db.query(q, 
            queryArgs, 
            ['timestamp', 'value', 'datatype'], 
            function(err, data) {

                var offset = {
                    begin: 0,
                    end: 0,
                    duration: 0
                };
                if (!data || data.length === 0) {
                    cb(err, [], offset);
                } else {
                    if ( data[0].timestamp < options.start ) {
                        offset.begin = options.start - data[0].timestamp;
                    }
                    offset.end = data[data.length-1].timestamp - options.end;
                    offset.duration = data[data.length-1].timestamp - data[0].timestamp - offset.begin - offset.end;
                    cb(err, data, offset);
                }
            });
};
// - - end of findBetween
// - - - - - - - - - - - - - - - - - - - -

// exports
module.exports = SensorDblite;


