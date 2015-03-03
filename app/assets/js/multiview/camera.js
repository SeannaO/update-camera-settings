var Camera = function( d, posId ) {

	var self = this;

	this.el;
	this.player;
	this.cam_data = d;
	this.textLines = [];

	posId = parseInt( posId );
	
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

	this.addPlayer();

	this.attachOverlay();
	
	if ( !isNaN( posId ) && posId !== "" ) {
		this.connectToPOS( posId );
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
			var camId = $(this).attr('data-camId');
			var posId = ui.draggable.attr('data-pos-id');
			self.connectToPOS( posId );
			self.group.update();
		}
	});

	this.posDrop = posDrop;
};



Camera.prototype.connectToPOS = function( pos_id ) {

	var self = this;

	if ( isNaN(pos_id) ) return;

	if ( this.posId  != '' && !isNaN( this.posId ) ) {
		return;
	}

	this.posId = pos_id;	
	
	var instance = instances[ pos_id ];
	if( !instance ) return;

	var pos_name = instances[ pos_id ].name || 'pos ' + pos_id;

	this.attachedPOS = $('<div>', {
		class: 'attached-pos',
		html: pos_name
	});

	var dettachButton = $('<span>', {	
		class: 'glyphicon glyphicon-remove dettach-button',
		style: 'margin-right: 8px'
	}).prependTo( this.attachedPOS )
	.click( function() {
		self.disconnectFromPOS();
	});

	this.attachedPOS.appendTo( this.cameraMenu );

	this.posDrop.addClass('has-pos');

	this.toggleOverlayButton.show();
	this.textOverlay.fadeIn();
};


Camera.prototype.disconnectFromPOS = function() {

	this.posId = '';

	this.attachedPOS.remove();
	this.toggleOverlayButton.hide();
	this.textOverlay.fadeOut();
	this.textOverlay.html('');

	this.posDrop.removeClass('has-pos');

	this.group.update();
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
		}

		var line = $('<div>', {
			html:   text,
			class:  'text-line'
		});

		this.textLines.push( line );
		overlay.append(line);

		this.scroll();

		while (this.textLines.length > 80) {
			var line = this.textLines.shift();
			line.remove();
		}
};


Camera.prototype.scroll = function() {

	var overlay = this.textOverlay;

	if (!overlay || !this.textLines.length ) return;

	var height = overlay.scrollTop() 
		+ overlay.height() 
		+ overlay.filter('.text-line:last').scrollTop();

	overlay.stop().animate({'scrollTop' : height}, 300);
};

