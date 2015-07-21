'use strict';

var winston           = require('winston');
var express           = require('express');                          // express
var request           = require('request');                          // request
var moment            = require('moment');
var tsHandler         = require('./helpers/ts');                     // ts abstraction
var hlsHandler        = require('./controllers/hls_controller');     // hls abstraction
var CamerasController = require('./controllers/cameras_controller'); // cameras controller
var fs                = require('fs');                               // for sending files
var DiskSpaceAgent    = require('./helpers/diskSpaceAgent.js');      // agent that periodically checks disk space

var passport          = require('passport');
var BasicStrategy     = require('passport-http').BasicStrategy;
var MemoryMonitors    = require('./services/memory-monitors.js');

var Trash           = require('./helpers/trash.js');
var portChecker     = require('./helpers/port_checker.js');
var scannerNotifier = require('./helpers/camera_scanner/scanner.js').emitter;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

portChecker.check(8080, function(err, found) {

	// exits app if port 8080 is already being used
	if (err || found) { 
		if(err)  {
			console.error('ERROR: ' + err);
		} else {
			console.error('ERROR: port 8080 is already being used');
		}
		process.exit(1);
	}
	//
	console.log('launching app...');

	var self = this;

	// launch node memory monitor
	// exit process if using more than 30% of memory
	MemoryMonitors.launchNodeMemMonitor( 30 );

	// launch thumbnailer and rtsp_grabber
	require('./services/thumbnailer').launch();
	require('./services/rtspGrabber').launch( function() {
		camerasController.simplyRestartRecording();
	});


	var logger = new (winston.Logger)({
		transports: [

			new (winston.transports.Console)({
				'timestamp':true, 
				colorize: true, 
				handleExceptions: true
			}),

			new (winston.transports.File)({
				timestamp:			true, 
				colorize: 			true, 
				handleExceptions: 	true,
				filename: 			'logs/vms_messages_.log',
				maxsize: 			5 * 1024 * 1024,
				maxFiles: 			20,
				json: 				false
			})			
		]
	});


	var error_logger = new (winston.Logger)({
		transports: [

			new (winston.transports.Console)({
				'timestamp':       true,
				colorize:          true,
				handleExceptions:  true
			}),

			new (winston.transports.File)({
				timestamp:			true, 
				colorize: 			true, 
				handleExceptions: 	true,
				filename: 			"logs/vms_errors_.log",
				maxsize: 			5 * 1024 * 1024,
				maxFiles: 			20,
				json:				false
			})			
		]
	});


	console.log = function(msg) {
		logger.info(msg);
	};
	console.error = function(msg) {
		error_logger.error(msg);
	};

	// - - -
	// stores machine ip
	var localIp = "";
	var hostname = require('os').hostname();
	var ipModule = require('ip');

	process.env['IP'] = ipModule.address();
	localIp = process.env['IP'];

	setInterval( function() {
		var ip = ipModule.address();
		if (process.env['IP'] !== ip) {
			console.error('IP changed; restarting...');
			process.exit();
		}
	}, 10000);
	// - - -
	//

	////
	var lifelineAuthentication = function(username,password, done){
		var ok = ( username === 'local-solink' && password === '__connect__' );
		return done(null, ok);
	};

	passport.use(new BasicStrategy( function(username,password,done){
					
			// bypasses auth for development mode
			if (process.env['NODE_ENV'] === 'development') {
				process.nextTick(function() {
					
					// stores lifeline auth in memory for later usage
					process.env['USER'] = username;
					process.env['PASSWORD'] = password;

					return done( null, true );
				});	
				return;
			}
			process.nextTick(function(){
				lifelineAuthentication(username,password, done);
			});
		})
	);

	var logrequest = function(req, res, next) {
		var auth_user = "";
		if (req.headers.authorization){
			var rx = /Basic ([A-Za-z0-9=]+)/;
			var matches = rx.exec(req.headers.authorization);
			if (matches){
				var buf = new Buffer(matches[1], 'base64');
				auth_user = buf.toString().split(":")[0];
			}
		}
		
		logger.info("[" + auth_user + "] " + req.method + " " + req.url);
		if (req.params){
			logger.info("Params: " + JSON.stringify(req.params, null, 4) );
		}
		if (req.body && Object.keys(req.body).length > 0){
			logger.info("Body: " + JSON.stringify(req.body, null, 4));
		}
		next(); // Passing the request to the next handler in the stack.
	};

	// starts express
	var app = express();

	// - - -
	// socket.io config 
	var io = require('socket.io');

	var server = require('http').createServer(app);
	io = io.listen(server);
	io.set('log level', 1);


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
					lifelineAuthentication(credentials[0],credentials[1], function(err, success){
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
				lifelineAuthentication(handshakeData.query.username,handshakeData.query.password, function(err, success){
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

	// end of socket.io config
	// - - -

	app.configure(function() {
		app.use(express.compress());
		app.use(express.static('public'));
		app.use(express.cookieParser());				// cookies middleware
		// - - - -
		// express config
		app.use(express.bodyParser());  // middleware for parsing request body contents
									// this must come before app.all
		app.use(express.session({secret: 'solink'}));	// for session storage
		app.use(passport.initialize());
		//app.use(passport.session());
		app.use(express.logger());  
		app.use(logrequest);
		app.use(app.router);
		//app.use(passport.initialize());
		app.set('view engine', 'ejs');					// rendering engine (like erb)
		// - - -  
	});


	// - - - - -
	// sets base folder from the command line
	// usage:  node app.js /my/folder
	var baseFolder;

	if ( process.argv.length > 2 ) {
		baseFolder = process.argv[2];
		if ( baseFolder.slice(-1) === '/' ) {
			baseFolder = baseFolder.substr(0, baseFolder.length-1);
		}
		console.log('* * * baseFolder: ' + baseFolder);
		if ( !fs.existsSync( baseFolder ) ) {
			console.log('the folder ' + baseFolder + ' doesn\'t exist; create that folder before starting the server');
			process.exit();
		}
	} else {
		console.log('you need to provide a base folder where the files are going to be stored');
		process.exit();
	}
	// - - -
	process.env['BASE_FOLDER'] = baseFolder;

	var trashFolder = baseFolder + '/trash';
	var trash = new Trash( trashFolder, 10 * 60 * 1000 );

	// - - - - -
	// sets environment mode 
	// -production by default...
	// ... or -development
	// usage:	node app.js /my/folder -development
	//			node app.js /my/foder		(production by default)
	if ( process.env['NODE_ENV'] === 'development' || process.argv.indexOf('-development') > -1 ) {
		process.env['NODE_ENV'] = 'development';
		console.log("*** development mode");
	} else {
		console.log("*** production mode");
	}
	// - - -


	// instantiates camerasController, launching all cameras
	var camerasController = new CamerasController( baseFolder + '/cam_db', baseFolder);


	app.all('/*', function(req, res, next) {
	  res.header("Access-Control-Allow-Origin", "*");
	  res.header("Access-Control-Allow-Headers", "X-Requested-With");
	  next();
	});


	// - - - - -
	// disk space agent
	//
	var usageThreshold = 90; // usage threshold (%) // 

	var diskSpaceAgent = new DiskSpaceAgent( baseFolder );
	diskSpaceAgent.launch();
	diskSpaceAgent.on('disk_usage', function(usage) {

		if (usage > usageThreshold) {	// usage in %
			var cameras = camerasController.getAllCameras();
			var nStreams = 0;
			for (var i in cameras) {
				nStreams += Object.keys(cameras[i].streams).length;
			}
			
			console.log( "hdd usage: " + usage + "%");
			console.log('[diskSpaceAgent]  freeing disk space... ');
			camerasController.deleteOldestChunks( 50 * nStreams, function(data) {
				// console.log(data);
			});
		}
	});
	// - - -

	// - - - - -
	// health check modules
	// require('./controllers/health.js')( io );
	// - - -


	// - - - -
	// socket.io broadcasts setup
	camerasController.on('new_chunk', function( data ) {
		//console.log("[new_chunk] " + JSON.stringify(data, null, 4));
		io.sockets.emit( 'newChunk', data );	
	});

	camerasController.on('new_thumb', function( data ) {
		//console.log("[new_thumb] " + JSON.stringify(data, null, 4));
		io.sockets.emit( 'newThumb', data );	
	});

	camerasController.on('motion', function( data ) {
		//console.log("Emitting Motion Data: " + JSON.stringify(data, null, 4) );
		io.sockets.emit( 'motion', data );
	});

	camerasController.on('motionEvent', function( data ) {
		//console.log("Emitting Motion Event: " + JSON.stringify(data, null, 4) );
		io.sockets.emit( 'motion', data );
	});

	camerasController.on('motion_update', function(data) {
		io.sockets.emit( 'cameraUpdated', data.camera );
	});
	camerasController.on('schedule_update', function(data) {
		io.sockets.emit( 'cameraUpdated', data );
	});
	camerasController.on('create', function(data) {
		io.sockets.emit( 'cameraCreated', data);
	});
	camerasController.on('update', function(data) {
		io.sockets.emit( 'cameraUpdated', data);
	});
	camerasController.on('delete', function(data) {
		io.sockets.emit( 'cameraRemoved', data);
	});

	camerasController.on('camera_status', function( data ) {
		if (data.status === "disconnected" || data.status === "offline"){
			console.error("[camera_status] " + data.cam_id + " : " + data.stream_id + " is " + data.status);
		}
		io.sockets.emit( 'cameraStatus', data );
	});

	camerasController.on('bps', function( data ) {
		io.sockets.emit('bps', data);
	});

	camerasController.on('grid', function( data ) {
		io.of('/motion_grid').emit('grid', data);
	});

	scannerNotifier.on('status', function(data) {
		io.sockets.emit('scanner_status', data);
	});
	scannerNotifier.on('camera', function(data) {
		io.sockets.emit('scanner_cam', data);
	});
	scannerNotifier.on('progress', function(data) {
		io.sockets.emit('scanner_progress', data);
	});
	
	setInterval( function() {
		var d = new Date();

		var unixTime = Date.now();
		var time = moment().format('HH:mm:ss');
		var tz_offset = d.getTimezoneOffset()/60;

		io.sockets.emit( 'time', {
			unix:       unixTime,
			string:     time,
			tz_offset:  tz_offset
		});
	}, 1000);
	// end of socket.io broadcasts setup
	// - - -

	// - - - -
	// scheduler setup
	var Scheduler = require('./helpers/scheduler.js');
	var scheduler = new Scheduler(5000);
	setTimeout(function(){
		scheduler.launchForAllCameras(camerasController.getCameras());
	}, 10000);

	scheduler.setupListeners( camerasController );
	// - - -


	// - - -
	// static files
	app.use('/css', express.static(__dirname + '/assets/css'));
	app.use('/js', express.static(__dirname + '/assets/js'));
	app.use('/img', express.static(__dirname + '/assets/img',   { maxAge: 3600 * 1000 } ));
	app.use('/swf', express.static(__dirname + '/assets/swf',   { maxAge: 3600 * 1000 } ));
	app.use('/fonts', express.static(__dirname + '/assets/fonts', { maxAge: 3600 * 1000 } ));
	app.use(express.static(__dirname + '/assets/public'));
	// end of static files
	// - - -


	// - - -
	// API
	require('./api/cameras.js')( app, passport, camerasController );			// cameras
	require('./api/device.js')( app, passport );								// device

	require('./api/scanner.js')( app, io, passport );								// scanner

	app.get('/health', passport.authenticate('basic', {session: false}), function(req, res) {							// health
		res.sendfile(__dirname + '/views/health.html');
	});

	app.get('/', function (req, res) {								// main page
		loginAndSendFile( req, res, __dirname + '/views/cameras.html');
	});
	app.get('/cameras', function(req, res) {
		loginAndSendFile(req, res, __dirname + '/views/cameras.html');			// main page - alternative route
	});


	// - - - - -
	// login
	var loginAndSendFile = function(req, res, file) {
		var auth = req.headers.authorization || ' ';
		var tmp = auth.split(' ');   

		var buf = new Buffer(tmp[1], 'base64'); 
		var plain_auth = buf.toString();        
		buf = null;

		var creds = plain_auth.split(':');      
		var username = creds[0];
		var password = creds[1];

		lifelineAuthentication( username, password, function(err, ok) {
			if (!err && ok) {
				res.status(200);
				res.sendfile(file);
			} else {
				res.status(401);
				res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
				res.sendfile(__dirname+'/views/unauthorized.html');
			}
		});
	};
	app.get('/logout', function (req, res) {								// main page
		req.headers.authorization = "logged out";
		res.status(401);
		res.end('logged out');
	});
	// login
	// - - - - -
	
	app.get('/not-supported', function(req, res) {
		res.sendfile(__dirname+'/views/not_supported.html');
	});


	app.get('/pos_monitor', passport.authenticate('basic', {session: false}), function(req, res) {
		var monitor_url = 'https://solink:_tcpdump_wrapper_@localhost:3000/instances';
		request({
			url: monitor_url,
			method: "GET",
			headers: {
				'User-Agent': 'nodejs'
			},
		}, function(error, response, body){
			res.end(body);
		});
	});


	app.get('/config', passport.authenticate('basic', {session: false}), function (req, res) {								// main page
		res.sendfile(__dirname + '/views/config.html');			
	});

	// - - -
	// gets ts segment
	// TODO: get authentication to work with HLS video tag
	app.get('/cameras/:cam_id/ts/:stream_id/:file', passport.authenticate('basic', {session: false}), function(req, res) {
	   
		var camId    = req.params.cam_id;
		var streamId = req.params.stream_id;
		var file     = req.params.file;

		console.info( file  );

		if (file !== 'live.ts') {
			tsHandler.deliverTsFile( camId, streamId, file, res );
		} else {
			camerasController.getCamera( camId, function(err, cam) {

				if (err) {
					console.error("[/cameras/:id/video.m3u8] :");
					console.error( err ) ;
					res.json( { error: err } );

				} else {
					// if no stream is not specified then just give the first stream
					if (!cam.streams[streamId]) {
						for (var s in cam.streams){
							streamId = s;
							break;
						}
					}
				}
				if (!cam.streams[streamId]) {
					res.end();
					return;
				}
				cam.streams[streamId].streamer.pipe(res);
			});
		}
	});
	// - - -


	// - - -
	// multicam mockup 
	app.get('/multiview', passport.authenticate('basic', {session: false}), function(req, res) {    
		res.sendfile(__dirname + '/views/multi.html');
	});
	app.get('/investigator', passport.authenticate('basic', {session: false}), function(req, res) {    
		res.sendfile(__dirname + '/views/investigator.html');
	});
	// - - -


	var solink = require('./api/solink.js');

	app.get('/solink', passport.authenticate('basic', {session: false}), solink.getDevice);
	app.post('/solink', passport.authenticate('basic', {session: false}), solink.registerDevice);

	var sensors = require('./api/sensors.js');

	require('./api/multiview.js')( app, passport, baseFolder+'/multiview.db' );

	app.get('/cameras/:camera_id/sensors', function(req, res){
		sensors.getSensorData(baseFolder, req, res);
	});


	app.post('/reload', passport.authenticate('basic', {session: false}), function(req, res) {
		io.sockets.emit('reload');
	});


	// server.listen(process.env.PORT || 8080);
	server.listen( 8080 );
	var server2 = require('http').createServer(app).listen(4001);
	var server3 = require('http').createServer(app).listen(4002);
	var server4 = require('http').createServer(app).listen(4003);
	var server5 = require('http').createServer(app).listen(4004);
	
});
