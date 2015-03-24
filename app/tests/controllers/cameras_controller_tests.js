var fs           = require('fs');
var fse          = require('fs-extra');
var EventEmitter = require('events').EventEmitter;            //
var util         = require('util');                           // for inheritance

describe('CamerasController', function() {
	var assert = require("assert");
	var sinon = require("sinon");

	var mp4Handler = require('../../controllers/mp4_controller');
	var CamerasController = require('../../controllers/cameras_controller.js');

	var db_file = __dirname + '/../fixtures/files/cam_db';
	var videosFolder = __dirname + '/../fixtures/cameras_controller_test';

	fse.removeSync( __dirname + '/../fixtures/cameras_controller_test/*' );

	var controller;

	before( function(done) {
		controller = new CamerasController( mp4Handler, db_file, videosFolder, function() {
			done();
		});
	});

	after(function(done) {
		clearInterval( controller.orphanFilesChecker.checkOrphanFilesInterval );
		fse.removeSync( __dirname + '/../fixtures/cameras_controller_test/*' );
		fse.removeSync( __dirname + '/../fixtures/videosFolder/*' );
		done();
	});


	describe('#insertNewCamera', function(){
		it('should create the camera', function(done){
			cam = {ip: "192.168.215.102",type: "onvif",status: "missing camera stream(s)",manufacturer: "unknown",id: "id_0.770617583533749"};

			var spy = sinon.spy(controller, 'pushCamera');

			controller.insertNewCamera(cam,function(err,camera){
				assert.equal(err, null);
				assert.equal(camera.ip, cam["ip"]);
				assert.equal(camera.type, cam["type"]);
				assert.equal(camera.status, cam["status"]);
				assert.equal(camera.manufacturer, cam["manufacturer"]);
				assert.equal(camera.id, cam["id"]);
				assert(spy.calledOnce);
				done();
			});
		});
	});

	describe('#getCamera', function(){
		it('should retrieve the camera', function(done){
			var cam_id = controller.cameras[0]._id;
			controller.getCamera(cam_id,function(err,camera){
				assert.equal(camera._id, cam_id);
				done();
			});
		});
	});


	describe('#updateCamera', function(){
		it('should retrieve the camera', function(done){
			var cam_id = controller.cameras[0]._id;

			cam = {
				_id: cam_id,
				name: "Axis Office",
				username: "root",
				password: "admin"
			}

			controller.updateCamera(cam,function(err,camera){
				assert.equal(camera.name, cam.name);
				assert.equal(camera.username, cam.username);
				assert.equal(camera.password, cam.password);
				done();
			});
		});
	});

	describe('#updateCameraSchedule', function(){
		it('should retrieve the camera', function(done){
			var cam_id = controller.cameras[0]._id;

			schedule = {
				_id: cam_id,
				schedule_enabled: true,
				schedule: {
					sunday: {
						open: {hour: 9,minutes: 0},
						close: {hour: 17,minutes: 0}
					},monday: {
						open: {hour: 9,minutes: 0},
						close: {hour: 17,minutes: 0}
					},tuesday: {
						open: {hour: 9,minutes: 0},
						close: {hour: 17,minutes: 0}
					},wednesday: {
						open: {hour: 9,minutes: 0},
						close: {hour: 17,minutes: 0}
					},thursday: {
						open: {hour: 9,minutes: 0},
						close: {hour: 17,minutes: 0}
					},friday: {
						open: {hour: 9,minutes: 0},
						close: {hour: 17,minutes: 0}
					},saturday: {
						open: {hour: 9,minutes: 0},
						close: {hour: 17,minutes: 0}
					}
				}
			};
			var days_of_the_week = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
			controller.updateCameraSchedule(schedule,function(err,camera){
				for (var i in days_of_the_week){
					assert.equal(camera.schedule.day(days_of_the_week[i]).open.getHour(), 9);
					assert.equal(camera.schedule.day(days_of_the_week[i]).close.getHour(), 17);
				}
				done();
			});
		});
	});	


	describe('#removeCamera', function(){
		it('should remove the camera', function(done){

			controller.removeCamera(controller.cameras[0]._id,function(err, numRemoved){
				assert.equal(err, null);
				assert.equal(numRemoved, 1);
				done();
			});
		});
	});


	describe('listCameras', function() {
		
		it( 'should callback with all cameras', function( done ) {

			var cameras = controller.cameras;
			controller.listCameras( function(err, list ) {
				for (var i in list) {
					assert.equal( list[i]._id, cameras[i]._id );
				}
				done();
			});
		});
	});

	
	describe('listVideosByCamera', function() {
		it('should  return if camera or stream is not found', function() {
			
			var camId = controller.cameras[0]._id;
			controller.listVideosByCamera('no_camera', 'no_stream', 0, 100, function() {
			});
			controller.listVideosByCamera(camId, 'no_stream', 0, 100, function() {
			});

		});
	});

	describe('requestSnapshot', function() {
		it('should push request to queue', function( done ) {
			var camId = 'a_camera_id';
			var req = {type: 'request'};
			var res = {type: 'response'};

			res.on = function() {};
			res.end = function() { done() };
			res.writeHead = function() {};
			res.json = function() {};

			req.query = {};

			var qSpy = sinon.spy( controller.snapshotQ, 'push' );
			controller.requestSnapshot( camId, req, res );
			var snap = controller.snapshotQ[0];
			assert.equal( snap.camId, camId );
			assert.ok( qSpy.calledOnce );
			done();
		});


		it('should set cancelled to true if request is cancelled', function(done) {
			var camId = 'another_camera_id';
			var req = {type: 'request'};
			var res = {type: 'response'};

			var Res = function() {
			};

			util.inherits( Res, EventEmitter );

			res = new Res();

			res.end = function() { done() };
			res.writeHead = function() {};
			res.json = function() {};


			req.query = {};

			controller.requestSnapshot( camId, req, res );
			var snap = controller.snapshotQ[ controller.snapshotQ.length - 1];

			assert.ok( !snap.cancelled );
			res.emit('close');

			setTimeout( function() {
				assert.ok( snap.cancelled );
				done();
			},100);
		});
	});

	describe('getOldestChunks', function() {
		
// 		controller.cameras = [];
//
// 		for(var i = 0; i < 5; i++) {
// 			var cam = {
// 				ip:            "192.168.215.102",
// 				type:          "onvif",
// 				status:        "missing camera stream(s)",
// 				manufacturer:  "unknown",
// 				id:            'id_' + Math.random()
// 			};
//
// 		}
			// controller.insertNewCamera(cam,function(err,camera){
			// var spy = sinon.spy(controller, 'pushCamera');

	});
});


