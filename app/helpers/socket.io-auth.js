'use strict';

exports.setAuth = function(io, auth) {

	var localIp = process.env['IP'];

	io.configure(function (){
	  io.set('authorization', function (handshakeData, callback) {
		// extract the username and password from the handshakedata
		if (localIp !== handshakeData.address.address){
			console.log("XDomain SocketIO connection:" + JSON.stringify(handshakeData, null, 4));
			var re = /Basic (.+)/;
			var matches = re.exec(handshakeData.headers.authorization);
			if (matches && matches.length == 2){
				var buf = new Buffer(matches[1], 'base64');
				var credentials = buf.toString().split(":");

				if (credentials && credentials.length == 2){
					 auth(credentials[0],credentials[1], function(err, success){
						if (!err){
							console.log("successfully connected through socket.io");
						} else {
							console.error("socket.io auth error: ");
							console.error(err);
						}
						callback(err, success);
					});
				}
			} else if (handshakeData.query.username && handshakeData.query.password){
				console.log("unauthorized: Bad username and password");
				 auth(handshakeData.query.username,handshakeData.query.password, function(err, success){
					if (!err){
						console.log("successfully connected through socket.io");
					}
					callback(err, success);
				});
			} else{
				console.log("unauthorized: Specify username and password");
				callback("unauthorized: Specify username and password", false);
			}
		} else{
			callback(null, true);
		}
	  });
	});
};

