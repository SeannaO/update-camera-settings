var Stream = require('stream');
var fs = require('fs');
var net = require('net');
var events = require('events');
var util = require('util');

var Streamer = function( pipeFile ) {

	this.sink;
	this.pass;
	this.stream;
	this.pipeFile = pipeFile;
	this.server;
	
	this.refreshStream();
	
	this.bitrate = 0;
	this.clients = [];
};

util.inherits(Streamer, events.EventEmitter);

Streamer.prototype.initServer = function() {

	var self = this;

	try {
		console.log('[live_stream initServer] closing server if already running');
		if (this.server) this.server.close();
	} catch(err) {
		console.log('[live_stream initServer] server not running');
	}	


	this.server = net.createServer( function(socket) {
		
		if (self.socket) {
			console.log('[live_streamer.js] deleting socket');
			self.socket.removeAllListeners();
			self.socket.unpipe();
			self.socket.destroy();
		}
		self.socket = socket;

		self.socket.on('connection', function() {
			console.log('[socket] new connection');
		});

		self.socket.on('end', function() {
			try {
				self.socket.removeAllListeners();
				self.socket.unpipe();
				self.socket.destroy();
			} catch(err) {
				console.error('[socket] no method unpipe');
			}
			self.pass.unpipe();
			self.refreshStream();
		});

		self.socket.on('data', function(d) {
			self.totalBytes += d.length;
			
			for (var i in self.clients) {
				var res = self.clients[i];
				if (res) {
					res.write(d);
				}
			}
		});

		// start the flow of data, discarding it.
		// self.socket.resume();
		// self.socket = socket;
		// self.socket.unpipe();
		self.socket.pipe( self.pass );
	});
	
	this.totalData = 0;
	this.lastData = Date.now();

	clearInterval(this.bpsInterval);
	this.bpsInterval = setInterval( function() {
		self.emit('bps', 8*self.totalBytes);
		self.totalBytes = 0;
	}, 1000);

	this.initSocketFile();
};


Streamer.prototype.initSocketFile = function() { 
	
	var self = this;

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

	if (this.stream) {
		console.log('[live_streamer.js : stop] deleting stream');
		this.stream.removeAllListeners();
		this.stream.unpipe();
		this.stream.end();
	}
	if (this.pass) {
		console.log('[live_streamer.js : stop] deleting pass');
		this.pass.removeAllListeners();
		this.pass.unpipe();
		this.pass.end();
	}
	if (this.sink) {
		console.log('[live_streamer.js : stop] deleting sink');
		this.sink.removeAllListeners();
		this.sink.end();
	}
	if (this.socket) {
		console.log('[live_streamer.js : stop] deleting socket');
		this.socket.removeAllListeners();
		this.socket.unpipe();
		this.socket.destroy();
	}
	this.server.close();

	clearInterval( this.bpsInterval );
};


Streamer.prototype.pipe = function(res) {
	var self = this;

	this.clients.push(res);

	res.on('close', function() {
		var idx = self.clients.lastIndexOf( res );
		if (idx >= 0) {
			self.clients.splice( idx, 1 );
		}
	});

	// var self = this;
	// this.stream.pipe(res);
	// res.on('close', function() {	
	// 	console.log('[live_streamer.js : pipe] closed connection');
	// 	self.stream.unpipe(res);
	// });
};


Streamer.prototype.refreshStream = function() {

	this.createSink();
	this.createPass();
	this.createStream();
	this.initServer();
};


Streamer.prototype.createSink = function() {

	if (this.sink) {
		console.error('[sink exists] creating new sink');
		this.sink.removeAllListeners();
		this.sink.end();
		delete this.skink;
	}

	this.sink = new Stream.Writable({
		// highWaterMark: '128kb'
	});
	// this.sink.on('error', function(err) {
	// 	console.log('sink error');
	// 	console.log(err);
	// });
	this.sink._write = function (chunk, enc, next) {
		next();
	};
};


Streamer.prototype.createPass = function() {

	if (this.pass) {
		console.error('[deleting existing passthrough]');
		this.pass.unpipe();
		this.pass.removeAllListeners();
		this.pass.end();
		delete this.pass;
	}

	this.pass = new Stream.PassThrough({
		// highWaterMark: '128kb'
	});
	// this.pass.on('error', function(err) {
	// 	console.log('passthrough error');
	// 	console.log(err);
	// });
};


Streamer.prototype.createStream = function() {
	
	var self = this;

	console.info('=======================');
	console.info('-- creating streamTs --');
	console.info('-- ' + self.pipeFile + '--');
	console.info('=======================');

	if (this.stream) {
		this.stream.removeAllListeners();
		this.stream.unpipe();
		this.stream.end();
		delete this.stream;
	}
	// var timer = Date.now();

	// return;
	this.stream = new Stream.PassThrough({
		// highWaterMark: '128kb'
	});

	// this.pass.on('data', function() {
	// 	// console.log('...');
	// 	timer = Date.now();
	// });

	try {
		// this.pass.unpipe();
		// this.stream.unpipe();
		this.pass.pipe( self.stream ).pipe( self.sink );
		// this.pass.pipe( self.stream );
	} catch(err) {
		console.error('[live_stream.js] piping error');
		console.error( err );
	}
};

module.exports = Streamer;
