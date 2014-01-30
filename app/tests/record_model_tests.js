var assert = require("assert");
var sinon = require("sinon");

var RecordModel = require('../models/record_model.js');
var CameraModel = require('../models/camera_model.js');

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

	var cam = new CameraModel( cam_with_streams, 'tests/videosFolder');
	var cam_2 = new CameraModel( cam_with_streams_2, 'tests/videosFolder');
	
	describe('constructor', function() {		
		it('should initialize all attributes correctly', function() {
			
			var recordModel = new RecordModel( cam, cam.streams['stream_1'] );

			assert( recordModel.pending );
			assert.equal( recordModel.pending.length, 0 );

			assert.equal( recordModel.lastChunkTime, 0 );
			assert.equal( recordModel.lastErrorTime, 0 );

			assert.equal( recordModel.status, -1 );		// NOTE: -1 is the ERROR status code; 

			assert.equal( recordModel.camera, cam );
			assert.equal( recordModel.camId, cam._id );

			assert.equal( recordModel.rtsp, cam.streams['stream_1'].rtsp || cam.streams['stream_1'].url );
			assert.equal( recordModel.stream, cam.streams['stream_1'] );
			assert.equal( recordModel.db, cam.streams['stream_1'].db );

			var folder = cam.videosFolder + '/' + cam.streams['stream_1'].id;
			assert.equal( recordModel.folder, folder );

			assert.equal( typeof recordModel.watcher, 'object' );

			assert( recordModel.filesToIndex );
			assert.equal( recordModel.filesToIndex.length, 0 );
		});
	});
	// end of constructor tests
	//


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
			var finished = false;

			recordModel.startRecording();
			
			recordModel.on('camera_status', function(data) {
				assert.equal(data.stream_id, recordModel.stream.id);
				if (!finished) done();
				finished = true;
				return;
			});

			var files = ['a', 'b', 'c'];
			recordModel.watcher.emit('new_files', files);
		});


		it('should reset lastChunkTime and set status as RECORDING on new_files event', function( done ) {

			var recordModel = new RecordModel( cam, cam.streams['stream_1'] );
			var finished = false;

			recordModel.startRecording();
			
			var lastChunkTime_old = recordModel.lastChunkTime;
			
			recordModel.on('camera_status', function(data) {
				setTimeout( function() {
					assert( lastChunkTime_old != recordModel.lastChunkTime);
					if (!finished) done();
					finished = true;
					return;
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
							assert( !recordModel.calcDurationWithFileInfo.called,
								'should return immediately and not call calcDurationWithFileInfo');
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
	
	describe("#calcDurationFromFile", function(){
		it ("returns a video object", function(done){
			var recordModel = new RecordModel( cam, cam.streams['stream_1'] );
			var file_name = "/Users/WadBook/solink/nas/cameras/Lug9pjnb1iaAaM9C/f57a95c5-84a5-468c-aeb0-802252d59d0a/videos/2014-1-29/1391013560340_11660.ts"
			var expected = {
				cam: "abc",
				stream: "stream_1",		// appends stream id to the chunk
				start: 1391013560340,
				end: 1391013560340 + 11660,
				file: file_name
			};
			recordModel.calcDurationFromFile(file_name, function(err, video){
				assert.deepEqual(video, expected);
				done();
			});
		});
	});

	describe("#indexPendingFilesAfterCorruptDatabase", function(){
		it ("indexes each file in the database", function(done){
			var recordModel = new RecordModel( cam, cam.streams['stream_1'] );
			recordModel.filesToIndex.push("/Users/WadBook/Documents/Repositories/Github/node_vms/app/tests/videosFolder/abc/stream_1/videos/2013-9-7/1378565852648_1000.ts");
			recordModel.filesToIndex.push("/Users/WadBook/Documents/Repositories/Github/node_vms/app/tests/videosFolder/abc/stream_1/videos/1385142591573_1000.ts");

			var spy = sinon.spy(recordModel, 'indexFileInDatabase');
			
			recordModel.indexPendingFilesAfterCorruptDatabase(function(){
				assert(spy.calledTwice);
				done();
			});
		});
	});


	describe( 'moveAndIndexFile', function() {

		it( 'should callback with errors in case of invalid/unexistent/undefined files', function( done ) {

			var recordModel = new RecordModel( cam, cam.streams['stream_1'] );
			
			sinon.spy(recordModel, 'moveFile');

			var file1;
			var file2 = "";
			var file3 = "this_file_does_not_exist";

			recordModel.moveAndIndexFile( file1, function(err) {
				assert(err);
				recordModel.moveAndIndexFile(file2, function(err2) {
					assert(err2);
					recordModel.moveAndIndexFile(file3, function(err3) {
						assert(err3);
						setTimeout( function() {
							assert( !recordModel.moveFile.called );
							done();
						}, 100);
					});
				});
			});	
		});


		it( 'should emit new_chunk event after successfully moving a file', function( done ) {
		
			var recordModel = new RecordModel( cam, cam.streams['stream_2'] );
			var file = __dirname+'/videosFolder/'+cam._id+'/stream_2/videos/tmp/chunk1.ts';
			
			fs.createReadStream(__dirname+'/fixtures/files/chunk_1.ts').pipe( fs.createWriteStream(file) );
		
			recordModel.on('new_chunk', function(data) {
				done();
			});
			
			
			setTimeout( function() {
				recordModel.moveAndIndexFile( file, function(err) {				
					assert(!err);
				});
			}, 100);
		});
		
	});
	// end of moveAndIndexFile tests
	//
	
	
	describe( 'indexPendingFiles', function() {
		
		it('should just callback and not call moveAndIndexFile when pending list length is <= 1', function( done ) {
			
			var recordModel = new RecordModel( cam, cam.streams['stream_2'] );
			
			sinon.spy(recordModel, 'moveAndIndexFile');
			
			recordModel.indexPendingFiles( function() {
				assert( !recordModel.moveAndIndexFile.called,
					'moveAndIndexFile should no be called');
	
				recordModel.pending = ['should_not_be_indexed'];
		
				recordModel.indexPendingFiles( function() {
					assert( !recordModel.moveAndIndexFile.called,
						'moveAndIndexFile should no be called');
					done();
				});
			});			
		});

		it('should call moveAndIndexFile for each file except the latest one when pending list length is > 1', function( done ) {
			
			var recordModel = new RecordModel( cam, cam.streams['stream_2'] );
			
			sinon.spy(recordModel, 'moveAndIndexFile');
			
			recordModel.pending.push('a');
			recordModel.pending.push('b');
			recordModel.pending.push('c');
			recordModel.pending.push('should_not_be_indexed');

			recordModel.indexPendingFiles( function() {
				assert.equal( recordModel.moveAndIndexFile.firstCall.args[0], 'a');
				assert.equal( recordModel.moveAndIndexFile.secondCall.args[0], 'b');
				assert.equal( recordModel.moveAndIndexFile.thirdCall.args[0], 'c');
				assert( recordModel.moveAndIndexFile.calledThrice );

				assert.equal( recordModel.pending[0], 'should_not_be_indexed');

				done();
			});
			
		});
		
	});
	// end of indexPendingFiles tests
	//
	

	describe('updateCameraInfo', function() {

		it( 'should update params correctly', function() {

			var recordModel = new RecordModel( cam, cam.streams['stream_2'] );
			
			// before
			assert.equal( recordModel.rtsp, cam.streams['stream_2'].rtsp || cam.streams['stream_2'].url  );
			assert.equal( recordModel.camId, cam._id );

			recordModel.updateCameraInfo( cam_2, cam_2.streams['another_stream_1'] );
			
			// after
			assert.equal( recordModel.rtsp, cam_2.streams['another_stream_1'].rtsp || cam_2.streams['another_stream_1'].url  );
			assert.equal( recordModel.camId, cam_2._id );
		});

		it( 'should do nothing if camera or stream are not well defined', function() {

			var recordModel = new RecordModel( cam, cam.streams['stream_2'] );
			
			var undefined_cam;
			var undefined_stream;

			// before
			assert.equal( recordModel.rtsp, cam.streams['stream_2'].rtsp || cam.streams['stream_2'].url  );
			assert.equal( recordModel.camId, cam._id );

			recordModel.updateCameraInfo();
			
			// after
			assert.equal( recordModel.rtsp, cam.streams['stream_2'].rtsp || cam.streams['stream_2'].url  );
			assert.equal( recordModel.camId, cam._id );
		});
	});
	// end of updateCameraInfo tests
	//


	describe( 'recordContinuosly', function() {

		it( 'should write error to console if rtsp is not defined', function() {

			var recordModel = new RecordModel( cam, cam.streams['empty_stream'] );
			
			sinon.spy( console, 'error' );

			recordModel.recordContinuously();
			assert( console.error.withArgs('[RecordModel.recordContinuously] : error : empty rtsp string').calledOnce );

			console.error.restore();
		});

		it( 'should not write error to console when ffmpeg process is killed', function( done ) {
			/*
			this.timeout(15000);

			var recordModel = new RecordModel( cam, cam.streams['actual_stream'] );
			
			console.log("#######################");
			console.log( recordModel.rtsp );
			console.log("#######################");

			sinon.spy( console, 'error' );

			recordModel.recordContinuously();
			
			setTimeout( function() {
				assert( !console.error.called );
				done();
			},  500);
			*/
			done();
		});


	});
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
