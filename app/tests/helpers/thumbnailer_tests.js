var Thumbnailer = require('../../helpers/thumbnailer.js');

describe('Thumbnailer', function() {

	var fs = require('fs');
	var fse = require('fs-extra');
	var assert = require("assert");
	var sinon = require("sinon");

	describe('checkForChunks', function() {

		after( function() {
		});

		it('should call itself again in 500ms if queue is empty', function(done) {
			var thumbnailer = new Thumbnailer();
			var thumbSpy = sinon.spy(thumbnailer, 'checkForChunks');
			setTimeout( function() {
				assert(thumbSpy.called);
				thumbnailer.checkForChunks = function() {};
				done();
			},500);
		});

		it ('should call sendSignal with correct params and call itself after 100 ms if queue not empty', function( done ) {

			var thumbnailer      = new Thumbnailer();
			var thumbSpy         = sinon.spy(thumbnailer, 'checkForChunks');
			var sendSignalCalled = false;
			var newThumbEmit     = false;
			var input            = 'input_file';
			var output           = 'output_file';

			thumbnailer.sendSignal = function( inp, out ) {
				sendSignalCalled = true;
				assert.equal(input, inp);
				// assert.equal(output, out);
			};

			var chunk = {
				start:        10,
		   		thumbFolder:  'folder',
		   		folder: 	  'folder',
		   		file:         input,
		   		end:          20
			};

			thumbnailer.queue.push( chunk );
			thumbnailer.on('new_thumb', function(thumb) {
				assert.equal(thumb.start, chunk.start);
				newThumbEmit = true;
			});

			thumbnailer.checkForChunks();

			setTimeout( function() {
				assert.ok(sendSignalCalled);
				assert.ok(newThumbEmit);
				thumbnailer.checkForChunks = function() {};
				done();
			}, 150);
		
		});
	});
});
