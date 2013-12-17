var assert = require("assert");
var sinon = require("sinon");

var fs = require('fs');

var Camera = require('../models/camera_model.js');

var cam_with_streams = {
	_id: "abc",
	name: "a name",
	ip: "127.0.0.1",
	manufacturer: 'a_manufacturer',
	user: 'a_user',
	password: 'a_password',
	streams: {
		stream_1 : {
			id: 'stream_1',
			resolution: '640x480',
			framerate: '10',
			quality: '5'
		}, 
		stream_2 : {
			id: 'stream_2',
			resolution: '1280x960',
			framerate:	'20',
			quality:	'30'
		}
	}
};

var cam_without_streams = {
	_id: "abc",
	name: "a name",
	ip: "127.0.0.1",
	manufacturer: 'a_manufacturer',
	user: 'a_user',
	password: 'a_password',
};


var videosFolder = "tests/videosFolder"; 


describe('Camera', function(){

	describe('new', function() {

		it('should create a folder for each stream', function() {
			
			var new_cam = new Camera( cam_with_streams, videosFolder );
			for (var stream_id in cam_with_streams.streams) {
				console.log(stream_id);
				fs.exists(videosFolder+"/"+cam_with_streams._id+"/"+ stream_id, function(exists) {
					assert.ok(exists);
				});
			}
		});

		it('should setup a new recordModel for each stream', function() {

			var new_cam = new Camera( cam_with_streams, videosFolder );

			for (var stream_id in cam_with_streams.streams) {
				assert( new_cam.streams[stream_id].recordModel );
				assert( typeof new_cam.streams[stream_id].recordModel === 'object' );
			}
		});

		it('should create a new camera with correct params', function(){

			var cameras = [cam_with_streams, cam_without_streams];
			
			for (var cam in cameras) {
				var new_cam = new Camera( cam, videosFolder );
				assert.equal( new_cam._id, cam._id );
				assert.equal( new_cam.name, cam.name );
				assert.equal( new_cam.ip, cam.ip );
				assert.equal( new_cam.rtsp, cam.rtsp );
				assert.equal( new_cam.username, cam.username );
				assert.equal( new_cam.password, cam.password );
				assert.equal( new_cam.manufacturer, cam.manufacturer );
			}
		});
	});


	describe('start recording', function() {

		it('should call recordModel.startRecording on all streams if not already recording', function() {
			var new_cam = new Camera( cam_with_streams, videosFolder );
			
			for (var i in new_cam.streams ) {
				sinon.spy(new_cam.streams[i].recordModel, "startRecording");
			}

			new_cam.startRecording();
			
			for (var i in new_cam.streams ) {
				assert(new_cam.streams[i].recordModel.startRecording.calledOnce);
			}
		});

		it('should NOT call recordModel.startRecording again on a stream that is already recording', function() {
			var new_cam = new Camera( cam_with_streams, videosFolder );

			for (var i in new_cam.streams ) {
				sinon.spy(new_cam.streams[i].recordModel, "startRecording");
			}

			new_cam.startRecording();
			new_cam.startRecording();

			for (var i in new_cam.streams ) {
				assert(new_cam.streams[i].recordModel.startRecording.calledOnce);
			}
		});
	});


	describe('stop recording', function() {

		it('should call recordModel.stopRecording on all streams if still recording', function() {
			var new_cam = new Camera( cam_with_streams, videosFolder );

			new_cam.startRecording();

			for (var i in new_cam.streams ) {
				sinon.spy(new_cam.streams[i].recordModel, "stopRecording");
			}

			new_cam.stopRecording();
			
			for (var i in new_cam.streams ) {
				assert(new_cam.streams[i].recordModel.stopRecording.calledOnce);
			}
		});

		it('should NOT call recordModel.stopRecording again on a stream that is already stopped', function() {
			var new_cam = new Camera( cam_with_streams, videosFolder );

			new_cam.startRecording();

			for (var i in new_cam.streams ) {
				sinon.spy(new_cam.streams[i].recordModel, "stopRecording");
			}

			new_cam.stopRecording();
			new_cam.stopRecording();

			for (var i in new_cam.streams ) {
				assert(new_cam.streams[i].recordModel.stopRecording.calledOnce);
			}
		});
	});
	

	describe('index pending files', function() {

		it('should call recordModel.indexPendingFiles on each stream', function() {

			var new_cam = new Camera( cam_with_streams, videosFolder );

			for (var i in new_cam.streams ) {
				sinon.spy( new_cam.streams[i].recordModel, "indexPendingFiles" );
			}

			new_cam.indexPendingFiles();

			for (var i in new_cam.streams ) {
				assert( new_cam.streams[i].recordModel.indexPendingFiles.calledOnce );
			}
		});
		
	});

	
	describe('addChunk', function() {
		
		var new_cam = new Camera( cam_with_streams, videosFolder );

		it('should call db.insertVideo with correct param on corresponding stream', function() {

			for (var i in new_cam.streams) {
				sinon.spy( new_cam.streams[i].db, 'insertVideo' );
			}
			
			for (var stream_id in new_cam.streams) {

				var chunk = {
					start: 1,
					end: 10,
					file: 'chunk_file'
				};

				new_cam.addChunk( stream_id, chunk );
				
				assert( new_cam.streams[stream_id].db.insertVideo.calledOnce );
			
				for (var d in chunk) {
					assert.equal(new_cam.streams[stream_id].db.insertVideo.getCall(0).args[0][d], chunk[d]);
				}
			}
		});
	});

	
	describe('deleteChunk', function() {
		/*
		var fake_chunk = {id: 1, file: "fake_file"};

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
		*/
	});


	describe('getOldestChunks', function() {

		/*
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
		*/
	});


	describe('listeners', function() {
	/*
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
		*/

	});

});
