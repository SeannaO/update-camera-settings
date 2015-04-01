var assert = require("assert");
var sinon = require("sinon");

var RecordModel = require('../../models/record_model.js');
var CameraModel = require('../../models/camera_model.js');

var fs = require('fs');
var path = require('path');


describe('RecordModel', function() {

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
				quality: '5',
				rtsp: 'rtsp://stream1_rtsp'
			}, 
			stream_2 : {
				id: 'stream_2',
				resolution: '1280x960',
				framerate:	'20',
				quality:	'30',
				rtsp: 'rtsp://stream2_rtsp'
			},
			actual_stream : {				
				id: 'actual_stream',
				resolution: '1280x960',
				framerate:	'20',
				quality:	'30',
				rtsp: 'rtsp://192.168.215.102'		// IMPORTANT: this field should contain an actual rtsp url 
													// and it should be accessible from your machine in order for some tests to pass
			},
			empty_stream : {				
				id: 'empty_stream',
				resolution: '1280x960',
				framerate:	'20',
				quality:	'30',
				rtsp: ''		
			}

		}
	};

	var cam_with_streams_2 = {
		_id: "another_camera_2",
		name: "a name",
		ip: "127.0.0.1",
		manufacturer: 'a_manufacturer',
		user: 'a_user',
		password: 'a_password',
		streams: {
			stream_1 : {
				id: 'another_stream_1',
				resolution: '640x480',
				framerate: '10',
				quality: '5',
				rtsp: 'rtsp://stream1_rtsp'
			}, 
			stream_2 : {
				id: 'another_stream_2',
				resolution: '1280x960',
				framerate:	'20',
				quality:	'30',
				rtsp: 'rtsp://stream2_rtsp'
			}
		}
	};	

	var cam = new CameraModel( cam_with_streams, 'tests/fixtures/videosFolder');
	var cam_2 = new CameraModel( cam_with_streams_2, 'tests/fixtures/videosFolder');
	
	after( function(done) {
		for(var i in cam) {
			if( cam.streams[i] ) cam.streams[i].removeStream();
		}

		for(var i in cam_2) {
			if( cam_2.streams[i] ) cam_2.streams[i].removeStream();
		}

		done();
	});

	describe('constructor', function() {		
		it('should initialize all attributes correctly', function() {
			
			var recordModel = new RecordModel( cam, cam.streams['stream_1'], function(recordModel) {

				assert( recordModel.pending );
				assert.equal( recordModel.pending.length, 0 );

				assert.equal( recordModel.lastChunkTime, 0 );
				assert.equal( recordModel.lastErrorTime, 0 );

				assert.equal( recordModel.status, 3 );		// NOTE: 3 is the CREATED status code; 

				assert.equal( recordModel.camera, cam );
				assert.equal( recordModel.camId, cam._id );

				assert.equal( recordModel.rtsp, cam.streams['stream_1'].rtsp || cam.streams['stream_1'].url );
				assert.equal( recordModel.stream, cam.streams['stream_1'] );
				assert.equal( recordModel.db, cam.streams['stream_1'].db );

				var folder = cam.videosFolder + '/' + cam.streams['stream_1'].id;
				assert.equal( recordModel.folder, folder );

				assert( recordModel.filesToIndex );
				assert.equal( recordModel.filesToIndex.length, 0 );
			});
		});
	});
	// end of constructor tests
	//


	describe('startRecording', function() {

		it('should start watcher, launchMonitor and call recordContinuously if not yet recording', function() {
			var recordModel = new RecordModel( cam, cam.streams['stream_1'], function(recordModel) {

				sinon.spy(recordModel, 'recordContinuously');
				sinon.spy(recordModel, 'launchMonitor');

				recordModel.startRecording();
				assert(recordModel.recordContinuously.calledOnce);
				assert(recordModel.launchMonitor.calledOnce);
			});
		});

	});
	// end of startRecording tests
	//

	describe('calcDuration', function() {
//
		var recordModel;

		before( function(done) {
			recordModel = new RecordModel( cam, cam.streams['stream_1'], function() {
				done();
			});
		});

		after( function() {
			// recordModel.stopRecording();	
		});
//
// 			
		it('should callback json object with correct file info', function(done) {
			var fileName = '09.58s_chunk';
			var file = __dirname + '/../fixtures/files/' + fileName + '.ts';
			recordModel.calcDuration( file, function(err, d) {
				assert.equal(d.file, file);	
				var duration = d.end - d.start;
				assert.equal(duration, 9580);
				done();
			});
		});
	});


	describe('receiveSignal', function() {
		var recordModel;

		before( function(done) {
			recordModel = new RecordModel( cam, cam.streams['stream_1'], function() {
				done();
			});
		});

		it('should call moveFile if new_chunk belongs to record model stream', function(done) {
			var moveFileSpy = sinon.spy(recordModel, 'moveFile');
			var args = '{"id":"'+recordModel.stream.id+'"}'
			recordModel.receiveSignal( '', args );	
			assert(moveFileSpy.calledOnce);
			done();
		});
	});

	describe('stopRecording', function() {

		it ('should set status as STOPPED', function( done ) {

			var recordModel = new RecordModel( cam, cam.streams['stream_1'] );
			recordModel.startRecording();

			setTimeout( function() {
				recordModel.stopRecording();

				setTimeout( function() {
					assert.equal( recordModel.status, 0 );
					done();
				}, 50);
			}, 10);
		});
	});
	// end of stopRecording tests
	//

	describe('moveFile', function() {

		it ('should callback with appropriate error message if video is undefined', function( done ) {
			var recordModel = new RecordModel( cam, cam.streams['stream_1'] );

			var video;

			recordModel.moveFile( video, function(err) {
				assert(err === '[RecordModel.moveFile]  cannot move video file since it is undefined');
				done();
			});
		});


		it ('should callback with appropriate error message if video file does not exist', function( done ) {
			var recordModel = new RecordModel( cam, cam.streams['stream_1'] );

			var video = {
				file: 'this_file_does_not_exist',
				start: 1,
		   		end: 2
			};

			recordModel.moveFile( video, function(err) {
				if (err) {
					done();
				}
			});
		});


		it ('should create a folder with chunk date', function( done ) {
			var recordModel = new RecordModel( cam, cam.streams['stream_1'] );

			fs.createReadStream(__dirname + '/../fixtures/files/empty_file').pipe(fs.createWriteStream(__dirname+'/../fixtures/videosFolder/'+cam._id+'/stream_1/videos/tmp/empty_file'));			

			var time = Math.round( Math.random() * Date.now() );

			var video = {
				file: 'empty_file',
				start: time,
		   		end: time + 1000
			};

			var date = new Date( video.start );
			var dateString = date.getUTCFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
			var toFolder = recordModel.folder + '/videos/' + dateString;

			recordModel.moveFile( video, function(err) {
				fs.exists( toFolder, function(exists) {
					assert(exists);
					done();
				});
			});
		});


		it ('should move file from tmp folder to appropriate folder and rename it accordingly', function( done ) {
			var recordModel = new RecordModel( cam, cam.streams['stream_1'] );

			fs.createReadStream(__dirname + '/../fixtures/files/empty_file').pipe(fs.createWriteStream(__dirname+'/../fixtures/videosFolder/'+cam._id+'/stream_1/videos/tmp/empty.file'));

			var time = Math.round( Math.random() * Date.now() );

			var video = {
				file: 'empty.file',
				start: time,
		   		end: time + 1000
			};

			var date = new Date( video.start );
			var dateString = date.getUTCFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
			var toFolder = recordModel.folder + '/videos/' + dateString;

			var destination_file = toFolder + '/' + video.start + "_" + (video.end - video.start) + path.extname( video.file );

			recordModel.moveFile( video, function(err) {
				fs.exists( destination_file, function(exists) {
					assert(exists);
					done();
				});
			});
		});


		it ('should update video.file value to the name of the new chunk that was stored', function( done ) {
			var recordModel = new RecordModel( cam, cam.streams['stream_1'], function(recordModel) {
				fs.createReadStream(__dirname + '/../fixtures/files/chunk_1.ts').pipe(fs.createWriteStream(__dirname+'/../fixtures/videosFolder/'+cam._id+'/stream_1/videos/tmp/chunk_1.ts'));

				var time = Math.round( Math.random() * Date.now() );

				var video = {
					file: 'chunk_1.ts',
					start: time,
					end: time + 1000
				};

				var date = new Date( video.start );
				var dateString = date.getUTCFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
				var toFolder = recordModel.folder + '/videos/' + dateString;

				var to = toFolder + '/' + video.start + "_" + (video.end - video.start) + path.extname( video.file );

				recordModel.moveFile( video, function(err) {
					assert.equal( video.file, to );
					done();
				});
			});
		});
	});
	// end of moveFile tests
	// 

});



var compareArrays = function( a, b ) {
	if (a.length == b.length && a.every(function(u, i) {
				return u === b[i];
			})
		) {
			return true;
		} else {
			return false;
		}
};
