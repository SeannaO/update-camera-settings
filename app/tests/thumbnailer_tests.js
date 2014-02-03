var assert = require('assert');
var sinon = require('sinon');

var Thumbnailer = require('../helpers/thumbnailer.js');

describe('Thumbnailer', function() {

	describe('constructor', function() {

		it( 'should initialize queue array', function() {
			var thumbnailer = new Thumbnailer();
			assert.equal( typeof thumbnailer.queue, 'object' );
		});
	});


	describe('checkForChunks', function() {
		var thumbnailer = new Thumbnailer();
		thumbnailer.checkForChunks();
	});
	
});
