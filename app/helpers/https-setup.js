'use strict';

var https    = require('https');
var pem      = require('pem');
var socketio = require('socket.io');

var socketioAuth = require('./socket.io-auth');

exports.setup = function(app, auth, cb ) {

	pem.createCertificate({days: 365 * 10, selfSigned: true}, function(err, keys) {
		
		var server = https.createServer({
			key:   keys.serviceKey,
			cert:  keys.certificate
		}, app);

		var io = socketio.listen(server);

		socketioAuth.setAuth( io, auth );

		cb( server, io );
	});
};

