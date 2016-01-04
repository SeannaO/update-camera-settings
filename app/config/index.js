'use strict';

var all = {

	http_ports: {
		main: process.env.PORT || 8080,
		secondary: [
			4001,
			4002,
			4003,
			4004
		]
	},

	// HTTPS does not have multiple ports for now
	https_ports: {
		main: process.env.HTTPS_PORT || 9080
	},
};

module.exports = all;
