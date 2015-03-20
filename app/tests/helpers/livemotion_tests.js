var createServer = require('../lib/server.js');
var request      = require('request');
var net = require('net');

//
describe('MotionStreamer', function() {
//
	var fs = require('fs');
	var fse = require('fs-extra');
	var assert = require("assert");
	var sinon = require("sinon");

	var MotionStreamer = require('../../helpers/live_motion.js');



	after( function(done) {
		// streamer.close();
		done();
	});

	describe('initServer', function() {

		it('should close the server if it is already running', function(done) {
			var pipeFile = __dirname + '/pipe_live_motion';
			var streamer = new MotionStreamer(pipeFile);

			var closeMethod = sinon.spy(streamer.server, 'close');
			streamer.initServer();
			assert( closeMethod.calledOnce );
			done();			
		});


		it('should create a socket and accept connections', function(done) {
			var pipeFile = __dirname + '/pipe_live_motion';
			var streamer = new MotionStreamer(pipeFile);
			
			setTimeout( function() {
				var client = net.connect(pipeFile, function() {
					streamer.stop();
					done();	
				});
			}, 100);
		});
		
	});

});
