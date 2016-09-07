'use strict';

var path = require('path');
var fs = require('fs');

var all = {
    https_private_key: fs.readFileSync(path.join(process.cwd(), 'assets/solinkdirect.key')),
    https_public_key: fs.readFileSync(path.join(process.cwd(), 'assets/solinkdirect.cert')),
    https_ca_key: fs.readFileSync(path.join(process.cwd(), 'assets/solinkdirectca.crt')),

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

    listener: {
        url: process.env.LISTENER_URL || 'https://localhost:3000',
        username: process.env.LISTENER_URL || 'solink',
        password: process.env.LISTENER_URL || '_tcpdump_wrapper_'
    }
};

module.exports = all;
