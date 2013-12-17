var scan = require('../helpers/camera_scanner/scanner.js').scan;

module.exports = function( app, prefix ) {
	
	app.get('/scan.json', function( req, res ) {
		scan(prefix, function( camlist ) {
			console.log('camera scanner: ');
			console.log( camlist );
			res.json( camlist );
		});
	});
};



