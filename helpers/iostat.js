var spawn = require('child_process').spawn;
var EventEmitter = require('events').EventEmitter;
var util = require('util');


function Iostat() {

	console.log("- - - cpu usage module - - -");
	this.iostatProcess = -1;
}

util.inherits(Iostat, EventEmitter);

Iostat.prototype.stop = function() {

	this.iostatProcess.kill('SIGHUP');
};


Iostat.prototype.launch = function() {

	var self = this;

	this.iostatProcess = spawn('iostat', ['1']);

	this.iostatProcess.stdout.on('data', function(data) {

		data = data.toString();

		if (!self.devices) {	

			self.devices = data.split(/\s+/);
			if (self.devices[0] === '') self.devices.shift();

		} else if (!self.headers) {

			self.headers = data.split(/\s+/);
			if (self.headers[0] === '') self.headers.shift();

		} else {

			var values = data.split(/\s+/);
			if (values[0] === '') values.shift();

			var cpuIndex = self.devices.indexOf('cpu');
			var cpuValuesIndex = 3 * cpuIndex;
			var cpuValues = values.slice(cpuValuesIndex, cpuValuesIndex + 3);

			var usage = 100 - parseFloat(cpuValues[2]);
			if ( !isNaN( usage ) ) {
				self.emit('cpu_load', {
					usage: usage
				});
			}
		}
	});
};


module.exports = Iostat;
