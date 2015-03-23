var createServer = require('../lib/server.js');
var request      = require('request');

var ffmpeg = require('../../helpers/ffmpeg');

var dbUtil = require('../lib/db_util.js');
var dblite_create_video_table_test_2

var Dblite = require('../../db_layers/dblite.js');

//
describe('mp4 controller', function() {

	var fs = require('fs');
	var fse = require('fs-extra');
	var assert = require("assert");
	var sinon = require("sinon");

	var mp4 = require('../../controllers/mp4_controller.js');

	var testFunction;
	var server;

	var chunks = [
		{start: '0', end: '10', file: 'a' },
		{start: '10', end: '20', file: 'b' }
	];

	var db;
	var dbfile = 'tests/fixtures/videosFolder/mp4_controller_tests.dblite';

	before( function(done) {
		server = createServer( function(req, res) {
			if (testFunction) testFunction( req, res );
		});
		server.listen(8000);
		db = new Dblite(dbfile, function() {
			dbUtil.insertData(dbfile, chunks[0], function() {
				dbUtil.insertData(dbfile, chunks[1], function() {
					done();
				});
			});
		});
	});

	after( function(done) {
		server.close();
		db.close();
		done();
	});
	
	describe('takeSnapshot', function() {

		it('sould call db.searchVideoByTime with correct params', function(done) {
			var dbSpy = sinon.spy(db, 'searchVideoByTime');
			var req = {
				query: {
					time: 15
				}
			};

			var res = {};
			res.json = function() {
			};

			mp4.takeSnapshot( db, {_id: 'id'}, req, res, function() { 
				assert( dbSpy.calledOnce );
				done();
			});
		});
	});

	describe('inMemorySnapshot', function() {
		it('should respond with correct headers', function(done) {

			var filename = '09.58s_chunk';
			var file = __dirname + '/../fixtures/files/' + filename + '.ts';
			var offset = {
				begin:     0,
				duration:  0
			};

			var begin = 123;
			var end   = 456;
			var camId = 'camId';

			var expectedFileName = 'solinkVms_' + camId + '_' + begin + '_' + end + '.ts';

			testFunction = function(req, res) {
				mp4.inMemorySnapshot(file, offset, true, res, {}, function() {
				});
			};

			request(
				{
					url: 'http://localhost:8000/',
				},
				function(err, res, body) {
					var expectedContentHeader = 'attachment; filename=' + expectedFileName;
					var typeHeader = res.headers['content-type'];
					assert.equal( 'image/jpeg', typeHeader );
					
					done();
				}
			);
		});
	});

	describe('inMemoryMp4Video', function() {
		var cam = {
			_id: 'id'
		};

		it('should call searchVideosInterval with correct data', function(done) {
			
			var dbSpy = sinon.spy(db, 'searchVideosByInterval');
			mp4.inMemoryMp4Video( db, cam, 0, 25, {}, {} );
			assert(dbSpy.calledOnce);
			assert.equal( 0, dbSpy.getCall(0).args[0] );
			assert.equal( 25, dbSpy.getCall(0).args[1] );
			done();
		});
	});



});
