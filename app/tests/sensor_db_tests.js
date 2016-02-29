
var assert = require("assert");
var sinon  = require("sinon");

var SensorDblite  = require('../db_layers/sensor_dblite.js');
var dblite_driver = require('dblite');

var fs  = require('fs');
var fse = require('fs-extra');

describe('SensorDblite', function() {
	
	describe( 'constructor', function() {
		
		it( 'should create sensor_data table if not exists', function( done ) {
				
			var dbfile = 'tests/fixtures/videosFolder/sensor_dblite_create_video_table_test.sqlite';
			var db = new SensorDblite(dbfile, function() {
				
				checkIfTableExists( dbfile, 'sensor_data', function( exists ) {
					assert( exists );
					db.close();
					done();
				});
			})
		});
	});

	describe( 'insert', function() {
		
		it( 'should properly insert data into the db', function( done ) {

			var dbfile = 'tests/fixtures/videosFolder/sensor_dblite_create_video_table_test.sqlite';

			var sensorEvent = {
				timestamp: 123,
				value: 456,
				datatype: 'hello'
			};

			var dbfile = 'tests/fixtures/videosFolder/sensor_dblite_create_video_table_test.sqlite';
			var db = new SensorDblite(dbfile, function() {
				db.insert( sensorEvent );
				setTimeout( function() {
						getData( dbfile, function(data) {
							assert(data);
							assert(data.length > 0);
							assert.equal( data[0].timestamp, sensorEvent.timestamp );
							assert.equal( data[0].value, sensorEvent.value );
							assert.equal( data[0].datatype, sensorEvent.datatype );
							db.close();
							done();
						});
					}, 100);
				});
		});


		it( 'should not attempt to insert invalid data', function( done ) {

			var dbfile = 'tests/fixtures/videosFolder/sensor_dblite_create_video_table_test.sqlite';

			var invalidSensorEvent = {
				timestamp: 123
			};
		
			var dbfile = 'tests/fixtures/videosFolder/sensor_dblite_create_video_table_test.sqlite';
			var db = new SensorDblite(dbfile, function() {
				var querySpy = sinon.spy(db.db, 'query');
				db.insert( invalidSensorEvent );
				assert(!querySpy.called);
				db.close();
				done();
			});
		});

	});
	// end of insert tests
	//
	//
	
	describe('find', function() {
		it('should callback with the expected data', function(done) {
			
			var dbfile = 'tests/fixtures/videosFolder/sensor_dblite_create_video_table_test.sqlite';

			var sensorEvent = {
				timestamp: 123,
				value: 456,
				datatype: 'hello'
			};

			var options = {
				type:   'hello',
				start:  122,
				end:    124
			};

			var dbfile = 'tests/fixtures/videosFolder/sensor_dblite_create_video_table_test.sqlite';
			fse.deleteSync( dbfile );
			var db = new SensorDblite(dbfile, function() {
				db.insert( sensorEvent );
				console.log('insert?');
				setTimeout( function() {
					console.log('find?');
					db.find( options, function(err, data, offset) {
						assert.equal(data.t, setTimeout.timestamp);
						assert.equal(data.v, setTimeout.value);
						done();
					});
				},100);
			});
		});
	});
	
	var checkIfTableExists = function( db_file, table, cb ) {

		var query = "SELECT name FROM sqlite_master WHERE name='" + table + "'";
		
		dblite_driver(db_file).query(query, 
				['name'], 
				function(err, data) {
					if (!err && data.length > 0) cb( true );
					else cb( false );
				}
		);
	};


	var insertData = function( db, data, cb ) {

		var dblite;

		if (typeof db === 'string') {
			dblite = dblite_driver(db);
		} else {
			dblite = db;
		}

		var query = "INSERT INTO sensor_data(timestamp, value, datatype) VALUES(?, ?, ?)";

		dblite.query(query, 
				[data.timestamp, data.value, data.datatype],
				function(err, data) {
					if ( !err ) cb();
					else cb( err );
				}
		);
	};


	var getData = function(db, cb) {

		var dblite;

		if (typeof db === 'string') {
			dblite = dblite_driver(db);
		} else {
			dblite = db;
		}
		
		var query = 'SELECT timestamp, value, datatype FROM sensor_data';

		dblite.query(
			query, 
			['timestamp', 'value', 'datatype'], 
			function(err, data) {
				if (err){
				}
				if (!data || data.length === 0) {
					 cb( [] );
				} else {
					cb( data );
				}
			}
		);
	};

});


