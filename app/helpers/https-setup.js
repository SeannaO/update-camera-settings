'use strict';

var https = require('https');
var pem = require('pem');
var fs = require('fs');
var config = require('.././config');
var socketio = require('socket.io');

var socketioAuth = require('./socket.io-auth');

exports.setup = function(app, auth, cb) {
  var server = https.createServer({
    key: config.https_private_key,
    cert: config.https_public_key
  }, app);

  var io = socketio.listen(server);
  socketioAuth.setAuth(io, auth);
  console.log("Created HTTPS Server");
  cb(server, io);
};