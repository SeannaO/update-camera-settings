//require('look').start(); // -- profiler ( NOT for production )
// var agent          = require('webkit-devtools-agent');
var winston           = require('winston');
var express           = require('express');                          // express
var request           = require('request');                          // request
var moment            = require('moment');
var tsHandler         = require('./helpers/ts');                     // ts abstraction
var hlsHandler        = require('./controllers/hls_controller');     // hls abstraction
var mp4Handler        = require('./controllers/mp4_controller');     // mp4 abstraction
var CamerasController = require('./controllers/cameras_controller'); // cameras controller
var fs                = require('fs');                               // for sending files
var DiskSpaceAgent    = require('./helpers/diskSpaceAgent.js');      // agent that periodically checks disk space

var passport          = require('passport');
var BasicStrategy     = require('passport-http').BasicStrategy;
var authCache = {};

var Trash = require('./helpers/trash.js');

// - - -
// kills any ffmpeg, iostat and smartctl processes that might be already running
var exec  = require('child_process').exec;
var spawn = require('child_process').spawn;

var portChecker = require('./helpers/port_checker.js');

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
	exec('killall -9 iostat', function( error, stdout, stderr) {});
	exec('killall -9 smartctl', function( error, stdout, stderr) {});
	// - - 

	var self = this;

	// launches cpulimit to control svcd process
	exec('killall -9 cpulimit', function( error, stdout, stderr) {
		exec('./cpulimit -l20 -p `pgrep svcd`', function( error, stdout, stderr ) {
			console.log('*** launching cpulimit');
		});
	});

	// monitor memory usage of rtsp_grabber
	// kills rtsp_grabber if memory usage is greater than 20%
	self.rtspMemMonitor = spawn('./mem.sh', ['rtsp_grabber', '20']);
	self.rtspMemMonitor.stderr.on('data', function(data) {
		console.error('[app] rtsp_grabber is getting memory hungry');
	});

	// monitor node memory usage
	// kills node if memory usage is greater than 30%
	self.nodeMemMonitor = exec('./mem_pid.sh '+ process.pid +' 30');
	self.nodeMemMonitor.stderr.on('data', function(data) {
		console.error('[app] node is getting memory hungry');
		console.error(data);
	});


	// launches custom ffmpeg
	console.log('[app] launching rtsp_grabber');
	this.launchRtspGrabber = function( cb ) {
		exec('killall -9 rtsp_grabber', function( error, stdout, stderr) {

			if (self.grabberProcess) {
				self.grabberProcess.removeAllListeners();
			}

			self.grabberProcess = spawn('./rtsp_grabber');
			self.grabberProcess.once('exit', function(code) {

				console.error('[app] rtsp_grabber exited; relaunching...');
				self.launchRtspGrabber();
				console.log('[app] rtsp_grabber relaunched'); 

				clearTimeout(self.restartRecordingTimeout);
				self.restartRecordingTimeout = setTimeout( function() {
					console.log('[app] restarting recorder');
					camerasController.simplyRestartRecording();
				}, 1000);
			});
		});
	};

	this.launchThumbnailer = function() {
		exec('killall -9 thumbnailer', function( error, stdout, stderr) {
			self.thumbnailerProcess = exec('./thumbnailer', function( error, stdout, stderr ) {
			});
			console.log('*** launching thumbnailer');
			self.thumbnailerProcess.on('exit', function() {
				console.error('*** relaunching thumbaniler');
				self.launchThumbnailer();	
			});
		});
	};

	//

	this.launchRtspGrabber();
	this.launchThumbnailer();


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
	// - - -
	//

	//
	var lifelineAuthentication = function(username,password, done){
		//
		// there's a bug in lifeline authentication API
		// it accepts empty username/password as valid credentials
		// so I'm avoiding those here
		// howver, notice that in case Lifeline has not a username/password, 
		// this will prevent the user from logging in
		if (typeof(username) == 'undefined' || typeof(password) == 'undefined') {
			return done('invalid username/password', false);
		}
		username = username || '%20';
		password = password || '%20';

		var url = "https://" + username + ":" + password + "@localhost/cp/UserVerify?v=2&login=" + username + "&password=" + password;

		if (process.env['NODE_ENV'] === 'development') {
			// url = "https://192.168.215.148/cp/UserVerify?v=2&login=" + username + "&password=" + password;
			return done(null, true);
		} 
		

		if (!authCache.date || Date.now() - authCache.date > 15 * 60 * 1000) {	// auth cache expires every 15mini
			
			request({ 
				url:         url,
				strictSSL:   false,
				headers: {
					'User-Agent':      'nodejs',
					'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
				},
			}, function( error, response, body) {
				if (error){ return done(error, false); }
				if (body) { 

					if (body === 'true') {
						// stores lifeline auth in memory for later use
						process.env['USER'] = username;
						process.env['PASSWORD'] = password;
						
						authCache.username = username;
						authCache.password = password;
						authCache.date = Date.now();
						
						return done(null,true);
					} else {
						console.log("connect unauthorized");
						return done("unauthorized", false);
					}
				}
			});
		} else {
			if ( username === authCache.username && password === authCache.password ) {
				return done( null, true );
			} else {
				return done( 'unauthorized', false );
			}
		}
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

	// Your own super cool function
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
		console.log("hostname :" + hostname);
		console.log(handshakeData);
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
			}else if (handshakeData.query.username && handshakeData.query.password){
				console.log("unauthorized: Bad username and password");
				lifelineAuthentication(handshakeData.query.username,handshakeData.query.password, function(err, success){
					if (!err){
						console.log("successfully connected through socket.io");
					}
					callback(err, success);
				});
			}else{
				console.log("unauthorized: Specify username and password");
				callback("unauthorized: Specify username and password", false);
			}
		}else{
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
	var camerasController = new CamerasController( mp4Handler, baseFolder + '/cam_db', baseFolder);


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
			camerasController.deleteOldestChunks( 20 * nStreams, function(data) {
				// console.log(data);
			});
		}
	});
	// - - -

	// - - - - -
	// health check modules
	require('./controllers/health.js')( io );
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


	camerasController.on('camera_status', function( data ) {
		if (data.status === "disconnected" || data.status === "offline"){
			console.error("[camera_status] " + data.cam_id + " : " + data.stream_id + " is " + data.status);
		}else{
			console.log("[camera_status] " + data.cam_id + " : " + data.stream_id + " is "+ data.status);	
		}
		io.sockets.emit( 'cameraStatus', data );
	});
	
	setInterval( function() {
		var unixTime = Date.now();
		var time = moment().format('HH:mm:ss');
		io.sockets.emit( 'time', {
			unix: unixTime,
			string: time
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
	app.use('/css'   , express.static(__dirname + '/assets/css'));
	app.use('/js'    , express.static(__dirname + '/assets/js'));
	app.use('/img'   , express.static(__dirname + '/assets/img'));
	app.use('/swf'   , express.static(__dirname + '/assets/swf'));
	app.use('/fonts' , express.static(__dirname + '/assets/fonts'));
	app.use(express.static(__dirname + '/assets/public'));
	// end of static files
	// - - -


	// - - -
	// API
	require('./api/cameras.js')( app, passport, camerasController );			// cameras
	require('./api/device.js')( app, passport);			// device

	// usage: append subnet prefix in the form xxx.xxx.xxx
	// TODO: we need to configure the subnet that camera should scan
	require('./api/scanner.js')( app, passport);				// scanner

	app.get('/health', passport.authenticate('basic', {session: false}), function(req, res) {							// health
		res.sendfile(__dirname + '/views/health.html');
	});

	app.get('/', passport.authenticate('basic', {session: false, failureRedirect: '/login'}), function (req, res) {								// main page
		res.sendfile(__dirname + '/views/cameras.html');			
	});
	app.get('/cameras', passport.authenticate('basic', {session: false, failureRedirect: '/login'}), function(req, res) {
		res.sendfile(__dirname + '/views/cameras.html');			// main page - alternative route
	});

	app.get('/login', function(req, res) {

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
				res.redirect('/');
			} else {
				res.status(401);
				res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
				res.sendfile(__dirname+'/views/unauthorized.html');
			}
		});
	});

	app.get('/logout', function (req, res) {								// main page
		req.headers.authorization = "logged out";
		res.status(401);
		res.end('logged out');
	});

	app.get('/not-supported', function(req, res) {
		res.sendfile(__dirname+'/views/not_supported.html');
	});
	// - - -





	app.get('/config', passport.authenticate('basic', {session: false}), function (req, res) {								// main page
		res.sendfile(__dirname + '/views/config.html');			
	});

	app.get('/hls', passport.authenticate('basic', {session: false}), function(req, res) {
		res.sendfile(__dirname + '/views/js_hls.html');			// main page - alternative route
	});
	// - - -
	// - - -
	// gets ts segment
	// TODO: get authentication to work with HLS video tag
	app.get('/cameras/:cam_id/ts/:stream_id/:file', function(req, res) {
	   
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
	// - - -
	//	gets hls live stream
	//	TODO: not yet implemented
	//app.get('/live', passport.authenticate('basic', {session: false}), function(req, res) {
	//    hlsHandler.generateLivePlaylist( db, req, res );       
	//});
	// - - -

	// - - -
	// multicam mockup 
	// TODO: create a real multicam page
	app.get('/multiview', passport.authenticate('basic', {session: false}), function(req, res) {    
		res.sendfile(__dirname + '/views/multi.html');
	});
	// - - -


	var solink = require('./api/solink.js');

	app.get('/solink', passport.authenticate('basic', {session: false}), solink.getDevice);
	app.post('/solink', passport.authenticate('basic', {session: false}), solink.registerDevice);

	var sensors = require('./api/sensors.js');

	app.get('/cameras/:camera_id/sensors', function(req, res){
		sensors.getSensorData(baseFolder, req, res);
	});



	/////////////
	///// dev only ////////
	/////////////
	app.get('/dev/motion', passport.authenticate('basic', {session: false}), function(req, res){

		// request({
		// 	uri: "http://Administrator:password@192.168.215.108:8080/cameras/VHYcWYVtjAu6MlWO/sensors?start="+req.query.start+"&end="+req.query.end,
		// 	method: "GET",
		// }, function(error, response, body){
		// 		console.log(body);
		// 		res.end(body);
		// 	});
		var d = {};
		d.data = [];

		var start = parseInt( req.query.start );
		var end = parseInt( req.query.end );

		console.log("start: " + start );
		console.log("end: " + end);
		for (var t = start; t < end; t = t+10000) {
			if (Math.random() > 0.8) {
				d.data.push({
					t: t
				});
			}
		};

		res.json(d);
	});
	/////////////
	///// dev only ////////
	/////////////


	// server.listen(process.env.PORT || 8080);
	server.listen( 8080 );
});
