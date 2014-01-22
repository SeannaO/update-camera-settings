var fs = require('fs');
var find = require('../node_modules/findit');

var OrphanFilesChecker = function( camerasController ) {
	
	this.camerasController = camerasController;
};


OrphanFilesChecker.prototype.recursiveDeleteFiles = function(folder, cb) {
	
	var finder = find( folder );

	var counter = 0;

	var stopTimeout = setTimeout( function() {
		
		if( cb ) cb();
		if (finder) finder.stop();
	}, 15000);

	finder.on('path', function(dir, stat) {

		if (stat.isDirectory() ) {
			fs.rmdir(dir, function(err) {
				if (err) {
				} else {
					console.log( '*** orphan folder deleted: ' + dir );
					counter++;
				}
			});
		}
		else if ( stat.isFile() ) {
			fs.unlink(dir, function(err) {
				if (err) {
				} else {
					console.log( '*** orphan file deleted: ' + dir );
					counter++;
				}
			});
		}
		
		if (counter > 50) {
			if( cb ) cb();
			clearInterval( stopTimeout );
			finder.stop();
		}
	});
};


OrphanFilesChecker.prototype.checkForOrphanCameras = function( cb ) {
	
	var self = this;

	fs.readdir( process.env['BASE_FOLDER'], function(err, files) {
		
		var found = false;

		if (err) {
			cb ( false );
			return;
		} else {
			for (var f in files) {

				if ( !self.camerasController.findCameraById( files[f] ) && files[f] !== "cam_db" ) {
					self.recursiveDeleteFiles( process.env['BASE_FOLDER'] + '/' + files[f], function() {
						if (cb) {
							cb(true);
						}
					});
					return;
				}
			}
		}
	
		if (cb) {
			cb( false );
		}
	});
};


OrphanFilesChecker.prototype.checkForOrphanStreams = function( folders, cb ) {

	var self = this;

	if (folders.length === 0) {
		if (cb) cb();
		return;
	}

	var camId = folders.shift();
	var cam = self.camerasController.findCameraById( camId );

	if ( !cam || !cam.cam) {
		self.checkForOrphanStreams( folders, cb );
		return;
	}

	cam = cam.cam;

	var camFolder = process.env['BASE_FOLDER'] + '/' + camId;

	var sqliteRegex = /.sqlite$/;

	fs.readdir( camFolder, function(err, files) {
		for (var f in files) {
			var streamId = files[f];
			var sql_file_match = sqliteRegex.exec( streamId );

			var should_be_deleted = !cam.streams || 
									( cam.streams.length === 0 ) || 
									( !sql_file_match && 
									  cam.streams && 
									  !cam.streams[streamId] &&
									  streamId !== 'backup');

			if ( should_be_deleted ) {			
				var streamFolder = camFolder + '/' + streamId;
				self.recursiveDeleteFiles( streamFolder, function() {
					if (cb) {
						cb( true );
					}
				});
				return;
			}
		}
		
		self.checkForOrphanStreams( folders, cb );
	});
};

OrphanFilesChecker.prototype.periodicallyCheckForOrphanFiles = function( periodicity ) {

	var self = this;

	console.log("*** checking for orphan files...");

	if (!periodicity) periodicity = 15 * 60 * 1000;
	
	self.checkForOrphanCameras( function( found ) {
		if (found) {
			clearTimeout( self.checkTimeout );
			self.checkTimeout = setTimeout( function() {
				self.periodicallyCheckForOrphanFiles( periodicity );
			}, periodicity);
		} else {
			fs.readdir( process.env['BASE_FOLDER'], function(err, files) {
				self.checkForOrphanStreams( files, function( found ) {
					clearTimeout( self.checkTimeout );
					self.checkTimeout = setTimeout( function() {
						self.periodicallyCheckForOrphanFiles( periodicity );
					}, periodicity);
				});
			});
		}		
	});
};

module.exports = OrphanFilesChecker;
