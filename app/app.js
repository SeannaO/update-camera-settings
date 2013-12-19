//require('look').start();  -- profiler ( NOT for production )

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

// - - -
// stores machine ip
var localIp = "";

require('dns').lookup(require('os').hostname(), function (err, add, fam) {
    localIp = add;
});
// - - -


passport.use(new BasicStrategy({
	},function(username,password,done){
		process.nextTick(function(){
			var digest = new Buffer(username + ":" + password).toString('base64');
			// 127.0.0.1
			var url = "https://" + username + ":" + password + "@192.168.215.153/cp/UserVerify?v=2&login=" + username + "&password=" + password
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
				if (body){ return body === "true" ? done(null,true) : done(null,false); }
			}
			);
		});
	})
);



// starts express
var app = express.createServer();

// - - -
// socket.io config 
var io = require('socket.io');

// var server = require('http').createServer(app);
io = io.listen(app);
io.set('log level', 1);
// end of socket.io config
// - - -

app.configure(function() {
  app.use(express.static('public'));
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.session({ secret: 'keyboard cat' }));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
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



// instantiates camerasController, launching all cameras
var camerasController = new CamerasController( mp4Handler, __dirname + '/db/cam_db', baseFolder);


// - - - -
// express config
app.use(express.bodyParser());  // middleware for parsing request body contents
								// this must come before app.all

app.all('/*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
});

app.use(express.cookieParser());				// cookies middleware
app.use(express.session({secret: 'solink'}));	// for session storage
app.use(express.logger());
// app.use(passport.initialize());
app.set('view engine', 'ejs');					// rendering engine (like erb)
// - - -


// - - - - -
// disk space agent
//
var usageThreshold = 90; // usage threshold (%)

var diskSpaceAgent = new DiskSpaceAgent( baseFolder );
diskSpaceAgent.launch();
diskSpaceAgent.on('disk_usage', function(usage) {
	var nCameras = camerasController.getAllCameras().length;
	console.log( "usage: " + usage + "%");
	if (usage > usageThreshold) {	// usage in %
		
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
// end of static files
// - - -


// - - -
// API
require('./api/cameras.js')( app, camerasController );			// cameras

// usage: append subnet prefix in the form xxx.xxx.xxx
// TODO: we need to configure the subnet that camera should scan
require('./api/scanner.js')( app, '192.168.215' );				// scanner

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


// - - -
// gets ts segment
app.get('/ts/:id/:file', passport.authenticate('basic', {session: false}), function(req, res) {
    
    var camId = req.params.id;
    var file = req.params.file;

    tsHandler.deliverTsFile( camId, file, res );
});
// - - -


// - - -
//	gets hls live stream
//	TODO: not yet implemented
app.get('/live', passport.authenticate('basic', {session: false}), function(req, res) {
    hlsHandler.generateLivePlaylist( db, req, res );       
});
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
app.listen( 8080 );

