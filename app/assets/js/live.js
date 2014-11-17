var instances  = {};
var cameras    = {};
var camerasPOS = {};
var textLines  = [];


var POSMonitor = function(cb) {
	
	var self = this;

	console.log('init pos monitor');

	POSMonitor.isMonitorPresent( function( data) {
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

		// try {
			var instances = JSON.parse( data );
			self.instances = instances;
			console.log('monitor detected');
			if (cb) cb(null, instances);
		// } catch( err ) {
		// 	console.log('data from monitor is not as expected');
		// 	console.log( data );
		// 	console.log( err );
		// 	if (cb) cb('data from monitor is not as expected');
		// }
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

	var overlay = $('#overlay-'+camera);

	if (text.indexOf('showtext') >= 0) {
		text = text.replace('showtext', '');
		if (text[0] == ':') text[0]=' ';
		// text = '<br>' + text;
	}

	var line = $('<div>', {
		html:   text,
		class:  'text-line'
	});

	textLines.push( line );
	overlay.append(line);

	var height = overlay.scrollTop() 
		+ overlay.height() 
		+ overlay.filter('.text-line:last').scrollTop();

	overlay.animate({'scrollTop' : height}, 300);

	while (textLines.length > 80) {
		var line = textLines.shift();
		line.remove();
	}

};


var togglePOSList = function() {
	$('#pos-list').fadeToggle();
};

var addPOSToList = function( pos ) {

	var div = $('<div>', {
		class: 'pos',
		html: '<center>' + pos.name + '</center>',
	}).appendTo('#pos-list');

	div.attr('data-pos-id', pos.id);
	div.draggable({
		helper: 'clone',
		start: highlightVideos,
		stop: unhighlightVideos
	});
};

var highlightVideos = function() {
	
	console.log('highlightVideos');

	$('.pos-drop').css('background', 'rgba(255,255,0,0.5)');

	var camerasWithPos = Object.keys(camerasPOS);

	for (var i in camerasWithPos) {
		var id = camerasWithPos[i];
		$('#pos-drop-'+id).css('background', 'rgba(0,0,0,0.8)');
	}

	$('.pos-drop').show();
};


var unhighlightVideos = function() {
	console.log('unhighlightVideos');
	$('.pos-drop').hide();
};


var disconnectPOSFromCamera = function( pos_id, camera_id ) {
	console.log('disconnecting ' + pos_id + ' from ' + camera_id);
	delete camerasPOS[ camera_id ];
	if (!instances[pos_id]) return;
	if (!instances[pos_id].cameras) return;
	var i = instances[pos_id].cameras.indexOf( camera_id );
	instances[pos_id].cameras.splice( i, 1 );
	$('#attached-pos-'+camera_id).remove();
	$('#toggle-overlay-'+camera_id).hide();
	toggleOverlay( camera_id, false );
};


var connectPOSToCamera = function( pos, camera_id ) {

	if (camerasPOS[ camera_id ] !== undefined) {
		console.log('already connected');
		console.log( camerasPOS[ camera_id ] );
		return;
	}

	instances[ pos.id ].cameras.push( camera_id );
	camerasPOS[ camera_id ] = pos.id;
	
	var attachedPOS = $('<div>', {
		id: 'attached-pos-' + camera_id,
		class: 'attached-pos',
		html: pos.name
	});

	var dettachButton = $('<span>', {	
		class: 'glyphicon glyphicon-remove dettach-button',
		style: 'margin-right: 8px'
	}).prependTo( attachedPOS )
	.click( function() {
		disconnectPOSFromCamera( pos.id, camera_id );
		saveState();
	});

	attachedPOS.appendTo( '#camera-menu-' + camera_id );

	$('#toggle-overlay-'+camera_id).show();
	toggleOverlay( camera_id, true);

};


var toggleOverlay = function(camera_id, visible) {
	
	if (visible == undefined) {
		$('#overlay-'+camera_id).fadeToggle();
	} else if (visible) {
		$('#overlay-'+camera_id).fadeIn();
	} else {
		$('#overlay-'+camera_id).fadeOut();
	}
};

var isConnectedToPOS = function( camera_id ) {
	
	return camerasPOS[ camera_id ] !== undefined;
};


var saveState = function() {
	for (var i in cameras) {
		var cam_id = cameras[i]._id;
		console.log(cam_id);
		if ( isConnectedToPOS( cam_id ) ) {
			console.log('is connected');
			sessionStorage.setItem( cam_id, camerasPOS[cam_id]);
		} else {
			console.log('is not connected');
			sessionStorage.removeItem( cam_id )
		}
	}
};

var loadState = function() {
	console.log( 'load state');
	for( var i in cameras ) {
		console.log('??');
		var cam_id = cameras[i]._id;
		var pos_id =  sessionStorage.getItem( cam_id );
		var pos = instances[pos_id];
		console.log( pos );
		if (pos) {
			connectPOSToCamera( pos, cam_id );
		} else {
			sessionStorage.removeItem( cam_id )
		}
	}
};






