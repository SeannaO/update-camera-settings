var fs = require('fs');
var find = require('../node_modules/findit');
var exec = require('child_process').exec;

var OrphanFilesChecker = function( camerasController ) {

	this.camerasController = camerasController;
};


OrphanFilesChecker.prototype.checkForOrphanCameras = function( cb ) {

	var baseFolder = process.env['BASE_FOLDER'];
	var reservedFiles = ['cam_db', 'trash', 'solink_server.db', 'multiview.db'];

	var self = this;

	fs.readdir( baseFolder, function(err, files) {
		
		if (err) {
			console.error('[orphanFiles]  error when reading cameras folder: ' + err);
		} else {
			for (var f in files) {

				if ( !self.camerasController.findCameraById( files[f] ) && reservedFiles.indexOf(files[f]) < 0 ) {
					console.info('[orphanFiles] moving camera ' + files[f] + ' to trash');
					try {
						var from = baseFolder + '/' + files[f];
						var to = baseFolder + '/trash';
						exec( 'mv ' + from + ' ' + to, function(error, stdout, stderr) {}); 
					} catch( err ) {
						console.error('[orphanFile]  error when moving camera folder to trash: ' + err);
					}
				} else if (self.camerasController.findCameraById( files[f] )) {
					self.checkForOrphanStreams( files[f] );
				}
			}
		}
	});
};


OrphanFilesChecker.prototype.checkForOrphanStreams = function( camId ) {

	var self = this;
	var baseFolder = process.env['BASE_FOLDER'];

	var cam = self.camerasController.findCameraById( camId );
	if (!cam || !cam.cam) {
		console.error('[orphanFiles] undefined camera: ' + camId);
		return;
	}

	cam = cam.cam;

	var camFolder = self.camerasController.videosFolder + '/' + camId;

	var sqliteRegex = /.sqlite/;

	fs.readdir( camFolder, function(err, files) {
		for (var f in files) {
			var streamId = files[f];
			var sql_file_match = sqliteRegex.exec( streamId );
			
			var should_be_deleted = !cam.streams || 
									( cam.streams.length === 0 ) || 
									( !sql_file_match && 
									  cam.streams && 
									  !cam.streams[streamId] &&
									  streamId !== 'backup' && 
									  streamId !== 'sensor');

			if ( should_be_deleted ) {			
				console.info( "\n[orphanFile]  moving stream " + streamId + " to trash folder because: \n");
				console.info( "\t!cam.streams: " + !cam.streams );
				console.info( "\tcam.streams.length: " + cam.streams.length );
				console.info( "\t!cam.streams[streamId]: " + !cam.streams[streamId] );
				console.info("---");
	
				var from = camFolder + '/' + streamId;
				var to = baseFolder + '/trash/';

				exec( 'mv ' + from + ' ' + to, function(error, stdout, stderr) {}); 
			}
		}
	});
};


OrphanFilesChecker.prototype.periodicallyCheckForOrphanFiles = function( periodicity ) {

	var self = this;

	console.log("*** checking for orphan files...");

	if (!periodicity) periodicity = 15 * 60 * 1000;

	clearInterval( this.checkOrphanFilesInterval );

	this.checkOrphanFilesInterval = setInterval( function() {
		self.checkForOrphanCameras();
	}, periodicity);

};


module.exports = OrphanFilesChecker;
