var groups = [];

var Camera = function( d ) {

	var self = this;

	this.el;
	this.player;
	this.cam_data = d;
	this.posId = '';
	this.textLines = [];
	
	this.el = $('<li>', {
		id: 'video-container-' + d._id + '-' + Math.random(),
		class: 'video-container',
		data_id: d._id,
		style: 'position: relative; float: left; width:480px; height:320px; margin: 5px; margin-bottom: 25px;'
	});

	this.el.attr('data-camId', d._id);

	var xButton = $('<span>', {
		html: '[ x ]  ',
		style: 'cursor: pointer; color: rgb(180,180,250);'
	});

	xButton.click(function() {
		self.remove();
	});

	this.cameraMenu = $('<div>', {
		id:     'camera-menu-'+ this.cam_data._id,
		class:  'camera-name',
		html:   d.name || d.ip
	}).appendTo(this.el);

	this.cameraMenu.prepend( xButton );
	// this.el.draggable({
	// 	handle: '.camera-name'
	// });

	this.addPlayer();

	this.attachOverlay();
	
	if ( !isNaN( d.posId ) && d.posId !== "" ) {
		this.connectToPOS( d.posId );
	}
};


Camera.prototype.attachOverlay = function() {

	var self = this;

	this.toggleOverlayButton = $('<div>', {
		id: 'toggle-overlay-'+ this.cam_data._id,
		class: 'toggle-overlay glyphicon glyphicon-align-justify'
	}).appendTo(this.el)
	.attr('data-camera-id', this.cam_data._id)
		.click( function() {
			// toggleOverlay( $(this).attr('data-camera-id') );
			self.toggleOverlay();
		});


	this.textOverlay = $('<div>', {
		class: 'camera-overlay',
		// id: 'overlay-' + this.cam_data._id,
	}).appendTo(this.el);

	var posDrop = $('<div>', {
		class: 'pos-drop',
		id: 'pos-drop-'+this.cam_data._id
	}).appendTo(this.el);

	posDrop.attr('data-camId', this.cam_data._id);
	posDrop.droppable({
		activeClass: "ui-state-highlight",
		drop: function(e, ui) {
			var camId =  $(this).attr('data-camId');
			var posId =  ui.draggable.attr('data-pos-id');
			self.connectToPOS( posId );
			updateGroup( self.group );
			// connectPOSToCamera( instances[posId], camId );
			// saveState();
		}
	});
};



Camera.prototype.connectToPOS = function( pos_id ) {

	var self = this;

	if ( this.posId  != '') {
		return;
	}

	// instances[ pos.id ].cameras.push( camera_id );
	this.posId = pos_id;	
	
	this.attachedPOS = $('<div>', {
		// id: 'attached-pos-' + this.el,
		class: 'attached-pos',
		html: 'pos ' + pos_id
	//	html: pos.name
	});

	var dettachButton = $('<span>', {	
		class: 'glyphicon glyphicon-remove dettach-button',
		style: 'margin-right: 8px'
	}).prependTo( this.attachedPOS )
	.click( function() {
		self.disconnectFromPOS();
	});

	this.attachedPOS.appendTo( this.cameraMenu );

	this.toggleOverlayButton.show();
	this.textOverlay.fadeIn();
};


Camera.prototype.disconnectFromPOS = function() {

	this.posId = '';

	this.attachedPOS.remove();
	this.toggleOverlayButton.hide();
	this.textOverlay.fadeOut();
	this.textOverlay.html('');

	updateGroup( this.group );
};


Camera.prototype.toggleOverlay = function() {
	this.textOverlay.fadeToggle();
};


Camera.prototype.remove = function() {

	this.el.remove();

	if( this.group ) {
		this.group.removeCamera( this.cam_data._id );
		this.group = null;
	}

};


Camera.prototype.appendTo = function( parentEl ) {

	this.el.appendTo( parentEl ); 
	this.player.playVideo( this.cam_data._id, this.cam_data.streams[0].id );
	this.parentEl = parentEl;

};


Camera.prototype.addPlayer = function() {

	var p = Math.random()*100 % 5;
	this.player = new Player( this.el, ports[p] );
	var camId = this.cam_data._id;
	var streamId = this.cam_data.streams[0].id;
	var id = $(this.el).attr('id');


	if (this.cam_data.status == 'offline') {
		this.el.append('<div style="width:100%;height:100%; background:rgb(200,200,200);padding: 10px;">camera offline</div>');
	} else {
		this.player.playVideo( camId, streamId );
	}
};


Camera.prototype.removePlayer = function() {
	this.player.destroy();
};


Camera.prototype.appendText = function( text ) {

		var overlay = this.textOverlay;
		
		if (text.indexOf('showtext') >= 0) {
			text = text.replace('showtext', '');
			if (text[0] == ':') text[0]=' ';
			//text = '<br>' + text;
		}

		var line = $('<div>', {
			html:   text,
			class:  'text-line'
		});

		this.textLines.push( line );
		overlay.append(line);

		var height = overlay.scrollTop() 
			+ overlay.height() 
			+ overlay.filter('.text-line:last').scrollTop();

		overlay.stop().animate({'scrollTop' : height}, 300);

		while (this.textLines.length > 80) {
			var line = this.textLines.shift();
			line.remove();
		}
};


