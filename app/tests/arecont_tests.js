var assert = require("assert");
var sinon = require("sinon");

var fs = require('fs');

var Api = require('../helpers/camera_scanner/cam_api/arecont.js');

// describe('#getMotionParams and #setMotionParams', function() {

// 	it('sets and gets the level threshold', function() {
		
// 	});

// 	it('sets and gets the motion sensitivity', function() {

// 	});
// });

// describe('#isMotionEnabled', function() {
// 	it('checks that motion is enabled on the camera', function() {
		

// 	});
// });

// describe('#setupMotionDetection', function() {
// 	it('enables motion detection on the camera', function() {
		

// 	});
// });

// describe('#setupMotionDetection', function() {
// 	it('enables motion detection on the camera', function() {
		

// 	});
// });

var api = new Api({username:'admin', password:"admin", ip:"192.168.215.117"})

api.startListeningForMotionDetection(function(result){

});