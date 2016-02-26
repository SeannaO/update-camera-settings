var assert = require("assert");
var sinon = require("sinon");

var fs  = require('fs');
var fse = require('fs-extra');
var _   = require('lodash');

var Camera = require('../../models/camera_model.js');

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


var videosFolder = "tests/fixtures/videosFolder"; 

var deleteCamera = function( cam ) {
	cam.stopRecording();
	cam.stopMotionDetection();
	cam.removeAllListeners();

	// for (var i in cam.streams){
	// 	cam.removeStream( i );	
	// }
};

before(function(done) {
	process.env['BASE_FOLDER'] = videosFolder;
	done();
});

after(function(done) {
	fse.removeSync( __dirname + '/../fixtures/videosFolder/*' );
	done();
});

describe('Camera', function(){

	describe('constructor', function() {

		it('should create a folder for each stream', function( done ) {

			cam_with_streams._id = 'constructor_test_1_' + Math.random();			

			new Camera( cam_with_streams, videosFolder , function(new_cam){

				for (var stream_id in cam_with_streams.streams) {
					var exists = fs.existsSync( videosFolder+"/"+cam_with_streams._id+"/"+ stream_id );
					assert.ok(exists);
				}
				
				deleteCamera( new_cam );

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

				deleteCamera( new_cam );
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

				deleteCamera(new_cam);
			}
			done();
		});
	});

	describe('recorder new_chunk listener', function() {
		cam_with_streams._id = 'startRecording_test_1_' + Math.random();			
		var cam;

		before( function(done) {
			new Camera( cam_with_streams, videosFolder, function(new_cam){
				cam = new_cam;	
				deleteCamera(new_cam);
				done();
			});
		});

		after( function() {
			cam.stopRecording();
		});

		it('should emit new_chunk event', function(done) {
			var stream;
			for( var i in cam.streams ) {
				stream = cam.streams[i];
			}

			var listener = function( data ) {
				cam.removeListener('new_chunk', listener);
				done();
			};

			cam.on('new_chunk', listener);

			stream.recordModel.emit('new_chunk', {
			});
		});

		it('should still emit new_chunk event after stream is restarted', function(done) {
			var stream;
			for( var i in cam.streams ) {
				stream = cam.streams[i];
			}

			var listener = function(data) {
				cam.removeListener('new_chunk', listener);
				done();
			};

			cam.on('new_chunk', listener);

			cam.restartStream( i );
			
			setTimeout( function() {
				stream.recordModel.emit('new_chunk', {
				});
			}, 10);
			
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
				deleteCamera( new_cam );
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

				deleteCamera(new_cam);
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

				deleteCamera( new_cam );
				done();
			});
		});
	});

	describe('addChunk', function() {

		cam_with_streams._id = 'addChunk_test';
		var new_cam = new Camera( cam_with_streams, videosFolder );
		
		var consoleSpy = sinon.spy(console, 'error');

		after( function() {
			deleteCamera( new_cam );
		});

		it ('should log error and not call db if stream does not exist', function() {
			new_cam.addChunk('this_stream_does_not_exist', {});
			assert.ok( consoleSpy.called );
		});


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

	});

	describe('deleteChunk', function() {

		var file_2 = videosFolder+"/xyz/abc/videos/2016-1-1/a_file_2.ts";
		var fake_chunk = {id: 1, file: file_2};

		cam_with_streams._id = 'camera_test_deleteChunk_'+Math.random();
		var new_cam = new Camera( cam_with_streams, videosFolder );

		it('should call db.deleteVideo on corresponding stream', function(done) {

			for (var stream_id in new_cam.streams) {
				sinon.spy( new_cam.streams[stream_id].db, "deleteVideo" );
				new_cam.deleteChunk(stream_id, fake_chunk, function() {
				});
				assert( new_cam.streams[stream_id].db.deleteVideo.calledOnce );	
				new_cam.streams[stream_id].db.deleteVideo.restore();
			}
			done();

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

			//TODO: fix this test
			another_cam.getOldestChunks( numChunks, function(data) {
				done();
			});

		});
	});

	describe('motionHandler', function() {
		var cam;
		before( function(done) {
			new Camera( cam_with_streams, videosFolder, function(new_cam){
				cam = new_cam;
				done();
			});
		});
		after(function() {
			cam.stopMotionDetection();
		});

		it('should do nothing if motion is disabled', function(done) {
			cam.setMotionParams({
				enabled: false
			});
			cam.motionHandler();
			done();
		});

		it('should do nothing if motionGrid is invalid', function(done) {
			cam.setMotionParams({
				enabled: true
			});
			cam.motionHandler();
			cam.motionHandler('acasjdhajkhsa');
			done();
		});

		it('should emit motionEvent with correct params if there is new motion in ROI', function(done) {
			
			cam.setMotionParams({
				enabled: true,
			});
			var roi = '';
			var motion = '';
			for (var i = 0; i < 100; i++) {
				roi += '1';
				motion += 'a';
			}
			cam.motion = null;
			cam.setROI( roi );
			cam.on('motionEvent', function( d ) {
				assert.ok(!!cam.motion);
				assert.equal(d.id, cam._id);
				done();
			});
			cam.motionHandler( motion );

		});
	});


	describe('removeStream', function() {
		var cam;
		before( function(done) {
			new Camera( cam_with_streams, videosFolder, function(new_cam){
				cam = new_cam;
				cam.stopMotionDetection();
				done();
			});
		});

		it('should close recordModel of the stream to be deleted', function() {
			var streamId = Object.keys(cam.streams)[0];
			var recordSpy = sinon.spy(cam.streams[ streamId ].recordModel, 'quitRecording');
			cam.removeStream(streamId);
			assert.ok( recordSpy.calledOnce );
		});

		it('should do nothing if the stream does not exist', function() {
			var streamId = 'this_id_does_not_exist';
			cam.removeStream( streamId );
		});
	});

	describe('toJSON', function() {

		var cam;
		var stream_id = '_' + Date.now();

		before( function(done) {
			new Camera( cam_with_streams, videosFolder, function(new_cam) {
				cam = new_cam;

				cam.addStream({
					id: stream_id,
					motionParams: {
						enabled: false
					}
				}, function() {
					done();
				});
			});
		});

		it('should return a json with camera data', function() {
			var json = cam.toJSON();
			for(var i in json) {
				if (i !== 'streams') assert.equal( cam[i], json[i] );
			}
		});

		after( function() {
			deleteCamera( cam );
		});
	});

	describe('updateStream', function() {
		var cam;
		var stream_id = '_' + Date.now();

		before( function(done) {
			new Camera( cam_with_streams, videosFolder, function(new_cam) {
				cam = new_cam;

				cam.addStream({
					id: stream_id,
					motionParams: {
						enabled: false
					}
				}, function() {
					done();
				});
			});
		});

		after( function() {
			deleteCamera( cam );
		});

		it('should call restartStream if any of the restatParams have changed', function(done) {

			var updateStreamSpy = sinon.spy(cam, 'updateStream');

			cam.updateStream({
				id: stream_id,
				resolution: 'new_resolution'
			}, function() {
			});
			
			assert.ok( updateStreamSpy.calledOnce );
			done();
		});
	});


	describe('deleteChunk', function() {

		var cam;
		var streamId;
		var file_1, file_2;
		var chunk_1, chunk_2;
		var thumb_1;

		before( function(done) {

			process.env['BASE_FOLDER'] = videosFolder;

			var deleteChunkTestCam = _.clone(cam_with_streams);
			deleteChunkTestCam._id = 'deleteChunkTestCam_id';

			new Camera( deleteChunkTestCam, videosFolder, function(new_cam) {
				cam = new_cam;
				streamId = Object.keys(cam.streams)[0];

				file_1 = videosFolder+"/"+cam._id+"/"+ streamId + '/videos/2016-1-1/another_file_1.ts';
				file_2 = videosFolder+"/"+cam._id+"/"+ streamId + '/videos/2016-1-1/another_file_2.ts';
				file_3 = videosFolder+"/"+cam._id+"/"+ streamId + '/videos/2016-1-1/another_file_3.ts';

				thumb_1 = videosFolder + '/' + cam._id + '/' + streamId + '/thumbs/another_file_1.jpg';

				chunk_1 = {
					id:         0,
					cam_id:     cam._id,
					stream_id:  streamId,
					start:      1,
					end:        100,
					file:       file_1
				};

				chunk_2 = {
					id:         1,
					cam_id:     cam._id,
					stream_id:  streamId,
					start:      1,
					end:        100,
					file:       file_2
				};

				cam.addChunk( streamId, chunk_1);
				cam.addChunk( streamId, chunk_2);

				setTimeout( function() {
					done();
				}, 50);
			});
		});
		after( function() {
			deleteCamera( cam );
		});

		it('should just callback with there is not such stream', function(done) {
			cam.deleteChunk('no_such_stream', {}, function() {
				done();
			});
		});

		it('should delete video file and its corresponding thumbnail', function(done) {
			fse.ensureFileSync( file_1 );
			fse.ensureFileSync( thumb_1 );
			console.log( thumb_1 );

			cam.deleteChunk( streamId, chunk_1, function() {
				var videoExists = fs.existsSync( file_1 );
				assert.ok(!videoExists);
				setTimeout( function() {
					var thumbExists = fs.existsSync( thumb_1 );
					assert.ok(!thumbExists);
					done();
				}, 500);
			});
		});

		it('should callback when the chunk is not indexed', function(done) {
			var chunk = {
				id: 10001,
				file: file_3
			}
			cam.deleteChunk( streamId, chunk, function() {
				done();
			});
		});
	});
});


