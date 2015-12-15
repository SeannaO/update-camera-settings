var GroupsManager = function() {
	
	this.groups = [];
	this.curr_g = 0;
	this.rotateInterval;
	this.rotating = false;

	var self = this;

};


GroupsManager.prototype.getCurrGroup = function() {
	if (!this.groups) return;
	return this.groups[ this.curr_g ];
};


GroupsManager.prototype.refresh = function() {
	this.groups[ this.curr_g ].refresh();
};


GroupsManager.prototype.appendTo = function( el ) {

	for (var i in this.groups) {
		this.groups[i].appendTo( el );
		this.groups[i].hide();
	}
	this.groups[ this.curr_g ].show();
	this.groups[ this.curr_g ].resize();
};


GroupsManager.prototype.addNewGroup = function() {
	
	var group_id = this.groups.length;
	var cg = new CameraGroup( group_id );
	cg.manager = this;
	this.groups.push( cg );
};


GroupsManager.prototype.updateGroup = function( group ) {
	if ( isNaN(group.group_id) ) return;
	$.ajax({
		type: 'PUT',
		url: '/multiview/views',
		data: {
			group: group.group_id,
			cameras: JSON.stringify( group.getJSON() )
		}
	});
};


GroupsManager.prototype.loadGroups = function( cb ) {

	var self = this;

	$.ajax({
		type: 'GET',
		url: '/multiview/views',
	}).success( function(data) {

		for (var i in data) {

			var group_id = parseInt( data[i].group );
			var gr = self.groups[group_id];
			if (!gr) continue;

			for( var j in data[i].cameras ) {
				var cam_id = data[i].cameras[j].id;
				var stream_id = data[i].cameras[j].stream_id;

				var cam = cameras[cam_id];
				if (cam) {
					var posId = data[i].cameras[j].pos_id;
					gr.addCamera( new Camera(cam, posId, stream_id), cam_id, stream_id );
				}
			}
		}

		self.groups[0].show();
		self.groups[0].resize();
		self.updateCurrentGroup( 0 );
		groupsManager.refresh();
		if (cb) cb();
	});

};

GroupsManager.prototype.updateCurrentGroup = function( new_gr ) {

	var el = $('#link-to-group-' + this.curr_g);

	if (el) {
		el.removeAttr('disabled');
		el.removeClass('disabled');
	}

	this.curr_g = new_gr;

	el = $('#link-to-group-'+this.curr_g);

	if (el) {
		el.attr('disabled', 'disabled');
		el.addClass('disabled');
	}
};


GroupsManager.prototype.rotate = function() {

	var self = this;

	self.stopRefresh();

	$('#groups-play-pause').addClass('glyphicon-pause');
	$('#groups-play-pause').removeClass('glyphicon-play');
	this.rotating = true;
	this.rotateInterval = setInterval( function() {
		var next_g = (self.curr_g + 1) % 5 ;
		while ( self.groups[ next_g ].getNumCameras() == 0 && next_g !== self.curr_g) {
			next_g = ( next_g + 1 ) % 5;
		}
		self.rotateGroupWithDelay( next_g );
	}, 50000);
};


GroupsManager.prototype.stopRotate = function() {
	$('#groups-play-pause').removeClass('glyphicon-pause');
	$('#groups-play-pause').addClass('glyphicon-play');
	this.rotating = false;
	clearInterval( this.rotateInterval );

	this.startRefresh();
};

GroupsManager.prototype.isRotating = function() {
	return this.rotating;
};

GroupsManager.prototype.startRefresh = function() {

	var self = this;

	this.refreshInterval = setInterval( function() {
		if( !self.isRotating() ) self.refresh();
	}, 120*1000);
};

GroupsManager.prototype.stopRefresh = function() {
	clearInterval( this.refreshInterval );
};



GroupsManager.prototype.rotateGroupWithDelay = function( g ) {
	if (g == this.curr_g) return;

	var self = this;

	this.groups[g].load( function() {
		self.groups[self.curr_g].hide();
		self.updateCurrentGroup( g );
	});
};

GroupsManager.prototype.goToGroup = function( g ) {

	if (g == this.curr_g) return;

	this.groups[g].show();
	this.groups[this.curr_g].hide();
	this.updateCurrentGroup( g );
};


GroupsManager.prototype.appendTextToCamera = function( id, data ) {
	for( var g in this.groups ) {
		this.groups[g].appendTextToCamera( id, data );
	}
};


GroupsManager.prototype.resize = function() {
	if ( !this.groups[ this.curr_g ] ) return;
	this.groups[ this.curr_g ].resize();
};


