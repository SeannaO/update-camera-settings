var assert = require("assert");
var sinon = require("sinon");

var fs = require('fs');

var Scheduler = require('../../helpers/scheduler.js');
var Camera = require('../../models/camera_model');	// 
var videosFolder = __dirname + '/../fixtures/cameras'

describe('Scheduler', function(){
	describe('#launchForAllCameras', function(){
	    it('launches the scheduler for each camera', function(done){
	    	var scheduler = new Scheduler();
	    	var cam = {_id: "1", ip: "192.168.215.102",type: "onvif",status: "missing camera stream(s)",manufacturer: "unknown",id: "id_0.770617583533749"};
	    	var cameras = [new Camera(cam, videosFolder )];
	    		
			var spy = sinon.spy(scheduler, 'launchForCamera');

			scheduler.launchForAllCameras(cameras, function(){
				for (var i = 0; i < cameras.length; i++) {
					assert(spy.calledOnce);
				}
				done();	
			});
			
	    })
	});
//
	describe('#clearForAllCameras', function(){
	    it('clears the scheduler for each camera', function(done){
	    	var scheduler = new Scheduler();
	    	var cam = {_id: "1", ip: "192.168.215.102",type: "onvif",status: "missing camera stream(s)",manufacturer: "unknown",id: "id_0.770617583533749"};
	    	var cameras = [new Camera(cam, videosFolder )];
			var spy = sinon.spy(scheduler, 'clearForCamera');
			scheduler.launchForAllCameras(cameras, function(){
				scheduler.clearForAllCameras(cameras,function(){
					for (var i = 0; i < cameras.length; i++) {
						assert(spy.calledOnce);
					}
					// assert(!Object.keys(scheduler.processes).length);
					done();	
				});
			});
	    })
	});
//
	describe('#clearAll', function(){
	    it('clears all of the scheduled processes', function(done){
	    	var scheduler = new Scheduler();
	    	var cam = {_id: "1", ip: "192.168.215.102",type: "onvif",status: "missing camera stream(s)",manufacturer: "unknown",id: "id_0.770617583533749"};
	    	var cameras = [new Camera(cam, videosFolder ), new Camera(cam, videosFolder )];
			// var spy = sinon.spy(scheduler, 'clearForCamera');
			scheduler.launchForAllCameras(cameras, function(){
				scheduler.clearAll(function(){
					assert(!Object.keys(scheduler.processes).length);
					done();	
				});
			});
	    })
	});		
//
	describe(".launchForCamera and .clearForCamera", function(){
		it("will launch the process if it doesn't exist", function(done){
			var scheduler = new Scheduler();
			var cam = {ip: "192.168.215.102",type: "onvif",status: "missing camera stream(s)",manufacturer: "unknown",id: "id_0.770617583533749"};
			var camera = new Camera(cam, videosFolder );
			assert(scheduler.processes[camera._id] == null);
			scheduler.launchForCamera(camera);
			assert(scheduler.processes[camera._id] != null);
			scheduler.clearForCamera(camera);
			assert(scheduler.processes[camera._id] == null);
			done();
		});
	});	
});
