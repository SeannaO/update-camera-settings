var instances  = {};
// var cameras    = {};
var camerasPOS = {};
var textLines  = [];


var POSMonitor = function(cb) {
	
	var self = this;

	console.log('init pos monitor');

	POSMonitor.isMonitorPresent( function( data ) {
		self.init( data, cb );
	});
};

POSMonitor.prototype.init = function( data, cb ) {
		var self = this;

		if( !data ) {
			console.log('could not detect a monitor');
			if (cb) cb('could not detect a monitor');
			return;
		} 

		var instances = JSON.parse( data );
		self.instances = instances;
		console.log('monitor detected');
		if (cb) cb(null, instances);
};

POSMonitor.isMonitorPresent = function( cb ) {

	$.ajax({
		url: '/pos_monitor'
	}).done( function( data ) {
		cb( data );
	}).fail( function() {
		cb();
	});
};

var addTextToCamera = function( text, camera ) {
};


var togglePOSList = function() {
	$('#pos-list').toggle();
	$('#cameras-list').hide();
};


var addPOSToList = function( pos ) {

	var name = pos.name || 'pos ' + pos.id;

	var div = $('<div>', {
		class: 'pos',
		html: '<center>' + name + '</center>',
	}).appendTo('#pos-list');

	div.attr('data-pos-id', pos.id);
	div.draggable({
		helper: 'clone',
		start: highlightVideos,
		stop: unhighlightVideos
	});
};


var highlightVideos = function() {
	
	$('.pos-drop').css('background', 'rgba(255,255,0,0.5)');


	var videoContainers = $('.video-container');

	$('.has-pos').css('background', 'rgba(0,0,0,0.8)');

	$('.pos-drop').show();
};


var unhighlightVideos = function() {
	$('.pos-drop').hide();
};


var disconnectPOSFromCamera = function( pos_id, camera_id ) {
};


var connectPOSToCamera = function( pos, camera_id ) {
};


var toggleOverlay = function(camera_id, visible) {
};

var isConnectedToPOS = function( camera_id ) {
};


var saveState = function() {
};

var loadState = function() {
};






