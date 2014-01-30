// var assert = require("assert");
// var sinon = require("sinon");

// var fs = require('fs');

// var FileBackup = require('../helpers/file_backup.js');

// var backup_file_fixture = __dirname + '/fixtures/files/cam_idx.sqlite'

// describe('FileBackup', function(){
// 	describe('.setup', function(){
// 	    it('should index the backups in memory', function(done){
// 	    	var backup = new FileBackup( backup_file_fixture);
// 	    	var expected_backups = [ { name: 'cam_idx.sqlite_1390849671269.backup', time: 1390849671269 },
// { name: 'cam_idx.sqlite_1390849971274.backup',time: 1390849971274 } ];
// 			backup.setup(function(actual_backups){
// 				assert(actual_backups.length > 0);
// 				for (var idx in actual_backups){
// 					assert.deepEqual(actual_backups[idx], expected_backups[idx]);
// 				}
// 				done();
// 			});
// 	    })
// 	});

// 	describe(".launch and .stop", function(){
// 		it("launches the purgeProcess", function(done){
// 			var backup = new FileBackup( backup_file_fixture);
// 				assert(!backup.isRunning());
// 				backup.launch();
// 				assert(backup.isRunning());
// 				backup.stop();
// 				done();
// 		});
// 	});	
// });
