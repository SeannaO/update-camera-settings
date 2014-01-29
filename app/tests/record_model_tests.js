var assert = require("assert");
var sinon = require("sinon");

var RecordModel = require('../models/record_model.js');
var CameraModel = require('../models/camera_model.js');

var fs = require('fs');
var path = require('path');

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
		}
	}
};	

var cam = new CameraModel( cam_with_streams, 'tests/videosFolder');

describe('RecordModel', function() {

	describe('constructor', function() {			
	});


	describe('startRecording', function() {
				
		it('should start watcher, launchMonitor and call recordContinuously if not yet recording', function() {
			var recordModel = new RecordModel( cam, cam.streams['stream_1'] );

			sinon.spy(recordModel.watcher, 'startWatching');
			sinon.spy(recordModel, 'recordContinuously');
			sinon.spy(recordModel, 'launchMonitor');

			recordModel.startRecording();
			assert(recordModel.watcher.startWatching.calledOnce);
			assert(recordModel.recordContinuously.calledOnce);
			assert(recordModel.launchMonitor.calledOnce);
		});


		it('should not start watcher again if already recording', function() {
			var recordModel = new RecordModel( cam, cam.streams['stream_1'] );

			sinon.spy(recordModel.watcher, 'startWatching');

			recordModel.startRecording();
			recordModel.startRecording();

			assert(recordModel.watcher.startWatching.calledOnce);
		});


		it('should emit camera_status with correct stream_id on watcher new_files event', function( done ) {

			var recordModel = new RecordModel( cam, cam.streams['stream_1'] );

			recordModel.startRecording();
			
			recordModel.on('camera_status', function(data) {
				assert.equal(data.stream_id, recordModel.stream.id);
				done();
			});

			var files = ['a', 'b', 'c'];
			recordModel.watcher.emit('new_files', files);
		});


		it('should reset lastChunkTime and set status as RECORDING on new_files event', function( done ) {

			var recordModel = new RecordModel( cam, cam.streams['stream_1'] );

			recordModel.startRecording();
			
			var lastChunkTime_old = recordModel.lastChunkTime;
			
			recordModel.on('camera_status', function(data) {
				setTimeout( function() {
					assert( lastChunkTime_old != recordModel.lastChunkTime);
					done();
				}, 10);
				assert.equal( recordModel.status, 2 ); 	// IMPORTANT: please check if RECORDING is set to 2 in record_model.js
			});

			var files = ['a', 'b', 'c'];
			recordModel.watcher.emit('new_files', files);
		});


		it('should call addNewIndexToPendingList with correct files on new_files event', function( done ) {

			var recordModel = new RecordModel( cam, cam.streams['stream_1'] );

			recordModel.startRecording();
			
			sinon.spy(recordModel, 'addNewVideosToPendingList');

			var lastChunkTime_old = recordModel.lastChunkTime;

			var files = ['a', 'b', 'c'];

			recordModel.on('camera_status', function(data) {
				setTimeout( function() {
					assert( recordModel.addNewVideosToPendingList.calledOnce );
					var args = recordModel.addNewVideosToPendingList.args[0][0];
					assert( compareArrays( args, files ),
						'not calling addNewIndexToPendingList with correct files');

					done();
				}, 10);
			});

			recordModel.watcher.emit('new_files', files);
		});
	});
	// end of startRecording tests
	//


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


		it ('should call stopWatching on watcher', function( done ) {
			
			var recordModel = new RecordModel( cam, cam.streams['stream_1'] );
			recordModel.startRecording();

			sinon.spy(recordModel.watcher, 'stopWatching');

			setTimeout( function() {
				recordModel.stopRecording();

				setTimeout( function() {
					assert( recordModel.watcher.stopWatching.calledOnce, 
						'watcher.stopWatching not being called once' );

					done();
				}, 50);
			}, 10);
		});


		it ('should stop listening to new_files events', function( done ) {
			
			var recordModel = new RecordModel( cam, cam.streams['stream_1'] );
			recordModel.startRecording();

			setTimeout( function() {
				recordModel.stopRecording();

				recordModel.on('camera_status', function() {
					assert(false, 'should not respond to new_files events');
					done();	
				});

				recordModel.watcher.emit('new_files', ['a','b','c']);

				setTimeout( function() {
					done();
				}, 100);

			}, 10);
		});
	});
	// end of stopRecording tests
	//


	describe('addNewVideosToPendingList', function() {

		it ('should add all file names to pending array with correct path to tmp folder', function() {
			var recordModel = new RecordModel( cam, cam.streams['stream_1'] );
				
			var files = ['a', 'b', 'c'];
			var filesWithCorrectFolders = [];

			for (var i in files) {
				filesWithCorrectFolders.push( recordModel.folder + '/videos/tmp/' + files[i] );
			}
			
			recordModel.addNewVideosToPendingList( files );

			assert( compareArrays( recordModel.pending, filesWithCorrectFolders ), 
				'didnt add all file names to pending array with correct path to tmp folder' );			
		});
	});
	// end of addNewVideosToPendingList tests
	//


	describe('moveFile', function() {
		
		it ('should callback with appropriate error message if video is undefined', function( done ) {
			var recordModel = new RecordModel( cam, cam.streams['stream_1'] );
			
			var video;

			recordModel.moveFile( video, function(err) {
				assert(err === 'Cannot move video file since it is undefined');
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

			fs.createReadStream(__dirname+'/fixtures/files/empty_file').pipe(fs.createWriteStream(__dirname+'/videosFolder/'+cam._id+'/stream_1/videos/tmp/empty_file'));			

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

			fs.createReadStream(__dirname+'/fixtures/files/empty_file').pipe(fs.createWriteStream(__dirname+'/videosFolder/'+cam._id+'/stream_1/videos/tmp/empty.file'));

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


		it ('should create thumbnail with appropriate name and store it in thumbs folder', function( done ) {
			var recordModel = new RecordModel( cam, cam.streams['stream_1'] );

			fs.createReadStream(__dirname+'/fixtures/files/chunk_1.ts').pipe(fs.createWriteStream(__dirname+'/videosFolder/'+cam._id+'/stream_1/videos/tmp/chunk_1.ts'));

			var time = Math.round( Math.random() * Date.now() );

			var video = {
				file: 'chunk_1.ts',
				start: time,
		   		end: time + 1000
			};

			var date = new Date( video.start );
			var dateString = date.getUTCFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
			var toFolder = recordModel.folder + '/thumbs';
			
			var destination_file = toFolder + '/' + video.start + "_" + (video.end - video.start) + '.jpg';

			recordModel.moveFile( video, function(err) {
				fs.exists( destination_file, function(exists) {
					assert(exists);
					done();
				});
			});
		});


		it ('should update video.file value to the name of the new chunk that was stored', function( done ) {
			var recordModel = new RecordModel( cam, cam.streams['stream_1'] );

			fs.createReadStream(__dirname+'/fixtures/files/chunk_1.ts').pipe(fs.createWriteStream(__dirname+'/videosFolder/'+cam._id+'/stream_1/videos/tmp/chunk_1.ts'));

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
	// end of moveFile tests
	// 


	describe('calcDuration', function() {

		it('should callback with error message in case of unexistent file', function( done ) {

			var recordModel = new RecordModel( cam, cam.streams['stream_1'] );
			
			sinon.spy(recordModel, 'calcDurationWithFileInfo');

			var file1;
			var file2 = "";
			var file3 = "this_file_does_not_exist";

			recordModel.calcDuration( file1, function(err) {
				assert(err);
				recordModel.calcDuration(file2, function(err2) {
					assert(err2);
					recordModel.calcDuration(file3, function(err3) {
						assert(err3);

						setTimeout( function() {
							assert( !recordModel.calcDurationWithFileInfo.called );
							done();
						}, 100);
					});
				});
			});
		});


		it('should callback with error message in case of corrupt video file', function( done ) {

			var recordModel = new RecordModel( cam, cam.streams['stream_1'] );
			
			var file1 = __dirname+'/fixtures/files/corrupt_chunk.ts';
			var file2 = __dirname+'/fixtures/files/empty_file';

			sinon.spy(recordModel, 'calcDurationWithFileInfo');

			recordModel.calcDuration( file1, function(err) {
				assert(err);
				recordModel.calcDuration(file2, function(err2) {
					assert(err2);
					setTimeout( function() {
						assert( recordModel.calcDurationWithFileInfo.calledTwice );
						done();
					}, 100);
				});
			});
		});


		it('should callback without errors and correct video object if successfully calculates time duration', function( done ) {

			var recordModel = new RecordModel( cam, cam.streams['stream_1'] );
			
			var file = __dirname+'/fixtures/files/09.58s_chunk.ts';
			var length = '09:58';

			var fileInfo = fs.statSync( file );
			var lastModified = ( new Date(fileInfo.mtime) ).getTime();

			var duration_min = 9000;
			var duration_max = 10000;

			recordModel.calcDuration( file, function(err, video) {

				assert(!err);

				var expected_video = {
					cam: 	recordModel.camId,
					stream: recordModel.stream.id,
					start:	lastModified - duration_max,
					end: lastModified
				};

				assert.equal( video.cam, expected_video.cam );
				assert.equal( video.stream, expected_video.stream );
				assert( video.start >= expected_video.end - duration_max,	// lower bound
					'duration time should be around 9.58s');
				assert( video.start <= expected_video.end - duration_min,	// upper bound
					'duration time should be around 9.58s');
				assert.equal( video.end, expected_video.end );

				done();
			});
		});
	});
	// end of calcDuration tests
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
