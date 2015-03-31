var Stream = require('stream');
var fs = require('fs');
var net = require('net');
var events = require('events');
var util = require('util');

var MotionStreamer = function( pipeFile ) {

	this.pass;
	this.stream;
	this.pipeFile = pipeFile;
	this.server;
	
	this.refreshStream();
};

util.inherits(MotionStreamer, events.EventEmitter);

MotionStreamer.prototype.initServer = function() {

	var self = this;

	try {
		console.log('[motionStream initServer] closing server if already running');
		if (this.server) this.server.close();
	} catch(err) {
		console.log('[motionStream initServer] server not running');
	}	

	this.server = net.createServer( function(socket) {
		
		if (self.socket) {
			console.log('[motionStream .js] deleting socket');
			self.socket.removeAllListeners();
			self.socket.unpipe();
			self.socket.destroy();
		}
		self.socket = socket;
		
		self.socket.setNoDelay(true);

		self.socket.on('connection', function() {
			console.log('[socket] new connection');
		});

		self.socket.on('end', function() {
			try {
				self.socket.removeAllListeners();
				self.socket.destroy();
			} catch(err) {
				console.error('[socket] no method unpipe');
			}
			self.refreshStream();
		});

		self.socket.on('data', function(d) {
			// var msg = d.toString();
			// var matrix = msg.split(' ');
			// for (var i in d) {
			// 	console.log(d[i] + ' ');
			// }
			// console.log('\n');
			// console.log(d.toString().length);
			// console.log( d );
			d = d.toString();
			// console.log(d);
			var buffer = "";
			var i = 0;
			while ( d && i < d.length && d[i] !== '\0') {
				// buffer.push(d[i]);
				buffer += d[i];
				i++;
			};
			if (d && d[i] === '\0') {
				// console.log(buffer.length);
				// console.log(buffer);
				self.emit('grid', buffer);
			} 			
		});
	});

	this.server.on('error', function(err) {
		console.error('[MotionStreamer]  ' + err);
	});

	
	this.initSocketFile();
};


MotionStreamer.prototype.initSocketFile = function() { 
	
	var self = this;

	fs.exists(this.pipeFile, function(exists) {

		try {
			if (exists) fs.unlinkSync(self.pipeFile);
		} catch(err) {
			console.error("[motionStream ]  attempt to delete unexistent unix socket file");	
		}
		self.server.listen(self.pipeFile);
	});
};


MotionStreamer.prototype.stop = function() {

	if (this.socket) {
		console.log('[motionStream .js : stop] deleting socket');
		this.socket.removeAllListeners();
		this.socket.unpipe();
		this.socket.destroy();
	}

	try {
		this.server.close();
	} catch(err) {
		console.error('[MotionStreamer.stop]  ' + err);
	}
};


MotionStreamer.prototype.refreshStream = function() {

	this.initServer();
};

module.exports = MotionStreamer;
