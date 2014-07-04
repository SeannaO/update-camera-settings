function CameraPage( camId ) {

	this.mouseX = 0;
	this.mouseY = 0;

	this.camId    = camId;
	this.streamId = '';

	this.inputs  = {};
	this.buttons = {};

	this.inputs.date    = $('#begin_date');
	this.inputs.streams = $('#stream-selector');
	
	this.buttons.download     = $('#download');
	this.buttons.snapshot     = $('#snapshot');
	this.buttons.livestream   = $('#get-livestream');
	this.buttons.toggleMotion = $('#toggle-motion');

	this.timelineTag = $('#timeline');
	
	this.timelineEl         = $("#timeline");
	this.timeline           = null;
	this.player             = new Player('#video');

	this.showMotion = false;
};


CameraPage.prototype.setup = function() {

	var self = this;

	this.getStreamsInfo( function() {
		self.setupDatepicker();
		self.setupStreamSelector();
		self.setupButtons();
		self.setupTimeline();
		self.setupEvents();
	});
};


CameraPage.prototype.setupEvents = function() {

	var self = this;
	
	this.mousePressed = false;
	this.mouseDragged = false;

	$(window).on('jumpTo', function(e, d) {
		if (self.mode === 'live') {
			self.switchToArchive();
		} else {
			self.jumpTo(d);
		}
	});

	$(window).on('motion_loaded', function(e, d) {
		self.buttons.toggleMotion.prop('disabled', false);
	});

	$(window).on('toggle_motion', function(e, d) {
		self.buttons.toggleMotion.prop('disabled', false);
		if (d.show) {
			self.buttons.toggleMotion.html('hide motion');
		} else {
			self.buttons.toggleMotion.html('show motion');
		}
	});

	$(window).on('switch_to_archive', function(e, d) {
		if (self.mode === 'live') {
			self.switchToArchive();
		}
	});
};


CameraPage.prototype.switchToArchive = function() {

	self.mode = 'archive';
	var dateInput = this.inputs.date.pickadate('picker');
	dateInput.set( 'select', Date.now() );
}

CameraPage.prototype.setupTimeline = function() {

	self = this;

	var timelineContainer = $("<div>", {
		id:     "timeline-container",
		class:  "timeline-container"
	});

	timelineContainer.appendTo( self.timelineTag );

	this.timeline = new Timeline("#timeline-container", { 
		static:    true,
		seekable:  true,
		timeSpan:  24*60*60*1000,  // 1 day
		offset:    0,
		streamId: self.streamId,
		camId: self.camId
	});

};

CameraPage.prototype.getRtsp = function( options ) {

	var streamId = this.inputs.streams.val();

	for (var s in streams) {
		if (streams[s].id === streamId) {
			return streams[s];
		} 
	}

	return '';
}


CameraPage.prototype.setupDatepicker = function() {

	var self = this;
	var dateInput = this.inputs.date;

	dateInput.pickadate();

	dateInput.change( function() {
					
		var begin_date = dateInput.val();
		if (!begin_date) return;

		begin_date   = new Date( begin_date );
		var end_date = new Date( begin_date );

		end_date.setHours(23);
		end_date.setMinutes(59);
		end_date.setSeconds(59);

		begin_date = Date.parse( begin_date );
		end_date   = Date.parse( end_date );

		self.play(begin_date, end_date);	
	});
};


CameraPage.prototype.setupStreamSelector = function() {

	var self = this;

	self.streamId = self.inputs.streams.val();
	
	// debugger;
	this.inputs.streams.change( function() { 

		console.log('mode: ' + self.mode);
		var begin_date = self.inputs.date.val();

		if (!begin_date && !self.mode === 'live') {
			return;
		} else if( self.mode === 'live') {
			self.streamId = self.inputs.streams.val();
			self.player.playVideo( self.camId, self.streamId );
			return;
		}
			

		begin_date = new Date( begin_date );
		var end_date = new Date(begin_date);

		end_date.setHours(23);
		end_date.setMinutes(59);
		end_date.setSeconds(59);

		begin_date = Date.parse( begin_date );
		end_date   = Date.parse( end_date );

		self.streamId = self.inputs.streams.val();
		self.play( begin_date, end_date );
	});				
};


