'use strict';

var fs     = require('fs');
var path   = require('path');
var bcrypt = require('bcrypt');

var authFile    = path.resolve('./config/auth');
var defaultUser = 'solink-local';
var defaultPass = '__connect__';

var users = {};

var initUsersSync = function() {

	var fileExists = fs.existsSync( authFile );
	if (!fileExists) {
		console.error('[init authentication]  no auth file found; unsing default crentials');
		genDefaultUserSync();
		return;
	}
	
	var data = fs.readFileSync( authFile );
	if (!data) {
		console.error('[init authentication]  empty auth file; unsing default crentials');
		genDefaultUserSync();
		return;
	}

	try {
		data = data.toString(); 
		data = data.split('\n')[0];

		var creds = data.split(' ');
		var user = creds[0];
		var pass = creds[1];
	} catch( err ) {
		console.error('[init authentication]  invalid auth file; using default credentials  ', err);
		genDefaultUserSync();
		return;
	}

	if (!user || !pass) {
		console.error('[init authentication]  invalid auth file; using default credentials');
		genDefaultUserSync();
		return;
	}

	users[user] = pass;
};


var genDefaultUserSync = function() {
	users[defaultUser] = bcrypt.hashSync(defaultPass, 10);
};


var genHash = function(s, cb) {
	bcrypt.hash(s, 10, cb);
};


var auth = function(username, password, cb) {
	if (!users[username]) {
		cb( null, false);
		return;
	}

	bcrypt.compare( password, users[username], function(err, ok) {
		cb(err, ok);
	});
};

initUsersSync();

exports.auth = auth;
