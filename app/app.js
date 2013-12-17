//require('look').start();  -- profiler ( NOT for production )

var express = require('express');										// express 
var tsHandler = require('./helpers/ts');								// ts abstraction
var hlsHandler = require('./controllers/hls_controller');				// hls abstraction
var mp4Handler = require('./controllers/mp4_controller');				// mp4 abstraction
var CamerasController = require('./controllers/cameras_controller');	// cameras controller								
var fs = require('fs');													// for sending files
var lifeline = require('./helpers/lifeline_api.js');					// api layer for lifeline app
var DiskSpaceAgent = require('./helpers/diskSpaceAgent.js');			// agent that periodically checks disk space


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

// server.listen(process.env.PORT || 8080);
server.listen( 8080 );

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
require('./api/scanner.js')( app, '192.168.215' );				// scanner

app.get('/health', function(req, res) {							// health
    res.sendfile(__dirname + '/views/health.html');
});

app.get('/', function (req, res) {								// main page
    res.sendfile(__dirname + '/views/cameras.html');			
});
app.get('/cameras', function(req, res) {
	res.sendfile(__dirname + '/views/cameras.html');			// main page - alternative route
});
// - - -

// - - -


// - - -
// gets ts segment
app.get('/ts/:id/:file', function(req, res) {
    
    var camId = req.params.id;
    var file = req.params.file;

    tsHandler.deliverTsFile( camId, file, res );
});
// - - -


// - - -
//	gets hls live stream
//	TODO: not yet implemented
app.get('/live', function(req, res) {
    hlsHandler.generateLivePlaylist( db, req, res );       
});
// - - -


// - - -
// multicam mockup 
// TODO: create a real multicam page
app.get('/multiview', function(req, res) {    
	res.sendfile(__dirname + '/views/multi.html');
});
// - - -


/////////////////////
/// lifeline  api ///
////////////////////
lifeline.setup( app, camerasController, mp4Handler, hlsHandler );
////////////////////



