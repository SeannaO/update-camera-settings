var assert = require("assert");
var sinon = require("sinon");

var Dblite = require('../db_layers/dblite.js');
var dblite_driver = require('dblite');

var dbUtil = require('./lib/db_util.js');

var fs = require('fs');

describe('Dblite', function() {
	
	describe( 'constructor', function() {
		
		it( 'should create video table if not exists', function( done ) {
				
			var dbfile = 'tests/fixtures/videosFolder/dblite_create_video_table_test.sqlite';
			var db = new Dblite(dbfile, function() {
				
				dbUtil.checkIfTableExists( dbfile, 'videos', function( exists ) {
					assert( exists );
					done();
				});
			})
		});
		
		it( 'should preserve table if already exists', function( done ) {

			var dbfile = 'tests/fixtures/videosFolder/dblite_create_video_table_test.sqlite';
			
			var chunk = {
				start: '0',
				end: '100',
				file: 'a_file'
			};

			dbUtil.insertData( dbfile, chunk, function(err) {

				var db = new Dblite(dbfile, function() {

					dbUtil.getData( dbfile, function(data) {
						assert(data);
						assert(data.length > 0);
						assert.equal( data[0].end, chunk.end );
						assert.equal( data[0].start, chunk.start );
						assert.equal( data[0].file, chunk.file );
						done();
					});

				});

			});

		});
	});
	// end of constructor tests
	//
	
	describe('deleteVideo', function() {
	
	});

	describe('insertVideo', function() {

		it('should not insert invalid data', function(done) {
			var dbfile = 'tests/fixtures/videosFolder/dblite_create_video_table_test_'+Math.random()+'.sqlite';
			var db = new Dblite(dbfile, function() {
				var called = false
				db.db.query = function() {
						called = true;
					};
				db.insertVideo();
				db.insertVideo({});
				db.insertVideo({start: 0, end: 1});
				assert.ok(!called);
				db.close();
				done();
			});
		});
		
	});

	describe('searchVideosByInterval', function() {

		it( 'should not query db if start or end times are invalid', function( done ) {

			var dbfile = 'tests/fixtures/videosFolder/dblite_create_video_table_test.sqlite';
			var db = new Dblite(dbfile, function() {
				
				sinon.spy(db.db, 'query');

				var start, 
					end;
				
				db.searchVideosByInterval( start, end, function() {

					assert( !db.db.query.called );
					
					start = 0;

					db.searchVideosByInterval( start, end, function() {
						
						assert( !db.db.query.called );

						start = end;
						end = 0;

						db.searchVideosByInterval( start, end, function() {
					
							assert( !db.db.query.called );
							db.close();
							done();
						});
					});
				});
			});
			
			it( 'should correctly return videos by interval', function() {
				var dbfile = 'tests/fixtures/videosFolder/dblite_create_video_table_test.sqlite';
				var db = new Dblite(dbfile, function() {
					db.close();	
				});
			});


		});


		it('should correctly return videos', function( done ) {
			
			var dbfile = 'tests/fixtures/videosFolder/dblite_create_video_table_test_2.sqlite';
			var db = new Dblite(dbfile, function() {

				var data = [
					{start: '0', end: '10', file: 'a' },
					{start: '10', end: '20', file: 'b' },
					{start: '20', end: '30', file: 'c' },
					{start: '30', end: '40', file: 'd' }
				]

				dbUtil.insertData(dbfile, data[0], function() {
					dbUtil.insertData(dbfile, data[1], function() {
						dbUtil.insertData(dbfile, data[2], function() {
							dbUtil.insertData(dbfile, data[3], function() {
								db.db.emit('ready');
							});
						});
					});
				});

				db.db.on('ready', function() {
					db.searchVideosByInterval( 0, 40, function(err, returned_data, offset) {

						for(var i in returned_data) {
							assert.equal( data[i].file, returned_data[i].file );
						}
						db.close();
						done();
						
					});
				});
			});

		});
	});


	describe('sortByStartTime', function() {

		var dbfile = 'tests/fixtures/videosFolder/dblite_create_video_table_test_'+Math.random()+'.sqlite';
		var db;

		before( function(done) {
			db = new Dblite(dbfile, function() {
				done();
			});
		});

		after( function() {
			db.close();
		});

		var a = {
			start: 10
		};

		var b = {
			start: 20
		};

		var c = {
			start: a.start
		};

		it('asc should sort by time in ascending order', function() {
			assert.equal( db.sortByStartTimeAsc(a, b), -1 );
			assert.equal( db.sortByStartTimeAsc(b, a), 1 );
			assert.equal( db.sortByStartTimeAsc(a, c), 0 );
		});

		it('desc should sort by time in descending order', function() {
			assert.equal( db.sortByStartTimeDesc(a, b), 1 );
			assert.equal( db.sortByStartTimeDesc(b, a), -1 );
			assert.equal( db.sortByStartTimeDesc(a, c), 0 );
		});
	});

});



function isEqObjects(obj1, obj2) {

	if ( Object.keys(obj1).length  !== Object.keys(obj2).length ) return false;

	for( var i in obj1 ) {
		if ( !obj2[i] ) return false;
	}
}

function inArray(array, el) {
  for ( var i = array.length; i--; ) {
    if ( array[i] === el ) return true;
  }
  return false;
}

function isEqArrays(arr1, arr2) {
  if ( arr1.length !== arr2.length ) {
    return false;
  }
  for ( var i = arr1.length; i--; ) {
    if ( !inArray( arr2, arr1[i] ) ) {
      return false;
    }
  }
  return true;
}
