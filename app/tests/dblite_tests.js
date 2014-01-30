var assert = require("assert");
var sinon = require("sinon");

var Dblite = require('../db_layers/dblite.js');
var dblite_driver = require('dblite');

var fs = require('fs');

describe('Dblite', function() {
	
	describe( 'constructor', function() {
		
		it( 'should create video table if not exists', function( done ) {
				
			var dbfile = 'tests/videosFolder/dblite_create_video_table_test.sqlite';
			var db = new Dblite(dbfile, function() {
				
				checkIfTableExists( dbfile, 'videos', function( exists ) {
					assert( exists );
					done();
				});
			})
		});
		
		it( 'should preserver table if already exists', function( done ) {

			var dbfile = 'tests/videosFolder/dblite_create_video_table_test.sqlite';
			
			var chunk = {
				start: '0',
				end: '100',
				file: 'a_file'
			};

			insertData( dbfile, chunk, function(err) {

				var db = new Dblite(dbfile, function() {

					getData( dbfile, function(data) {
						assert(data);
						assert(data.length === 1);
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
		
	});

	describe('searchVideosByInterval', function() {

		it( 'should not query db if start or end times are invalid', function( done ) {

			var dbfile = 'tests/videosFolder/dblite_create_video_table_test.sqlite';
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
							done();
						});
					});
				});
			});
		});


		it('should correctly return videos', function() {
			
			var dbfile = 'tests/videosFolder/dblite_create_video_table_test.sqlite';
			var db = new Dblite(dbfile, function() {

			});

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

	var query = "INSERT INTO videos(start, end, file) VALUES(?, ?, ?)";

	dblite.query(query, 
			[data.start, data.end, data.file],
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

	
	var query = 'SELECT file, start, end FROM videos';

    dblite.query(
        query, 
        ['file', 'start', 'end'], 
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
