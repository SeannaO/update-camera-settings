var winston = require('winston');
var path    = require('path');
var fse     = require('fs-extra');

/////
// basic configuration
//
var logs_path = './logs';

var maxsize  = 5*1024*1024;
var maxFiles = 10;

var messages_filename = 'vms_messages_';
var errors_filename   = 'vms_errors_';
/////

// make sure logs folder exists
fse.ensureDirSync( path.resolve(logs_path) );


var logger = new (winston.Logger)({
	transports: [

	new (winston.transports.Console)({
			'timestamp':       true,
			colorize:          true,
			handleExceptions:  true
		}),

		new (winston.transports.File)({
			timestamp:         true,
			colorize:          true,
			handleExceptions:  true,
			filename:          path.resolve( logs_path, messages_filename ),
			maxsize:           maxsize,
			maxFiles:          maxFiles,
			json:              false
		})			
	]
});


var error_logger = new (winston.Logger)({
	transports: [

	new (winston.transports.Console)({
			'timestamp':       true,
			colorize:          true,
			handleExceptions:  true
		}),

		new (winston.transports.File)({
			timestamp:         true,
			colorize:          true,
			handleExceptions:  true,
			filename:          path.resolve( logs_path, errors_filename ),
			maxsize:           maxsize,
			maxFiles:          maxFiles,
			json:              false
		})			
	]
});


console.log = function(msg) {
	logger.info(msg);
};
console.error = function(msg) {
	error_logger.error(msg);
};


exports.logger = logger;
