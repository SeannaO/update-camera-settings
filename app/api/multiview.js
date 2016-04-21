'use strict';

var Datastore = require('nedb');                          
var _ = require('lodash');
var MultiviewCameraGroups = require('../helpers/multiview-groups-generator.js');
var fs = require('fs');


module.exports = function( app, passport, db_file, camerasController ) {

	var db = new Datastore({ filename: db_file });
	db.loadDatabase( function(err) {
		if (err) { 
			console.error('[multiview]  ' + err); 
			console.error('[multiview]  removing file and creating blank db');
			fs.unlink(db_file, function() {
				db.loadDatabase();
			});
		}
	});

	app.get('/multiview/views', passport.authenticate('basic', {session: false}), function(req, res) {
		
		var cameras = camerasController.getCameras() || [];
		cameras = cameras.map( function(d) {
			return d.toJSON();
		});
		cameras = _.indexBy( cameras, '_id' );

		db.find({}, function(err, docs ) {
			if (err) {
				return res.status(500).json({error: err});
			}
			else if (!docs || !docs.length) {

				var groups = new MultiviewCameraGroups( cameras );
				res.json( appendCameraData(groups, cameras) );

			} else {
				res.json( appendCameraData(docs, cameras) );
			}
		});
	});

	app.put('/multiview/views', passport.authenticate('basic', {session: false}), function(req, res) {
		
		if (!req.body) {
			res.status(500).json({
				error: 'empty data'
			});
			return;
		}

		req.body.cameras = req.body.cameras || [];

		db.update( { group: req.body.group }, {
			$set: {
				cameras:  JSON.parse( req.body.cameras )
			}
		}, { 
			upsert: true 
		}, function(err, numReplaced) {
			if( err ) {
				res.status(500).json({
					error: err
				});
			} else if (numReplaced == 0) {
				res.status(500).json({
					error: 'no documents were updated'
				});
			} else {
				res.json( { success: true } );
			}
			db.loadDatabase();
		});
	});
};


var appendCameraData = function( views, cameras ) {

	for (var i in views ) {

		var group = views[i];
		if (!group) { continue; }

		group.cameras = _.isArray( group.cameras ) ? group.cameras : [];

		for (var k = group.cameras.length - 1; k >= 0; k--) {

			var cam = group.cameras[k];
			if (!cam) { continue; }

			if ( cameras[ cam.id ] ) {
				cam.data = _.pick( cameras[ cam.id ], [
					'_id',
					'name',
					'ip',
					'streams',
					'status',
					'manufacturer'
				]);
			} else {
				// exclude deleted camera from json respose
				group.cameras.splice(k, 1);
			}
		}
	}

	return views;
};
