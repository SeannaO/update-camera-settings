var assert = require("assert");
var sinon = require("sinon");

var fs = require('fs');
var fse = require('fs-extra');

var Sensor = require('../../models/sensor_model.js');


describe('SensorModel', function() {
	
	var folder = 'tests/fixtures/videosFolder/';
	var sensor = new Sensor();

	describe('constructor', function() {
		it('should set cache and cacheInterval', function() {
			assert.ok(!!Sensor.cache);
			assert.ok(!!Sensor.checkCacheInterval);
		});
	});


	describe('checkCache', function() {
			
		it('should delete expired data and close corresponding db', function() {
			var closedCounter = 0;
			var fakeDb = {
				close: function( cb ) {
					closedCounter++;
					if (cb) cb();
				}
			};

			Sensor.cache['A'] = {
				should_delete: true,
				time: Date.now() - 100*60*1000,
				db: fakeDb
			};
			Sensor.cache['B'] = {
				should_delete: true,
				time: Date.now() - 50*60*1000,
				db: fakeDb
			};
			Sensor.cache['C'] = {
				should_delete: false,
				time: Date.now() + 500,
				db: fakeDb
			};
			Sensor.cache['D'] = {
				should_delete: false,
				time: Date.now() + 1500,
				db: fakeDb
			};

			assert.equal( Object.keys(Sensor.cache).length, 4);
			Sensor.checkCache();
			for( var i in Sensor.cache ) {
				assert.ok( !Sensor.cache[i].should_delete );
			}
			assert.equal( closedCounter, 2 );
		});
	});


	describe('isSameDay', function() {
		it('should correctly tell if timestamps belong to the same day', function() {
			assert.ok( 
				Sensor.isSameDay(
					new Date(1427115600000), 
					new Date(1427146918000) 
				) 
			);
			assert.ok( 
				!Sensor.isSameDay( 
					new Date(1426942800000), 
					new Date(1427029200000) 
				) 
			);
		});
	});


	describe('_aggregateShardedSensorData', function() {
		it('should callback with error if time period requested is superior to 2 days', function(done) {
			var oneDay = 1000*60*60*24;
			var options = {
				start: 1000,
				end: 1000 + 2*oneDay + 1
			}
			sensor._aggregateShardedSensorData( options, null, null, function( err ) {
				assert.ok(!!err);
				done();
			});
		});
	});


	describe('_getDbFile', function() {

		it('should add a new SensorDbLite object to the cache and return it in a callback', function(done) {
			var fileName = __dirname + '/../fixtures/videosFolder/random_sensor_db_file'+Math.random()+'.sqlite';
			Sensor._getDbFile( fileName, function(db) {
				assert.ok( fs.existsSync(fileName) );
				assert.ok( !!db );	
				done();
			});
		});

		it('should remove and close oldest database if cache length exceeds maxSize', function(done) {
			
			var filename = __dirname + '/../fixtures/videosFolder/random_sensor_db_file_'+Math.random()+'.sqlite';
			var closeCounter = 0;

			Sensor.maxSize = 5;
			Sensor.cache = {};
			for( var i = 0; i < Sensor.maxSize+1; i++) {
				Sensor.cache['db_' + i] = {
					time: i,
					db: {
						close: function( cb ) {
							closeCounter++;
							if (cb) cb();
						}
					}
				}
			}

			Sensor._getDbFile( filename, function(db) {
				assert.ok(!Sensor.cache['db_0']);
				assert.ok(!!Sensor.cache['db_1']);
				assert.equal(closeCounter, 1);
				done();
			});
		});

		it('should set current time if object is already in cache', function(done) {
			var fakeDb = {
				name: 'test',
				close: function( cb ) {
					if (cb) cb();
				}
			};
			Sensor.cache['db'] = {
				db: fakeDb
			};

			Sensor._getDbFile( 'db', function( db ) {
				assert.equal(db.name, 'test');
				assert.ok( Date.now() - Sensor.cache['db'].time < 100 );
				done();
			});
		});
	});
	
});