//////
//////
//////


var CameraGroup = function() {

	var self = this;

	this.cameras = {};
	this.el = $('<ul>', {
		id: 'cameras-grid',
		class: 'video-items',
		style: 'width: 100%; height: 100%; margin:0; padding: 0; position: absolute; list-style-type: none'
	});

	this.el.droppable({
		drop: function(ev, ui) {
			var cam_id = ui.draggable.attr("data_id");
			self.addCamera( new Camera( cameras[cam_id] ), cam_id );
			self.resize();
			ui.draggable.addClass('mini-cam-deactivated');
			ui.draggable.removeClass('mini-cam-active');
			updateGroup( self );
		},
		accept: '.mini-cam'
	});
	
};


CameraGroup.prototype.addCamera = function( camera, id ) {

	this.cameras[id] = camera;
	
	camera.appendTo( this.el );
	camera.group = this;

};


CameraGroup.prototype.getJSON = function() {
	
	var res = [];
	for (var i in this.cameras) {
		var c = this.cameras[i];
		var cam = {
			id:      i,
			pos_id:  c.posId
		};
		res.push( cam );
	}

	return res;
};


CameraGroup.prototype.removeCamera = function( id ) {

	this.cameras[id] = null;
	delete this.cameras[id];

	$('#mini-cam-'+id).removeClass('mini-cam-deactivated');
	$('#mini-cam-'+id).addClass('mini-cam-active');

	this.resize();
	updateGroup(this);
};


CameraGroup.prototype.resize = function() {

		if (!this.cameras) return;
		var nCameras = this.getNumCameras();

		if (nCameras == 0) return;

		this.el.css('padding-left', 0 );

		var w = this.el.width();
		var h = this.el.height();
		var h = $(window).height() - 100;
		this.el.height( h );

		var total_area = 1.0*w*h / nCameras;
		var scale =  Math.sqrt( total_area / 12.0 );

		var player_w = scale * 4;
		var player_h = scale * 3;

		var fit = false;
		var nx, ny;

		while (!fit && scale > 0) {
			scale-=2;
			player_w = scale * 4;
			player_h = scale * 3;
			nx = Math.floor( w / ( player_w + 15 ) );
			nx = nx > nCameras ? nCameras : nx;
			if (nx == 0) continue;

			ny = Math.ceil( nCameras / nx );
			fit = ( nx*(player_w + 5) <= w-50 && ny*player_h <= h-40 );
		};

		var margin_left = ( w - nx * ( player_w + 10 ) ) / 2.0;
		this.el.css('padding-left', margin_left );

		$('.video-container').css('width', player_w + 'px');
		$('.video-container').css('height', player_h + 'px');
};


CameraGroup.prototype.appendTo = function( el ) {

	this.el.appendTo( el );
};


CameraGroup.prototype.load = function( cb ) {

	var self = this;

	this.state = 'loading';
	

	for (var i in this.cameras) {
		this.cameras[i].addPlayer();	
	}

	self.el.show();
	$('.video-container', this.el).css('width', '1px');
	$('.video-container', this.el).css('height', '10px');
	$('.video-container', this.el).css('opacity', '0.1');


	setTimeout( function() {

		self.state = '';
		self.resize();

		$('.mini-cam').removeClass('mini-cam-deactivated');
		$('.mini-cam').addClass('mini-cam-active');
		$('.video-container', this.el).css('opacity', '1');

		for (id in self.cameras) {
			$('#mini-cam-'+id).addClass('mini-cam-deactivated');
			$('#mini-cam-'+id).removeClass('mini-cam-active');
		}
		if (cb) cb();
	}, 5000);
};


CameraGroup.prototype.getNumCameras = function() {

	return Object.keys( this.cameras ).length;
};


CameraGroup.prototype.show = function( delay ) {

	var self = this;


	$('.mini-cam').removeClass('mini-cam-deactivated');
	$('.mini-cam').addClass('mini-cam-active');

	for (id in this.cameras) {
		this.cameras[id].addPlayer();	
		$('#mini-cam-'+id).addClass('mini-cam-deactivated');
		$('#mini-cam-'+id).removeClass('mini-cam-active');
	}

	this.resize();
	this.el.fadeIn();

};

CameraGroup.prototype.hide = function( el ) {
		for( var i in this.cameras ) {
			this.cameras[i].removePlayer();
		}
		this.el.hide();
};


CameraGroup.prototype.appendTextToCamera = function( pos_id, text ) {

	for (var id in this.cameras) {

		if ( this.cameras[id].posId != ""+pos_id) continue;
		this.cameras[id].appendText( text );
	};
};
