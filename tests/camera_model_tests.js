var assert = require("assert");
var sinon = require("sinon");

var fs = require('fs');

var Camera = require('../models/camera_model.js');

var cam = {
	_id: "abc",
	name: "a name",
	ip: "127.0.0.1",
	rtsp: "rtsp://hello.world"
};

var videosFolder = "tests/videosFolder"; 

describe('Camera', function(){

	describe('new', function() {

		it('should create a folder for the videos', function() {
			var new_cam = new Camera( cam, videosFolder );
			fs.exists(videosFolder+"/"+cam._id, function(exists) {
				assert.ok(exists);
			});
		});

		it('should setup a new recordModel', function() {
			var new_cam = new Camera( cam, videosFolder );
			assert( new_cam.recordModel );
			assert( typeof new_cam.recordModel === 'object' );
		});

		it('should create a new camera with correct params', function(){
			var new_cam = new Camera( cam, videosFolder );
			assert.equal( new_cam._id, cam._id );
			assert.equal( new_cam.name, cam.name );
			assert.equal( new_cam.ip, cam.ip );
			assert.equal( new_cam.rtsp, cam.rtsp );
		});
	});

	describe('start recording', function() {

		it('should call recordModel.startRecording if not already recording', function() {
			var new_cam = new Camera( cam, videosFolder );
			sinon.spy(new_cam.recordModel, "startRecording");
			new_cam.startRecording();
			assert(new_cam.recordModel.startRecording.calledOnce);
		});
		it('should NOT call recordModel.startRecording again if already recording', function() {
			var new_cam = new Camera( cam, videosFolder );
			sinon.spy(new_cam.recordModel, "startRecording");
			new_cam.startRecording();
			new_cam.startRecording();
			assert(new_cam.recordModel.startRecording.calledOnce);
		});
	});

	describe('stop recording', function() {
		
		var new_cam = new Camera( cam, videosFolder );

		it('should call recordModel.stopRecording if recording', function() {
			sinon.spy(new_cam.recordModel, "stopRecording");
			new_cam.startRecording();
			new_cam.stopRecording();
			assert(new_cam.recordModel.stopRecording.calledOnce);
			new_cam.recordModel.stopRecording.restore();
		});

		it('should NOT call recordModel.startRecording again if already recording', function() {
			sinon.spy(new_cam.recordModel, "stopRecording");
			new_cam.startRecording();
			new_cam.stopRecording();
			new_cam.stopRecording();
			assert(new_cam.recordModel.stopRecording.calledOnce);
			new_cam.recordModel.stopRecording.restore();
		});
	});
	

	describe('indexing', function() {

		it('should call recordModel.indexPendingFiles', function() {
			var new_cam = new Camera( cam, videosFolder );
			sinon.spy( new_cam.recordModel, "indexPendingFiles" );
			new_cam.indexPendingFiles();
			assert( new_cam.recordModel.indexPendingFiles.calledOnce );
		});
	});

	
	describe('addChunk', function() {
		
		var new_cam = new Camera( cam, videosFolder );

		it('should call db.insertVideo with correct param', function() {
			sinon.spy( new_cam.db, 'insertVideo' );
			var chunk = {
				cam: 'id',
				start: 0,
				end: 10,
				file: 'chunk_file'
			};
			new_cam.addChunk( chunk );
			assert(new_cam.db.insertVideo.calledOnce);
			
			for (var d in chunk) {
				console.log(chunk[d]);
				assert.equal(new_cam.db.insertVideo.getCall(0).args[0][d], chunk[d]);
			}
		});
	});

	
	describe('deleteChunk', function() {
		
		var fake_chunk = {id: 1};

		it('should call db.deleteVideo', function() {
			var new_cam = new Camera( cam, videosFolder );
			sinon.spy( new_cam.db, "deleteVideo" );
			new_cam.deleteChunk(fake_chunk, function() {
			});
			assert( new_cam.db.deleteVideo.calledOnce );
			new_cam.db.deleteVideo.restore();
		});

		it('should callback deleted chunk', function( done ) {
			var new_cam = new Camera( cam, videosFolder );
			new_cam.deleteChunk(fake_chunk, function( chunk, err ) {
				console.log("###### " + chunk.id);
				assert.equal( chunk.id, fake_chunk.id );
				done();
			});
		});
	});


	describe('getOldestChunks', function() {

		var new_cam = new Camera( cam, videosFolder );
		var numChunks = 10;
		
		it('should call db.getOldestChunks with correct params', function() {
			sinon.spy( new_cam.db, "getOldestChunks" );
			new_cam.getOldestChunks( numChunks, function(){} );
			assert(new_cam.db.getOldestChunks.calledOnce);
			assert.equal(numChunks, new_cam.db.getOldestChunks.getCall(0).args[0]);
			new_cam.db.getOldestChunks.restore();
		});

		it('should callback data', function(done) {
			new_cam.getOldestChunks( numChunks, function(data) {
				done();
			});
		});
	});


	describe('listeners', function() {

		var new_cam = new Camera( cam, videosFolder );

		it('sould emit new_chunk with correct data on recordModel new_chunk event', function(done) {
			this.timeout(500);
			var fake_data = 'just a fake data';
			new_cam.on('new_chunk', function( data ) {
				assert.equal(data, fake_data);
				done();
			});			
			new_cam.recordModel.emit('new_chunk', fake_data);
		});

		it('sould emit camera_status with correct status and id on recordModel camera_status event', function(done) {
			this.timeout(500);
			var fake_data = { status: 'fake_status' };
			new_cam.on('camera_status', function( data ) {
				assert.equal( data.cam_id, new_cam._id );
				assert.equal( data.status, fake_data.status );
				done();
			});			
			new_cam.recordModel.emit('camera_status', fake_data);
		});

	});

});
