'use strict';

var path = require('path');
var fs = require('fs');

var all = {

    https_private_key: fs.readFileSync(path.join(process.cwd(), 'assets/solinkdirect.key')),
    https_public_key: fs.readFileSync(path.join(process.cwd(), 'assets/solinkdirect.cert')),
    https_ca_key: fs.readFileSync(path.join(process.cwd(), 'assets/solinkdirectca.crt')),

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
