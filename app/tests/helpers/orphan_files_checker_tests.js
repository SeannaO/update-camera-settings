var fs = require('fs');
var fse = require('fs-extra');

//
describe('OrphanFilesChecker', function() {
//
	var assert = require("assert");
	var sinon = require("sinon");

	var videosFolder = __dirname + '/../fixtures/orphan_files_check';
	fse.ensureDirSync(videosFolder + '/');

	var mp4Handler = require('../../controllers/mp4_controller');
	var CamerasController = require('../../controllers/cameras_controller.js');

	var db_file = __dirname + '/../fixtures/files/cam_db';
	var camerasController;
	var OrphanFilesChecker = require('../../helpers/orphanFiles.js');

	before( function(done) {
		camerasController = new CamerasController( mp4Handler, db_file, videosFolder, function() {
			clearInterval( camerasController.orphanFilesChecker.checkOrphanFilesInterval );
			done();
		});
	});

	after(function(done) {
		// fse.removeSync( videosFolder );
		done();
	});
//
	var orphanFilesChecker = new OrphanFilesChecker( camerasController );
	describe('constructor', function() {
		it('should point to camerasController', function() {
			// assert.ok( !!orphanFilesChecker.camerasController );
		});
	});
});
