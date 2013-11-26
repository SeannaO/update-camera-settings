var exec = require('child_process').exec;
var EventEmitter = require('events').EventEmitter;
var util = require('util');

function Smart( options ) {
	
	options = options || {};

	this.development = options.development;

	var self = this;	
	this.hdds_list = [];
	this.status = {};

	this.scan( function() {
	});
}

util.inherits(Smart, EventEmitter);

Smart.prototype.start = function() {

	var self = this;


	this.checkProcess = setInterval( function() {

		for (var i in self.hdds_list) {
			self.check( self.hdds_list[i], function( hdd, status ) {
				self.emit('smart', {
					hdd: hdd,
					status: status
				});
			});
		}
	}, 5000);
};


Smart.prototype.stop = function() {

	clearInterval( this.checkProcess );
};


Smart.prototype.check = function(hdd, cb) {

	var self = this;

	var command = 'smartctl -a ' + hdd + '|awk \'/fail|age/ {print $0}\'';

	if (this.development) {
		command = './helpers/' + command;
	}

	exec( command, function(error, stdout, stderr) {

		if (!error) {
			var status = {};
			
			var separator = /\s+/;
			var output = stdout.split('\n');

			for (var i in output) {

				var parsedOutput = output[i].split( separator );

				if (parsedOutput.length === 10) {

					var attribute_name = parsedOutput[1];
					status[attribute_name] = {};
					status[attribute_name].value = parsedOutput[3];
					status[attribute_name].worst = parsedOutput[4];
					status[attribute_name].thresh = parsedOutput[5];
					status[attribute_name].type = parsedOutput[6];
					status[attribute_name].when_failed = parsedOutput[8];
					status[attribute_name].raw_value = parsedOutput[9];
				}
			}

			self.status[hdd] = status;

			cb( hdd, status );
		}
	});
};


Smart.prototype.addHdd = function( hdd ) {

	hdds_list.push( hdd );
};


Smart.prototype.scan = function( cb ) {

	var self = this;

	var command = 'smartctl --scan';
	if ( this.development ) {
		command = 'cat ./helpers/smartctl_scan';
	}

	exec( command, function(error, stdout, stderr) {
		
		console.log(stdout);
		console.log(error);
		console.log(command);

		if (!error) {

			this.status = [];
			
			var separator = /\s+/;
			var output = stdout.split('\n');

			for (var i in output) {

				var parsedOutput = output[i].split( separator );
				
				if (parsedOutput.length > 1) {
					self.hdds_list.push( parsedOutput[0] );
				}
			}
		}

		cb();
	});
};


module.exports = Smart;


