var CameraGroup = function( id ) {

	var self = this;

	this.group_id = id || 0;

	this.cameras = {};
	this.el = $('<ul>', {
		id: 'cameras-grid-'+id,
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
			self.update();
		},
		accept: '.mini-cam'
	});
	
};

CameraGroup.prototype.update = function() {
	this.manager.updateGroup( this );
};

CameraGroup.prototype.refresh = function() {
	this.hide();
	this.show();
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
	this.update();
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

		if ( nx == 3 && nCameras == 4) {
			margin_left = ( w - 2 * ( player_w + 10 ) ) / 2.0;
		}

		this.el.css('padding-left', margin_left );

		$('.video-container').css('width', player_w + 'px');
		$('.video-container').css('height', player_h + 'px');


		for (var i in this.cameras) {
			this.cameras[i].scroll();
		}
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


CameraGroup.prototype.show = function() {

	var self = this;

	if (this.el.is(':visible')) return;

	$('.mini-cam').removeClass('mini-cam-deactivated');
	$('.mini-cam').addClass('mini-cam-active');

	for (id in this.cameras) {
		this.cameras[id].addPlayer();	
		$('#mini-cam-'+id).addClass('mini-cam-deactivated');
		$('#mini-cam-'+id).removeClass('mini-cam-active');
	}

	this.el.show();
	this.resize();
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
