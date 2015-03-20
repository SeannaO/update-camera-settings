var http = require('http');

var createServer = function( cb ) {

	return http.createServer( function( req, res ) {

		var body = '';
		if (cb) cb( req, res );

	});
};

module.exports = createServer;
