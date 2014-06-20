var fs = require('fs');
var exec = require('child_process').exec;

var Trash = function( path, interval ) {

	if (!path) {
		console.error('[trash]  invalid path');
		return 'invalid path';
	}

	this.path = path;

	console.log('[trash]  creating folder');
	try {
		fs.mkdirSync( path );
	} catch( err ) {
		console.error('[trash]  ' + err);
	}

	this.interval  = interval || 5*60*1000;

	this.periodicallyEmptyTrash();

};


Trash.prototype.periodicallyEmptyTrash = function() {

	var self = this;

	clearInterval( this.emptyTrashInterval );

	this.emptyTrashInterval = setInterval( function() {
		self.emptyTrash();
	}, self.interval);
};


Trash.prototype.emptyTrash = function() {
	console.log('[trash]  emptying trash folder: ' + this.path);
	
	var deleteProcess = exec('find ' + this.path + ' ! -name trash -delete');
	setTimeout( function() {
		deleteProcess.kill();
	}, 10000);
	
};


module.exports = Trash;
