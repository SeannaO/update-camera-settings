var createServer = require('../lib/server.js');
var request      = require('request');

//
describe('FFmpeg helper', function() {
//
	var fs = require('fs');
	var fse = require('fs-extra');
	var assert = require("assert");
	var sinon = require("sinon");

	var ffmpeg = require('../../helpers/ffmpeg.js');

	var testFunction;
	var server;

	before( function(done) {
		server = createServer( function(req, res) {
			if (testFunction) testFunction( req, res );
		});
		server.listen(8000);
		done();
	});

	after( function(done) {
		server.close();
		done();
	});
	
	describe('makeThumb', function() {
		it('should generate a jpg file and callback the filename when there is a video file', function(done) {
			var fileName = '09.58s_chunk';
			var file = __dirname + '/../fixtures/files/' + fileName + '.ts';
			var folder = __dirname + '/../fixtures/videosFolder';
			var expectedFile = folder + '/' + fileName + '.jpg';
			fse.deleteSync( expectedFile );
			ffmpeg.makeThumb( file, folder, '', function( out ) {
				fs.exists( expectedFile, function(exists) {
					assert.ok(exists);
					assert.equal( expectedFile, out );
					done();
				});
			});
		});

		it( 'should callback with error if there is no file', function(done) {
			var fileName = 'ghost';
			var file = __dirname + '/../fixtures/files/' + fileName + '.ts';
			var folder = __dirname + '/../fixtures/videosFolder';
			var expectedFile = folder + '/' + fileName + '.jpg';
			fse.deleteSync( expectedFile );
			ffmpeg.makeThumb( file, folder, '', function( out, error ) {
				assert.ok(error);
				done();
			});
			
		});
	});


	describe('calcDuration', function() {
		it('should accurately calculate a video duration', function(done) {
			var filename = '09.58s_chunk';
			var file = __dirname + '/../fixtures/files/' + filename + '.ts';
			ffmpeg.calcDuration( file, function( err, duration, input ) {
				assert.equal(duration, 9580);
				done();
			});
		});
	});


	describe('inMemoryStitch', function() {
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
				req.query = {
					begin:  begin,
					end:    end
				};
				req.params = {};
				req.params.id = camId;
				ffmpeg.inMemoryStitch([file], offset, req, res);
			};

			request(
				{
					url: 'http://localhost:8000/',
				},
				function(err, res, body) {
					var expectedContentHeader = 'attachment; filename=' + expectedFileName;
					var contentHeader = res.headers['content-disposition'];
					assert.equal( expectedContentHeader, contentHeader );

					var typeHeader = res.headers['content-type'];
					assert.equal( 'video/MP2T', typeHeader );
					
					done();
				}
			);
		});
	});



});
