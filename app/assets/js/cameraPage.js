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
	this.buttons.togglePlay   = $('#toggle-play');
	this.buttons.getLink      = $('#link-to-timeline');
	this.buttons.openCamera   = $('#open-camera');

	this.buttons.videoControls = $('#video-controls');
	this.buttons.jumpForward5  = $('#jump-forward-5');
	this.buttons.jumpBackward5 = $('#jump-backward-5');

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


CameraPage.prototype.loadStateFromURL = function() {

	var params = queryize( window.location.href );
	if (!params) return;
	var day = params['day'];
	if (!day) return;

	day = parseInt(day);
	if ( isNaN(day) ) return;

	var d = camPage.inputs.date;
	d.val( new Date(day) );
	setTimeout(function() {
		d.trigger('change');
	}, 10);

	var offset = params['offset'];
	if ( isNaN(offset) ) return;

	var begin = params['begin'];
	var end   = params['end'];
	if (isNaN(begin) || isNaN(end)) return;

	this.state = {};

	this.state.offset = parseInt( offset );
	this.state.begin  = parseInt( begin );
	this.state.end    = parseInt( end );
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

	$(window).on('fringe', function(e, t) {
		if (self.player.currentPlayer == 'strobe') {
			t = parseFloat( t + 0.2 );
			self.jumpTo( {
				time: t
			});
		}
	});

	$(window).on('playerState', function(e, d) {
		if (d == 'playing') {
			$('#play-icon').attr('class', 'glyphicon glyphicon-pause')
		} else {
			$('#play-icon').attr('class', 'glyphicon glyphicon-play')
		}
	});

	$(window).on('playerInactive', function(e, d) {
		self.buttons.livestream.click();
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

	$(window).on('currentTimeChange', function(t) {
		$('#video-controls *').prop('disabled', false);

		if (self.state && self.state.offset) {
			self.jumpTo({ 
				time: self.state.offset 
			});
			self.state.offset = null;
		}
	});

	$.ajax({
		method: 'get',
		url: '/cameras.json'
	}).success( function(data) {
		console.log('loaded cameras list');
		console.log( data );
		self.buttons.openCamera.prop('disabled', false);
	});
	
};



CameraPage.prototype.switchToArchive = function() {

	self.mode = 'archive';
	var dateInput = this.inputs.date.pickadate('picker');
	dateInput.set( 'select', Date.now() );
};


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
				var url = window.location.protocol + "//" + window.location.host
						+ "/cameras/" + self.camId
						+ "/download?begin=" + parseInt( self.timeline.currBegin )
						+ "&end=" + parseInt( self.timeline.currEnd )
						+ "&stream=" + stream;

				var w = window.open( url );
				window.focus();
				w.onload = function() {
					if (w.document.body.innerHTML.length > 0) {
						w.close();
						if (w.document.body.innerHTML.indexOf('long') >= 0) {
							toastr.error('requested video is too long, please select a shorter interval');
						} else {
							toastr.error('couldn\'t find the requested video');
						}
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
		$('#video').html('');
		self.player = new Player('#video');
		self.player.playVideo( self.camId, stream );


	});


	this.buttons.toggleMotion.click(function() {
		self.toggleMotion();
	});

	this.buttons.togglePlay.click(function() {
		self.player.togglePlay();
	});

	this.buttons.jumpForward5.click(function() {
		self.skip( 5 );
	});

	this.buttons.jumpBackward5.click(function() {
		self.skip( -6 );
	});

	this.buttons.getLink.click( function() {
		console.log( self.getURL() );
	});

	this.buttons.openCamera.click( function() {
		console.log(' open new camera ');

	});

	var client = new ZeroClipboard( document.getElementById("link-to-timeline") );

	client.on( "ready", function( readyEvent ) {
		client.on( "copy", function (event) {
			var clipboard = event.clipboardData;
			clipboard.setData( "text/plain", self.getURL() );
		});
		client.on( "aftercopy", function( event ) {
			toastr.info("Copied timeline link to clipboard");

		} );
	} );
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
				if (data.camera.status == 'offline' || data.camera.status == 'disconnected') {
					self.buttons.livestream.attr('disabled','disabled');
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

	var tz_offset = Date.tz_offset * 1000*60*60 || 0;
	begin -= tz_offset;
	end -= tz_offset;

	var self = this;

	self.mode = 'archive';

	$('.liveOverlay').fadeOut();

	this.timeline.streamId = this.streamId; 
	this.timeline.load( begin, end, function() {
		self.player.playVideo( self.camId, self.streamId, begin, end );
		$('.loadingOverlay').fadeOut(function() {
			// $('.loadingOverlay').remove();
		});

		self.buttons.videoControls.fadeIn();
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


CameraPage.prototype.skip = function( dt ) {

	var time = this.player.currentTime + dt;

	this.jumpTo({ time: time });
};


CameraPage.prototype.jumpTo = function( d ) {
	if ( this.player && this.player.canSeekTo( d.time ) ) {
		$('#video-controls *').prop('disabled', true);
		this.player.seek( d.time );
		this.player.play();
	}
};


CameraPage.prototype.getURL = function() {

	if (!this.inputs.date) return;
	if (!this.player) return;
	if (!this.timeline) return;
	
	var day = this.inputs.date.val();
	if (!day) return;

	day = Date.parse( day );

	var offset = this.player.currentTime;
	if (isNaN(offset)) return;

	var begin = this.timeline.begin;
	var end = this.timeline.end;

	if (!begin || !end) return;

	var url = window.location.origin + 
		'/cameras/' + camId + 
		'?day=' + day + 
		'&offset=' + offset +
		'&begin=' + begin +
		'&end=' + end;

	return url;
};


// 
var queryize = function( url ){
	var tokens = url.split('?');
	if (!tokens || !tokens[1] ) return;
	tokens = tokens[1].split('&');

	var result = {};

	for(var i=0; i<tokens.length; i++){
		result[tokens[i].split('=')[0]] = tokens[i].split('=')[1];
	}

	return result;
};
