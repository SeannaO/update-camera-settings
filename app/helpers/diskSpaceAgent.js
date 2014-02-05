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
			self.check();
		}, 1*60*1000
	);
};


DiskSpaceAgent.prototype.check = function() {

	var self = this;
	
	/*
	// !!! du -c is for development only
	var df = exec('du -cm ' + self.folder + ' |grep total' , function(error, stdout, stderr) {	
		if (!error) {
			stdout = stdout.split(/\s+/);
			var total = parseInt( stdout );
			self.emit('disk_usage', total);
		}
	});
	*/
	
	var df = exec('df -h ' + self.folder + ' |grep /', function(error, stdout, stderr) {	
		
		if (!error) {
			stdout = stdout.split(/\s+/);
			var usage;
			for (var i in stdout) {
				if ( stdout[i].indexOf('%') > -1 ) {
					usage = parseFloat( stdout[i] );
				}
			}
			if( usage ) {
				self.emit('disk_usage', usage);
			}
		} else {

			console.error( error );
		}
	});
};


module.exports = DiskSpaceAgent;
