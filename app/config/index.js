'use strict';

var fs = require('fs');

var all = {

  https_private_key: fs.readFileSync(process.cwd() + '/assets/private.pem'),
  https_public_key: fs.readFileSync(process.cwd() + '/assets/public.pem'),

	http_ports: {
		main: process.env.HTTP_PORT || 9080,
		secondary: [
			4001,
			4002,
			4003,
			4004
		]
	},

	// HTTPS does not have multiple ports for now
	https_ports: {
		main: process.env.PORT || 8080
	},
};

module.exports = all;
