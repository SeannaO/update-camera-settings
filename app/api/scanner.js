var scan = require('../helpers/camera_scanner/scanner.js').scan;

module.exports = function( app, passport, prefix ) {
	
	app.get('/scan.json', passport.authenticate('basic', {session: false}), function( req, res ) {
		scan(prefix, function( camlist ) {
			console.log('camera scanner: ');
			console.log( camlist );
			res.json( camlist );
		});
	});
};



