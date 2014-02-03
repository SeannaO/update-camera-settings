var fs = require('fs');
var path = require('path');
var makeThumb = require('./ffmpeg').makeThumb;
var EventEmitter = require('events').EventEmitter;
var util = require('util');

function Thumbnailer() {
	
	console.log('initializing thumbnailer');

	this.queue = [];
	this.checkForChunks();
}


util.inherits(Thumbnailer, EventEmitter);


Thumbnailer.prototype.checkForChunks = function() {

	// checks for awaiting chunks on queue and calls ffmpeg.makeThumb
	// when process is done, emit new_thumb event and 
	// call checkForChunks again
	// new_thumb should contain the thumb name, stream_id and cam_id
	// if there aren't awaiting chunks, setTimeout for checkForChunks

	var self = this;
	var chunk = this.queue.shift();

	if (!chunk) {
		setTimeout( function() {
			self.checkForChunks();
		}, 1000);
	} else {
		makeThumb( chunk.file, chunk.thumbFolder, {width: 160, height: 120}, function() {
			var thumb = { 
				start: chunk.start,
				end: chunk.end,
				chunk_file: chunk.file,
				folder: chunk.thumbFolder,
				cam: chunk.cam,
				stream: chunk.stream
			};

			self.emit('new_thumb', thumb);

			self.checkForChunks();
		});
	}
};


Thumbnailer.prototype.addChunk = function( chunk ) { 
	this.queue.push( chunk );
};

module.exports = Thumbnailer;


