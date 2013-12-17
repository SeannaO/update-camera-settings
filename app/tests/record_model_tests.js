var assert = require("assert");
var sinon = require("sinon");

var RecordModel = require('../models/record_model.js');
var fs = require('fs');
var path = require('path');


describe('RecordModel', function() {
/*
	var cam = {
		_id: "another_camera",
		name: "a name",
		ip: "127.0.0.1",
		rtsp: "rtsp://hello.world",
		db: {
			insertVideo: function(v) {}
		},
		addChunk: function() {}
	};
	
	var videosFolder =  "tests/videosFolder";
	cam.videosFolder = videosFolder + '/' + cam._id;

	var recordModel = new RecordModel( cam );

	describe('new', function() {
		
		it('should correctly setup attributes passed by camera', function() {
			
			assert.equal(recordModel.rtsp, cam.rtsp);
			assert.equal(recordModel.db, cam.db);
			assert.equal(recordModel.camId, cam._id);
		});

		it('should create new watcher', function() {

			assert( recordModel.watcher );
			assert.equal( typeof recordModel.watcher, 'object' );
		});

		it('should initialize attributes', function() {
			
			assert.equal(recordModel.lastChunkTime, 0);
			assert.equal(recordModel.lastErrorTime, 0);
			assert.equal( typeof recordModel.pending, 'object');
			assert.equal( recordModel.pending.length, 0);
		});
	});

	
	describe('setupFolders', function() {
		
		var folders = [
			cam.videosFolder + '/tmp',
			cam.videosFolder + '/videos/tmp',		
			cam.videosFolder + '/videos',
			cam.videosFolder + '/thumbs',
			cam.videosFolder		
		];
		
		it('should correctly initialize folder variable', function() {

			assert.equal(recordModel.folder, cam.videosFolder);
		});

		it('should initialize folders', function() {
			
			for (var f in folders) {
				assert( fs.existsSync(folders[f]) );
			}
		});
	});


	describe('add new videos to pending list', function() {

		it ('should push filenames with correct folder to pending array', function() {
			
			var files = ['a_file.avi', 'another_file.format', 'a_third_file'];
			
			recordModel.pending = [];
			recordModel.addNewVideosToPendingList( files );
			
			assert.equal( recordModel.pending.length, files.length);

			for (var f in files) {
				var file = recordModel.folder + '/videos/tmp/' + files[f];
				assert( recordModel.pending.indexOf( file ) > -1 );
			}
		});
	});


	describe('move file', function() {

		it('should move file in tmp folder to correct destination', function(done) {
			
			var video = {file: 'fake_file'};
			
			var from = recordModel.folder + "/videos/tmp/" + path.basename( video.file );
			var to =  recordModel.folder + "/videos/" + video.start + path.extname( video.file );

			fs.openSync(from, 'w');
			recordModel.moveFile( video, function(err) {
				assert( fs.existsSync(to) );
				assert( !fs.exists(from) );
				done();
			});			
		});

		it('should call camera.addChunk passing destination file', function(done) {
			
			var video = {file: 'fake_file'};
			
			var from = recordModel.folder + "/videos/tmp/" + path.basename( video.file );
			var to =  recordModel.folder + "/videos/" + video.start + path.extname( video.file );
	
			sinon.spy( recordModel.camera, "addChunk" );

			fs.openSync(from, 'w');
			recordModel.moveFile( video, function(err) {
				assert( recordModel.camera.addChunk.calledOnce );
				//assert.equals( recordModel.db.insertVideo.getCall(0).args[0].file, to );
				recordModel.camera.addChunk.restore();
				done();
			});			
		});
	});
*/
});
