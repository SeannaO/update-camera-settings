var scan = require('../helpers/camera_scanner/scanner.js').scan;

module.exports = function( app, passport, prefix ) {
	
	app.get('/scan.json', passport.authenticate('basic', {session: false}), function( req, res ) {
		scan(prefix, function( camlist ) {
			console.log('camera scanner: ');
			console.log( camlist );
			res.json( camlist );
		});
	});

	// - - -
	// checks if stream is h264 encoded
	app.get('/check_h264.json', passport.authenticate('basic', {session: false}), function(req, res) {

		var checkH264 = require('../helpers/ffmpeg.js').checkH264;
		checkH264('http://localhost:1234', function(isH264) { 
			res.json({ h264: isH264 });
		});		
	});
	// - - -

};



