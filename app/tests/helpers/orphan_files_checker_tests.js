var fs = require('fs');
var fse = require('fs-extra');

//
describe('OrphanFilesChecker', function() {
//
	var assert = require("assert");
	var sinon = require("sinon");

	var videosFolder = __dirname + '/../fixtures/orphan_files_check';

	var mp4Handler = require('../../controllers/mp4_controller');
	var CamerasController = require('../../controllers/cameras_controller.js');

	var db_file = __dirname + '/../fixtures/files/cam_db';
	var camerasController;
	var OrphanFilesChecker = require('../../helpers/orphanFiles.js');
	var orphanFilesChecker;

	before( function(done) {
		process.env['BASE_FOLDER'] = videosFolder;
		fse.ensureDirSync(videosFolder);
		camerasController = new CamerasController( mp4Handler, db_file, videosFolder, function() {
			clearInterval( camerasController.orphanFilesChecker.checkOrphanFilesInterval );
			orphanFilesChecker = new OrphanFilesChecker( camerasController );
			done();
		});
	});

	after(function(done) {
		fse.removeSync( videosFolder );
		done();
	});

	describe('constructor', function() {
		it('should point to camerasController', function() {
			// assert.ok( !!orphanFilesChecker.camerasController );
		});
		it('should not delete cam_db file', function(done) {
			fse.ensureFileSync(videosFolder + '/cam_db');
			orphanFilesChecker.checkForOrphanCameras();

			setTimeout( function() {
				fs.exists(videosFolder + '/cam_db', function(exists) {
					assert.ok(exists);
					done();
				});
			}, 1000);
			// assert.ok( !!orphanFilesChecker.camerasController );
		});
	});
});
