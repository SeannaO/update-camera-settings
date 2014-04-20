var Stream = require('stream');
var fs = require('fs');
var net = require('net');
var events = require('events');
var util = require('util');

// grab a random port.
var Streamer = function( pipeFile ) {

	this.sink;
	this.pass;
	this.fileStream;
	this.stream;
	this.pipeFile = pipeFile;
	this.server;
	
	this.refreshStream();
};

util.inherits(Streamer, events.EventEmitter);

Streamer.prototype.initServer = function() {

	var self = this;

	this.server = net.createServer( function(socket) {
		console.log('new connection');
		socket.on('data', function(data) {
			self.pass.write(data);
			// console.info('!!!!! new data');
			// console.info('!!!!! new data');
		});
	});

	fs.exists(this.pipeFile, function(exists) {
		if (exists) fs.unlinkSync(self.pipeFile);
		self.server.listen(self.pipeFile);
	});
	this.server.on('error', function(e) {
		console.log(e);
	});
};


Streamer.prototype.pipe = function(res) {
	this.stream.pipe(res);
	res.on('close', function() {
		console.log('closed connection');
	});
}


Streamer.prototype.refreshStream = function() {

	if (this.fileStream) {
		this.fileStream.unpipe();
	}
	if (this.stream) {
		this.stream.unpipe();
	}
	if (this.pass) {
		this.pass.unpipe();
	}

	this.createSink();
	this.createPass();
	this.createStream();
	this.initServer();
};


Streamer.prototype.createSink = function() {

	this.sink = new Stream.Writable();
	this.sink.on('error', function(err) {
		console.log('sink error');
		console.log(err);
	});
	this.sink._write = function (chunk, enc, next) {
		next();
	};
};


Streamer.prototype.createPass = function() {
	this.pass = new Stream.PassThrough();
	this.pass.on('error', function(err) {
		console.log('passthrough error');
		console.log(err);
	});
};


Streamer.prototype.createStream = function() {
	
	var self = this;

	console.info('=======================');
	console.info('-- creating streamTs --');
	console.info('-- ' + self.pipeFile + '--');
	console.info('=======================');

	var timer = Date.now();

	// return;
	this.stream = new Stream.PassThrough();

	if( !this.stream) { 
		console.log('null stream');
	}

	try {
		// this.fileStream.pipe( this.pass );
		this.pass.pipe( self.stream ).pipe( self.sink );
		// this.pass.pipe( self.stream );
	} catch(err) {
		console.log('piping error');
		console.error( err );
	}

// 	var t = setInterval( function() {
//
// 		if (Date.now() - timer >= 5000) {
// 			self.emit('refresh');
// 			console.log(Date.now() + ' reopening pipe...');
// 			clearInterval(t);
// 			self.refreshStream();	
// 		}
// 	}, 5000);
};

module.exports = Streamer;
