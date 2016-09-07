var btoa = require('btoa');
var proxy = require('express-http-proxy');
var config = require('../config');

module.exports = function (app) {
    app.use('/listener', proxy(config.listener.url, {
        timeout: 5000,  // in milliseconds
        decorateRequest: function (proxyReq, originalReq) {
            proxyReq.headers['authorization'] = 'Basic ' + btoa(config.listener.username+':'+config.listener.password);
            return proxyReq;
        }
    }));
};
