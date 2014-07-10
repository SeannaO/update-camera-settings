var Datastore          = require('nedb');                           // nedb datastore
var request = require('request');

// It seems that the mp4Handler should not be passed in as an argument. The mp4Handler is only used for taking snapshots and 
// this logic should be happening outside of the CamerasController, especially since it has request handling as part of it

function SolinkServer(filename, cb ) {

    var self = this;
    self.host = null;
    console.log(filename);
    self.db = new Datastore({ filename: filename, autoload: true });
	// self.db.loadDatabase( function( err ) {
	// 	if (err) {
	// 		console.error("[SolinkServer.setup]  error when loading database");
	// 		console.error( err );
	// 		cb(err);
	// 		return;
	// 	}
	// });

}

SolinkServer.prototype.getStatus = function(cb){
	var self = this;
	self.getHost(function(err, host){
		console.log(host);
		// Check if we have the ip address of the solink server stored
		if (host){
			console.log("getting the device ID");
			// grab the device information from lifeline
			var device_url = '';

			if (process.env['NODE_ENV'] === 'development') {
				device_url = 'https://192.168.215.136/cp/SystemInfo?v=2';
			} else {
				device_url = 'https://localhost/cp/SystemInfo?v=2';
			}

			request({ 
				method: 'GET',
				strictSSL: false,
				uri: device_url,
				timeout: 5000
				}, 
				function (error, response, body) {
					if (error){
						console.error("*** getStatus within SolinkServer: ");
						console.error( error ) ;
						console.error("* * *");
						cb(error, {host: host});
					}else{
						console.log(body);
						var device = JSON.parse(body);
						if (host){
							// send the post request to the server to add the nas device to solink
							var solink_url = "http://" + host + ":8800/api/Devices?deviceId=" + device.id;
							console.log(solink_url);
							request({ 
								method: 'GET',
								strictSSL: false,
								uri: solink_url,
								timeout: 5000
							}, function (error, response, body) {
								if (error){
									console.error("*** getStatus within SolinkServer: ");
									console.error( error ) ;
									console.error("* * *");
									cb(error, {host: host});
								}else{
									var server = JSON.parse(body);
									server.host = host;
									console.log(server);
									cb(error, server);
								}
							});
						}else{

						}
					}
				}
			);

		}else{
			console.log("returning that host is undefined.");
			// if we don't then return an error
			cb(null, {error: "host is undefined"});
		}
	});

};

SolinkServer.prototype.register = function(host, cb){
	// store the host name to a file
	var self = this;
	self.setHost(host, function(err, returned_host){
		
		if (err) {
			console.error("[SolinkServer]  error when inserting host: ");
			console.log(err);
			console.log(returned_host);
			cb( err);
		} else {

			// grab the device information from lifeline
			var device_url = '';

			if (process.env['NODE_ENV'] === 'development') {
				device_url = 'https://192.168.215.136/cp/SystemInfo?v=2';
			} else {
				device_url = 'https://localhost/cp/SystemInfo?v=2';
			}

			request({ 
				method: 'GET',
				strictSSL: false,
				uri: device_url,
				timeout: 5000
				}, 
				function (error, response, body) {
					var device = JSON.parse(body);
					if (error){
						console.error("*** register within SolinkServer: ");
						console.error( error ) ;
						console.error("* * *");
						cb(error, device);
					}else{
						console.log(device);
	
						if (returned_host){
							// send the post request to the server to add the nas device to solink
							var solink_url = "http://" + returned_host + ":8800/api/Devices";
							var form_data = {"DeviceId":device.id, "NvrSerial": device.signature, "OrgPath": device.name, "IpAddress": device.ip, "Username": "Administrator", "Password": "password"};
							
							console.log(solink_url);
							console.log(form_data);
							request({ 
								method: 'POST',
								strictSSL: false,
								uri: solink_url,
								timeout: 5000,
								form: form_data
							}, function (error, response, body) {
								if (error){
									console.error("*** register within SolinkServer: ");
									console.error( error ) ;
									console.error("* * *");
									cb(error, {host: returned_host});
								}else{
									var server = JSON.parse(body);
									server.host = returned_host;
									console.log(server);
									cb(error, server);
								}
							});
						}else{
							cb({error: "host not found"});
						}
					}
				}
			);
		}
	});
};

SolinkServer.prototype.setHost = function( newhost, cb ) {
    
	var self = this;
	self.getHost(function(err, oldhost){
		if (err){
			cb(err, null);
		}else{
			if (oldhost == null){
				// host doesn't exist so set it
				self.db.insert( {host: newhost}, function( err, newDoc ) {
					self.host = newDoc.host;
					cb(err, newDoc.host);
				});
			}else if (oldhost === newhost){
				// host is the same so just return immediately
				cb(null, oldhost);
			}else{
				// 
				self.db.update({ host: oldhost }, {$set:{ host: newhost}}, { multi: false }, function (err, numReplaced) {
					if (err) {
			            cb(err);
			        } else {
						if (numReplaced > 0){
							self.host = newhost;
							cb(null, newhost);
						}else{
							cb({error: "Unable to update host."}, null)
						}
					}
				});			
			}			
		}

	});
};

SolinkServer.prototype.getHost = function( cb ) {
    
	var self = this;
	console.log("getting host");
	console.log(self.host);
	if (self.host){
		console.log("returning cached host");
		cb(null, self.host);
	}else{

		self.db.find( {}, function( err, docs ) {
				if (err) {
					console.log(err);
					cb( err );
				} else {
					console.log(docs);
					console.log(docs.length)
					if (docs.length > 0){
						console.log(docs);
						self.host = docs[0].host;
						cb(null, docs[0].host);
					}else{
						cb();
					}
				}
		});
	}
};

module.exports = SolinkServer;
