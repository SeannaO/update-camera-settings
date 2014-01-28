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
				assert(data.stream_id === recordModel.stream.id);
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
				assert( recordModel.status === 2 ); 	// IMPORTANT: please check if RECORDING is set to 2 in record_model.js
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
					assert( compareArrays( args, files ) );
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
					assert( recordModel.status === 0 );
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
					assert( recordModel.watcher.stopWatching.calledOnce );
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
					assert(false);
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

			assert( compareArrays( recordModel.pending, filesWithCorrectFolders ) );			
		});
	});
	// end of addNewVideosToPendingList tests
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
