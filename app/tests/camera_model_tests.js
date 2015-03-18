var assert = require("assert");
var sinon = require("sinon");

var fs = require('fs');

var Camera = require('../models/camera_model.js');

var cam_with_streams = {
	_id          : "abc",
	name         : "a name",
	ip           : "127.0.0.1",
	manufacturer : 'a_manufacturer',
	user         : 'a_user',
	password     : 'a_password',
	streams: {
		stream_1 : {
			id         : 'stream_1',
			resolution : '640x480',
			framerate  : '10',
			quality    : '5'
		}, 
		stream_2 : {
			id         : 'stream_2',
			resolution : '1280x960',
			framerate  : '20',
			quality    : '30'
		}
	}
};

var cam_without_streams = {
	_id          : "abc",
	name         : "a name",
	ip           : "127.0.0.1",
	manufacturer : 'a_manufacturer',
	user         : 'a_user',
	password     : 'a_password',
};


var videosFolder = "tests/videosFolder"; 

describe('Camera', function(){

	describe('constructor', function() {

		it('should create a folder for each stream', function( done ) {

			cam_with_streams._id = 'constructor_test_1_' + Math.random();			

			new Camera( cam_with_streams, videosFolder , function(new_cam){

				for (var stream_id in cam_with_streams.streams) {
					var exists = fs.existsSync( videosFolder+"/"+cam_with_streams._id+"/"+ stream_id );
					assert.ok(exists);
				}
				done();
			});
		});

		it('should setup a new recordModel for each stream', function( done ) {

			cam_with_streams._id = 'constructor_test_2_' + Math.random();		
			new Camera( cam_with_streams, videosFolder, function(new_cam){
				for (var stream_id in cam_with_streams.streams) {

					var recordModel = new_cam.streams[stream_id].recordModel;

					assert.ok(!!recordModel);
				}
				done();
			});
		});

		it('should create a new camera with correct params', function(done){

			var cameras = [cam_with_streams, cam_without_streams];

			for (var cam in cameras) {
				var new_cam = new Camera( cam, videosFolder);
				assert.equal( new_cam._id          , cam._id );
				assert.equal( new_cam.name         , cam.name );
				assert.equal( new_cam.ip           , cam.ip );
				assert.equal( new_cam.rtsp         , cam.rtsp );
				assert.equal( new_cam.username     , cam.user || '' );
				assert.equal( new_cam.password     , cam.password || '' );
				assert.equal( new_cam.manufacturer , cam.manufacturer );
			}
			done();
		});
	});

	describe('start recording', function() {

		it('should call recordModel.startRecording on all streams if not already recording', function(done) {

			cam_with_streams._id = 'startRecording_test_1_' + Math.random();			
			new Camera( cam_with_streams, videosFolder, function(new_cam){
				var recordingSpies = [];
				for (var stream_id in new_cam.streams){
					recordingSpies.push(sinon.spy(new_cam.streams[stream_id].recordModel, "startRecording"));
				}

				new_cam.startRecording();

				for (var spy_id in recordingSpies){
					assert(recordingSpies[spy_id].calledOnce);	
				}
				done();
			});
		});

		it('should NOT call recordModel.startRecording again on a stream that is already recording', function(done) {

			cam_with_streams._id = 'startRecording_test_2_' + Math.random();			
			new Camera( cam_with_streams, videosFolder, function(new_cam){
				var recordingSpies = [];
				for (var stream_id in new_cam.streams){
					recordingSpies.push(sinon.spy(new_cam.streams[stream_id].recordModel, "startRecording"));
				}

				new_cam.startRecording();
				new_cam.startRecording();

				for (var spy_id in recordingSpies){
					assert(recordingSpies[spy_id].calledOnce);	
				}
				done();
			});
		});
	});

	describe('stop recording', function() {

		it('should call recordModel.stopRecording on all streams if still recording', function(done) {

			cam_with_streams._id = 'stopRecording_test_1_' + Math.random();			
			new Camera( cam_with_streams, videosFolder, function(new_cam){
				new_cam.startRecording();
				var recordingSpies = [];
				for (var stream_id in new_cam.streams){
					recordingSpies.push(sinon.spy(new_cam.streams[stream_id].recordModel, "stopRecording"));
				}

				new_cam.stopRecording();

				for (var spy_id in recordingSpies){
					assert(recordingSpies[spy_id].calledOnce);
					recordingSpies[spy_id].restore();
				}
				done();
			});
		});
	});

	describe('addChunk', function() {

		cam_with_streams._id = 'addChunk_test';
		var new_cam = new Camera( cam_with_streams, videosFolder );

		it('should call db.insertVideo with correct param on corresponding stream', function() {

			for (var i in new_cam.streams) {
				sinon.spy( new_cam.streams[i].db, 'insertVideo' );
			}

			for (var stream_id in new_cam.streams) {

				var chunk = {
					start : 1,
					end   : 10,
					file  : 'chunk_file'
				};

				new_cam.addChunk( stream_id, chunk );

				assert( new_cam.streams[stream_id].db.insertVideo.calledOnce );

				for (var d in chunk) {
					assert.equal(new_cam.streams[stream_id].db.insertVideo.getCall(0).args[0][d], chunk[d]);
				}

				new_cam.streams[stream_id].db.insertVideo.restore();
			}
		});

		it('should call db.insertVideo with correct param on corresponding stream', function() {

		});
	});

	describe('deleteChunk', function() {

		var fake_chunk = {id: 1, file: "fake_file"};

		cam_with_streams._id = 'camera_test_deleteChunk_'+Math.random();
		var new_cam = new Camera( cam_with_streams, videosFolder );

		it('should call db.deleteVideo on corresponding stream', function() {

			for (var stream_id in new_cam.streams) {
				sinon.spy( new_cam.streams[stream_id].db, "deleteVideo" );
				new_cam.deleteChunk(stream_id, fake_chunk, function() {
				});
				assert( new_cam.streams[stream_id].db.deleteVideo.calledOnce );	
				new_cam.streams[stream_id].db.deleteVideo.restore();
			}

		});

	});

	describe('getOldestChunks', function() {

		cam_with_streams.id = cam_with_streams._id = 'camera_test_getOldestChunks_'+Math.random();
		var another_cam = new Camera( cam_with_streams, videosFolder );
		var numChunks = 5;

		var nStreams = Object.keys(another_cam.streams).length;
		var chunks = [];
		var oldestChunks = [];

		before( function() {

			// adding some chunks on each stream
			for (var stream_id in another_cam.streams) {
				for (var k = 1; k <= 10; k++) {
					var chunk = {
						start: k*10,
						end: (k+1)*10,
						file: 'chunk_file_'+k,
						stream_id: stream_id	// this param is being used only for this test
					};
					chunks.push( chunk );
					if (k <= numChunks) oldestChunks.push( chunk );
					another_cam.addChunk( stream_id, chunk );
				}
			}
		});


		it('should return a maximum of numChunks * numStreams via callback', function(done) {
			another_cam.getOldestChunks( numChunks, function(data) {
				assert( data.length <= numChunks * 2 );
				done();
			});
		});


		it('should return the oldest chunks from the camera', function(done) {

			chunks = chunks.sort( function(a,b) {
				return a.start - b.start;
			});

			another_cam.getOldestChunks( numChunks, function(data) {
				for (var i in data) {
					assert(data[i].start == oldestChunks[i].start);
				}
				done();
			});

		});
	});

	describe('#restoreBackupAndReindex', function(){
		it ("indexes from scratch when an empty error is returned", function(done){
			cam_with_streams._id = 'constructor_test_1_' + Math.random();
			// Camera.__set__('fs', fsStubUnlink);

			new Camera( cam_with_streams, videosFolder, function(new_cam){
				var stream = new_cam.streams['stream_1'];
				var callback = sinon.stub(stream.db.backup, "restore").yields("empty", null);
				var reIndexStub = sinon.stub(new_cam, "reIndexDatabaseFromFileStructure", function(stream, storedVideosFolder, cb){if (cb) cb();})
				// var spy = sinon.spy(new_cam, "reIndexDatabaseFromFileStructure");
				new_cam.restoreBackupAndReindex(stream, function(){
					assert(reIndexStub.calledOnce);
					// spy.restore();
					reIndexStub.restore();
					done();
				});

			});
		});

		it ("successfully restores the backup and reindexes the remaining file", function(done){
			cam_with_streams._id = 'constructor_test_1_' + Math.random();			
			new Camera( cam_with_streams, videosFolder, function(new_cam){
				var stream = new_cam.streams['stream_1'];
				var backup = { name: "backup_file", time: 1385142591573 }
				var restoreStub = sinon.stub(stream.db.backup, "restore").yields(null, backup);
				var indexItem = {file: "", end: 1385142591573};			
				var getNewestChunksStub = sinon.stub(stream.db, "getNewestChunks").yields([indexItem]);
				var reIndexStub = sinon.stub(new_cam, "reIndexDatabaseFromFileStructureAfterTimestamp", function(stream, storedVideosFolder, indexItem, cb){if (cb) cb();});

				new_cam.restoreBackupAndReindex(stream, function(){
					assert(reIndexStub.calledOnce);
					reIndexStub.restore();
					done();
				});

			});
		});
	});

});