CameraPage.prototype.setupButtons = function() {

	var self = this;

	// download button
	this.buttons.download.click(function() {

		if( !self.timeline.currBegin || !self.timeline.currEnd ) {
			bootbox.alert('Select a day and a time interval first.');
			return;
		}

		var stream = self.inputs.streams.val();
		var begin  = new Date( self.timeline.currBegin );
		var end    = new Date( self.timeline.currEnd );

		bootbox.confirm('Download video<br><br> <b>FROM</b>: ' + begin + '<br> <b>TO</b>: ' + end  + '<br><br> Confirm? ', function(ok) {
			if(!ok) {
				return;	
			} else {
				var url = window.location.protocol + "//" + window.location.host +
						+ "/cameras/" + self.camId
						+ "/download?begin=" + parseInt( self.timeline.currBegin )
						+ "&end=" + parseInt( self.timeline.currEnd )
						+ "&stream=" + stream;

				var w = window.open( url );
				window.focus();
				w.onload = function() {
					if (w.document.body.innerHTML.length > 0) {
						w.close();
						toastr.error('couldn\'t find the requested video');
					}
				};
			}
		});


	});

	// snapshot button
	this.buttons.snapshot.click(function() {
	});

	// livestream button
	this.buttons.livestream.click(function() {
		var stream = self.inputs.streams.val();
		if (!stream) {
			console.log('[livestream] no stream selected');
			// return;
		}
		self.mode = 'live';
		self.inputs.date.val('');
		self.timeline.liveOverlay.fadeIn();
		self.player.playVideo( self.camId, stream );

	});


	this.buttons.toggleMotion.click(function() {
		self.toggleMotion();
	});
};


CameraPage.prototype.getStreamsInfo = function(cb) {

	var self = this;

	$.ajax({
		url: '/cameras/' + self.camId + '/json',
		success: function(data) {
			if (!data.camera.streams) {
				if (cb) cb("no streams");
				return;
			} else {
				streams = data.camera.streams;
				self.populateStreamSelector( data.camera.streams );	
				if (!data.camera.name) {
					$("#camera_name").html(data.camera.manufacturer);
				}
				if (cb) cb(data.camera);
			}
		},
		error: function(err) {
			console.log( err );
		}
	});
};


CameraPage.prototype.populateStreamSelector = function(streams) {
	
	for (var s in streams) {

		var text = '';

		if ( streams[s].name ) {
			text = text + streams[s].name + ' - ';
		} if ( streams[s].resolution ) {
			text = text + streams[s].resolution;
		} else {
			text = text + ' ' + streams[s].url;
		}
		
        this.inputs.streams.append($('<option>', { value: streams[s].id })
          .text( text ));		
	}
};


CameraPage.prototype.play = function( begin, end ) {

	var self = this;

	self.mode = 'archive';

	$('.liveOverlay').fadeOut();

	this.timeline.load( begin, end, function() {
		self.player.playVideo( self.camId, self.streamId, begin, end );
		$('.loadingOverlay').fadeOut(function() {
			// $('.loadingOverlay').remove();
		});

		self.buttons.toggleMotion.fadeIn();
		self.buttons.toggleMotion.prop('disabled', true);
		self.buttons.toggleMotion.html('loading motion data...');

	});
}


CameraPage.prototype.toggleMotion = function() {
	var self = this;
	self.timeline.toggleMotion();
};



CameraPage.prototype.overlayMotionData = function() {
};



CameraPage.prototype.jumpTo = function( d ) {
	if ( this.player && this.player.canSeekTo( d.time ) ) {
		this.player.seek( d.time );
		this.player.play();
	}
};



