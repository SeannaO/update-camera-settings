var spawn = require('child_process').spawn;
var EventEmitter = require('events').EventEmitter;
var util = require('util');


function Diskstat( options ) {

	options = options || {};
	this.development = options.development;

	this.iostatProcess = -1;

	this.headers = [];
	this.devices = {};
}

util.inherits(Diskstat, EventEmitter);


Diskstat.prototype.stop = function() {

	this.iostatProcess.kill('SIGHUP');
};


Diskstat.prototype.launch = function() {

	var self = this;

	// if ( !this.development ) {
		this.iostatProcess = spawn('iostat', ['-x', '1']);
	// } else {
		// this.iostatProcess = spawn('./helpers/fakestat.sh');
	// }

	this.iostatProcess.stdout.on('data', function(data) {

		data = data.toString();
		data = data.split('\n');

		for (var line in data) {
			
			line = data[line];

			if (line.indexOf('sd') >= 0) {
				line = line.split(/\s+/);
				if (line[0] === '') line.shift();
				self.updateInfo( line );
			}

			else if (line.indexOf('device') >= 0) {
				line = line.split(/\s+/);
				if (line[0] === '') line.shift();
				self.headers = line;
			}
		}

		self.emit('hdd_throughput', self.devices );
	});
};


Diskstat.prototype.updateInfo = function( info ) {
	
	var self = this;

	this.devices[ info[0] ] = {};
	
	var device = this.devices[ info[0] ];

	for (var i in self.headers) {
		var attr = self.headers[i];
		device[ attr ] = info[i];
	}
};


module.exports = Diskstat;
