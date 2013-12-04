var exec = require('child_process').exec;
var EventEmitter = require('events').EventEmitter;
var util = require('util');


var DiskSpaceAgent = function( folder ) {
	
	this.folder = folder;
	this.process = -1;
};

util.inherits(DiskSpaceAgent, EventEmitter);


DiskSpaceAgent.prototype.launch = function() {

	var self = this;

	self.process = setInterval( function() {

			console.log('checking disk space...');
			self.check();
		}, 1*5*1000
	);
};


DiskSpaceAgent.prototype.check = function() {

	var self = this;
	
	// !!! du -c is for development only
	// !!! on production, use du -s
	var df = exec('du -cm ' + self.folder + ' |grep total' , function(error, stdout, stderr) {
		if (!error) {
			stdout = stdout.split(/\s+/);
			var total = parseInt( stdout );
			self.emit('disk_usage', total);
		}
	});
};


module.exports = DiskSpaceAgent;
