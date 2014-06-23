var Stream = require('stream');
var fs = require('fs');
var net = require('net');
var events = require('events');
var util = require('util');

var Streamer = function( pipeFile ) {

	this.sink;
	this.pass;
	this.fileStream;
	this.stream;
	this.pipeFile = pipeFile;
	this.server;
	
	this.refreshStream();
	
	this.bitrate = 0;
};

util.inherits(Streamer, events.EventEmitter);

Streamer.prototype.initServer = function() {

	var self = this;

	try {
		console.log('[live_stream initServer] closing server if already running');
		this.server.close();
	} catch(err) {
		console.log('[live_stream initServer] server not running');
	}	

	this.server = net.createServer( function(socket) {

		socket.on('connection', function() {
			console.log('[socket] new connection');
		});

		socket.on('end', function() {
			socket.unpipe();
			self.pass.unpipe();
			self.refreshStream();
		});
		// start the flow of data, discarding it.
		socket.resume();
		// self.socket = socket;
		socket.unpipe();
		socket.pipe( self.pass );
	});
	
	this.totalData = 0;
	this.lastData = Date.now();
	this.socket;

	this.bpsInterval = setInterval( function() {
		// console.log( self.totalData	+ " bytes/sec" );
		self.totalData = 0;
	}, 1000);

	this.initSocketFile();
};


Streamer.prototype.initSocketFile = function() { 
	
	var self = this;

	clearInterval( this.socketFileChecker );

	fs.exists(this.pipeFile, function(exists) {

		try {
			if (exists) fs.unlinkSync(self.pipeFile);
		} catch(err) {
			console.error("[live_streamer]  attempt to delete unexistent unix socket file");	
		}
		self.server.listen(self.pipeFile);
	});
};


Streamer.prototype.stop = function() {


	if (this.fileStream) {
		this.fileStream.unpipe();
	}
	if (this.stream) {
		this.stream.unpipe();
	}
	if (this.pass) {
		this.pass.unpipe();
	}
	this.server.close();

	clearInterval( this.bpsInterval );
}

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

	this.sink = new Stream.Writable({
		highWaterMark: '128kb'
	});
	this.sink.on('error', function(err) {
		console.log('sink error');
		console.log(err);
	});
	this.sink._write = function (chunk, enc, next) {
		next();
	};
};


Streamer.prototype.createPass = function() {
	this.pass = new Stream.PassThrough({
		highWaterMark: '128kb'
	});
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
	this.stream = new Stream.PassThrough({
		highWaterMark: '128kb'
	});

	this.pass.on('data', function() {
		// console.log('...');
		timer = Date.now();
	});

	if( !this.stream) { 
		console.log('null stream');
	}

	try {
		this.pass.unpipe();
		this.stream.unpipe();
		this.pass.pipe( self.stream ).pipe( self.sink );
		// this.pass.pipe( self.stream );
	} catch(err) {
		console.log('piping error');
		console.error( err );
	}

};

module.exports = Streamer;
