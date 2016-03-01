'use strict';

var Datastore = require('nedb');                          
var MultiviewCameraGroups = require('../helpers/multiview-groups-generator.js');


module.exports = function( app, passport, db_file, camerasController ) {

	var db = new Datastore({ filename: db_file });
	db.loadDatabase();

	app.get('/multiview/views', passport.authenticate('basic', {session: false}), function(req, res) {
		
		db.find({}, function(err, docs ) {
			if (err) {
				return res.status(500).json({error: err});
			}
			else if (!docs || !docs.length) {

				var cameras = camerasController.getCameras() || [];
				cameras = cameras.map( function(item) {
					return item.toJSON();
				});

				var groups = new MultiviewCameraGroups( cameras );
				res.json( groups );

			} else {
				res.json(docs);
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
