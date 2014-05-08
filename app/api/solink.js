var SolinkServer = require('../controllers/solink_server.js');

var solink = new SolinkServer( process.env['BASE_FOLDER'] + '/solink_server.db');

module.exports.getDevice = function(req, res){
	solink.getStatus(function(err, body){
		console.log(err);
		console.log(body);
		console.log("returning response status 200")
		if ( err == null){
			res.json(200, body);
		}else{
			if (err.code === "ESOCKETTIMEDOUT" || err.code === "ETIMEDOUT"){
				res.json(200, body);
			}else{
				res.json(500, err);	
			}
		}
	});
};

module.exports.registerDevice = function(req, res){
	// grab the host parameter from the request
	var host = req.body.host;
	console.log(host);
	solink.register(host, function(err, body){
		if (err){
			res.status(500).json(err);
		}else{
			res.status(200).json(body);
		}
	});

	// return success
};
