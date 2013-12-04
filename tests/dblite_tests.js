var assert = require("assert");
var sinon = require("sinon");

var Dblite = require('../db_layers/dblite.js');
var fs = require('fs');

describe('Dblite', function() {

	describe('new', function() {
		
		it('should create video table if not exists', function() {
			// todo
		});
	});


	describe('insert', function() {
		
		var emptyDb = 'tests/db/another_empty_db.sqlite';
		if ( fs.existsSync( emptyDb ) ) {
			fs.unlink( emptyDb );
		}
		
		var dblite = new Dblite(emptyDb);

		it('should add new chunk to videos table', function(done) {
			
			var chunk = {
				start: 0,
				end: 10,
				file: "a file"
			};
			dblite.insertVideo( chunk );
			dblite.db.query('select start, end, file from videos where start = ? and end = ? and file = ?',
				[chunk.start, chunk.end, chunk.file],
				['start', 'end', 'file'],
				function( err, data ) {
					assert.equal( data.length, 1 );
					assert.equal(data[0].start, chunk.start);
					assert.equal(data[0].end, chunk.end);
					assert.equal(data[0].file, chunk.file);
					done();
				}
			);
		});
	});


	describe('delete', function() {

		it('should remove video with specified id', function( done ) {
			
			var emptyDb = 'tests/db/yet_another_empty_db.sqlite';
	
			var chunk = {
				start: 0,
				end: 10,
				file: "a file"
			};
			
			var dblite = new Dblite(emptyDb);
			dblite.insertVideo( chunk );
			dblite.db.query('select id from videos where start = ? and end = ? and file = ?',
				[chunk.start, chunk.end, chunk.file],
				['id'],
				function( err, data ) {

					var id = data[0].id;
					dblite.deleteVideo ( id, function() {

						dblite.db.query('select * from videos', 
							['id'], 
							function( err, data ) {
								assert.equal( data.length, 0 );
								done();
							}
						);
					});
				}	
			);			
		});
	});
});
