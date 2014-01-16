//require('look').start();  -- profiler ( NOT for production )
var winston = require('winston');
var express = require('express');										// express 
var request = require('request');										// request
var tsHandler = require('./helpers/ts');								// ts abstraction
var hlsHandler = require('./controllers/hls_controller');				// hls abstraction
var mp4Handler = require('./controllers/mp4_controller');				// mp4 abstraction
var CamerasController = require('./controllers/cameras_controller');	// cameras controller								
var fs = require('fs');													// for sending files
var lifeline = require('./helpers/lifeline_api.js');					// api layer for lifeline app
var DiskSpaceAgent = require('./helpers/diskSpaceAgent.js');			// agent that periodically checks disk space

var passport = require('passport');
var BasicStrategy = require('passport-http').BasicStrategy;

// - - -
// kills any ffmpeg, iostat and smartctl processes that might be already running
var exec = require('child_process').exec;
exec('killall ffmpeg', function( error, stdout, stderr) {});
exec('killall iostat', function( error, stdout, stderr) {});
exec('killall smartctl', function( error, stdout, stderr) {});
// - - 

var logger = new (winston.Logger)({
	transports: [
		new (winston.transports.Console)(),
		new (winston.transports.File)({filename: 'production.log'})
	]
});

// - - -
// stores machine ip
var localIp = "";

require('dns').lookup(require('os').hostname(), function (err, add, fam) {
    localIp = add;
	process.env['IP'] = localIp;
});
// - - -


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
			var digest = new Buffer(username + ":" + password).toString('base64');
			
			var url = "https://" + username + ":" + password + "@localhost/cp/UserVerify?v=2&login=" + username + "&password=" + password;
			request({ 
				url: url,
				strictSSL: false,
				headers: {
					'User-Agent': 'nodejs',
					'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
					'Authorization': 'Basic ' + digest	
				},
			}, function( error, response, body) {
				if (error){ return done(error); }
				if (body) { 

					if (body === 'true') {
						// stores lifeline auth in memory for later usage
						process.env['USER'] = username;
						process.env['PASSWORD'] = password;
						
						return done(null,true);
					} else {
						return done(null, false);
					}
				}
			}
			);
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
	
    logger.log("[" + auth_user + "] " + req.method + " " + req.url);
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
// end of socket.io config
// - - -

app.configure(function() {
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
var camerasController = new CamerasController( mp4Handler, __dirname + '/db/cam_db', baseFolder);


app.all('/*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
});


// - - - - -
// disk space agent
//
var usageThreshold = 90; // usage threshold (%)

var diskSpaceAgent = new DiskSpaceAgent( baseFolder );
diskSpaceAgent.launch();
diskSpaceAgent.on('disk_usage', function(usage) {
	var nCameras = camerasController.getAllCameras().length;
	if (usage > usageThreshold) {	// usage in %
		console.log( "usage: " + usage + "%");
		console.log('freeing disk space...');
		camerasController.deleteOldestChunks( 10 * nCameras, function(data) {
			console.log( "added old files to deletion queue" );
		});
	}
});
// - - -

// - - - - -
// health check modules
require('./controllers/health.js')( io );
// - - -

io.on('connection', function(socket) {

});

// - - - -
// socket.io broadcasts setup
camerasController.on('new_chunk', function( data ) {
    io.sockets.emit( 'newChunk', data );
});

camerasController.on('camera_status', function( data ) {
	io.sockets.emit( 'cameraStatus', data );
});
// end of socket.io broadcasts setup
// - - -


// - - - -
// scheduler setup
var Scheduler = require('./helpers/scheduler.js');
var scheduler = new Scheduler(10000);
setTimeout(function(){
    scheduler.launchForAllCameras(camerasController.getCameras());
}, 10000);

scheduler.setupListeners( camerasController );
// - - -


// - - -
// static files
app.use('/css', express.static(__dirname + '/assets/css'));		
app.use('/js', express.static(__dirname + '/assets/js'));
app.use('/img', express.static(__dirname + '/assets/img'));
app.use('/swf', express.static(__dirname + '/assets/swf'));
app.use('/fonts', express.static(__dirname + '/assets/fonts'));
// end of static files
// - - -


// - - -
// API
require('./api/cameras.js')( app, passport, camerasController );			// cameras
require('./api/device.js')( app, passport);			// device

// usage: append subnet prefix in the form xxx.xxx.xxx
// TODO: we need to configure the subnet that camera should scan
require('./api/scanner.js')( app, passport, '192.168.215' );				// scanner

app.get('/health', passport.authenticate('basic', {session: false}), function(req, res) {							// health
    res.sendfile(__dirname + '/views/health.html');
});

app.get('/', passport.authenticate('basic', {session: false}), function (req, res) {								// main page
    res.sendfile(__dirname + '/views/cameras.html');			
});
app.get('/cameras', passport.authenticate('basic', {session: false}), function(req, res) {
	res.sendfile(__dirname + '/views/cameras.html');			// main page - alternative route
});
// - - -

// - - -
// gets ts segment
// TODO: get authentication to work with HLS video tag
app.get('/cameras/:cam_id/ts/:stream_id/:file', function(req, res) {
    
    var camId = req.params.cam_id;
	var streamId = req.params.stream_id;
    var file = req.params.file;

    tsHandler.deliverTsFile( camId, streamId, file, res );
});
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


/////////////////////
/// lifeline  api ///
////////////////////
lifeline.setup( app, camerasController, mp4Handler, hlsHandler );
////////////////////

// server.listen(process.env.PORT || 8080);
server.listen( 8080 );

