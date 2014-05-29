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

	this.marker      = $('#marker');
	this.thumb       = $('#thumb');
	this.thumbImg    = $('#thumb img');
	this.timelineTag = $('#timeline');

	this.timelineSelectorEl = $("#timeline-selector");
	this.timelineSelector   = new TimelineSelector("#timeline-selector");
	
	this.timelineEl         = $("#timeline");
	this.timeline           = null;
	this.indexer            = new Indexer();
	this.player             = new Player('#video');

	this.zoomHistory = [];
	this.currBegin;
	this.currEnd;
	this.posJump;

	this.showMotion = false;
};


CameraPage.prototype.setup = function() {

	var self = this;

	this.getStreamsInfo( function() {
		self.setupSocket();
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

	$('#zoom-back').click( function() {
		self.zoomBack();
	});

	$(window).on('currentTimeChange', function(e, time) {

		var timelineWidth      = self.timelineTag.width();
	    var totalTime          = self.timeline.getTimeSpan()/1000.0;
		var absolute_time      = self.indexer.getAbsoluteTime( time );
		var dt                 = ( absolute_time - self.timeline.begin )/1000.0;
		var pos                = dt * (1.0 * timelineWidth) / totalTime;
		self.marker.css("left", pos);
		
		if ( parseInt(self.marker.css('left')) > timelineWidth*1.05 ) {
			self.marker.hide();
		} else {
			self.marker.show();
		}
	});


	$(document).mousemove(function(e){

		self.mouseX = e.pageX;
		self.mouseY = e.pageY;

		if (self.mouseX < $(window).width()/2) { 
			self.thumb.css('left', (self.mouseX+10)+'px');
		} else {
			self.thumb.css('left', (self.mouseX-170)+'px');
		}
		if (self.mouseY < $(window).height()/2) {
			self.thumb.css('top', (self.mouseY+10)+'px');
		} else {
			self.thumb.css('top', (self.mouseY-130)+'px');
		}
	});

	this.timelineEl.mousedown( function(e) {
		var x = e.pageX - self.timelineSelectorEl.parent().offset().left;//left;
		self.timelineSelector.setLeft( x );
		self.timelineSelector.setRight( x ); 				
		self.mousePressed = true;
		self.mouseDragged = false;
		$('.timeline-marker').fadeIn();
	});

	this.timelineEl.mousemove( function(e) {

		var px = e.pageX - self.timelineSelectorEl.parent().offset().left;
	
		var posTime = camPage.timeline.getTimeByPosition( px );
		self.updateTime( posTime );		
		//console.log( "posTime: " + new Date(posTime) + "  " + px);

		if ( self.mousePressed ) {
			self.mouseDragged = true;
			var x = e.pageX - self.timelineSelectorEl.parent().offset().left;
			self.timelineSelector.setBounds( x ); 				
			// self.timelineSelector.showTimes();
			
			// var leftMarkerPos = self.timelineSelector.left;	
			// var leftTime = camPage.timeline.getTimeByPosition( leftMarkerPos );
			// leftTime = self.formattedTimeFromTimestamp( leftTime );
			
			// var rightMarkerPos = self.timelineSelector.right;	
			// var rightTime = camPage.timeline.getTimeByPosition( rightMarkerPos );
			// rightTime = self.formattedTimeFromTimestamp( rightTime );

			// self.timelineSelector.updateTimes(leftTime);
		}
	});

	this.timelineEl.mouseup( function(e) {
		
		self.timelineSelector.hideTimes();

		self.mousePressed = false;
		$('.timeline-marker').fadeOut();
		
		if ( !self.mouseDragged ) {
			// console.log("that was a click");
			// debugger;
			if (self.mode === 'live') {
				console.log('switch to archive');
				self.switchToArchive();
			}
		}
		else { 
			// console.log("that was a drag");
			var startTime = self.timeline.getTimeByPosition(
				self.timelineSelector.left
			);

			var endTime = camPage.timeline.getTimeByPosition(
				self.timelineSelector.right
			);
			// console.log( "startTime: " + startTime + "  endTime: " + endTime	);
			camPage.zoom(startTime, endTime);	

			self.timelineSelector.setLeft( 0 );
			self.timelineSelector.setRight( 0 ); 				
		}
	});
	
	this.timelineEl.mouseleave( function() {
		self.thumb.hide();
	});
};

CameraPage.prototype.switchToArchive = function() {

	self.mode = 'archive';
	var dateInput = this.inputs.date;
	var begin_date = dateInput.val();
	if (!begin_date) return;
	
	begin_date = new Date( begin_date );
	var end_date = new Date(begin_date);

	end_date.setHours(23);
	end_date.setMinutes(59);
	end_date.setSeconds(59);

	begin_date = Date.parse( begin_date );
	end_date   = Date.parse( end_date );

	self.streamId = self.inputs.streams.val();
	self.player.playVideo( self.camId, self.streamId, begin_date, end_date );
	// self.play( begin_date, end_date );
}

CameraPage.prototype.setupTimeline = function() {

	self = this;

	var timelineContainer = $("<div>", {
		id:     "timeline-container",
		class:  "timeline-container"
	});

	timelineContainer.appendTo( self.timelineTag )
		.mouseleave( function() {
			self.thumb.hide();
		}
	);

	this.timeline = new Timeline("#timeline-container", { 
		static:    true,
		seekable:  true,
		timeSpan:  24*60*60*1000,  // 1 day
		offset:    0
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

CameraPage.prototype.setupSocket = function() {

	this.socket = io.connect();

	this.socket.on('newThumb', function(data) {
	//	updateThumb( data );
	});

	this.socket.on('newChunk', function (data) {
		// console.log(data);
		// $("#timeline-"+data.stream).animate({
		// 	backgroundColor: "none"
		// }, 1000);
	//	updateTimelines(data, {updateThumb: false});
	});
};


CameraPage.prototype.setupDatepicker = function() {

	var self = this;
	var dateInput = this.inputs.date;

	dateInput.pickadate();

	dateInput.change( function() {
					
		self.zoomHistory = [];

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

		// this.currBegin
		// this.currEnd 
		
		if( !self.currBegin || !self.currEnd ) {
			bootbox.alert('Select a day and a time interval first.');
			return;
		}

		var stream = self.inputs.streams.val();
		var begin  = new Date( self.currBegin );
		var end    = new Date( self.currEnd );

		bootbox.confirm('Download video<br><br> <b>FROM</b>: ' + begin + '<br> <b>TO</b>: ' + end  + '<br><br> Confirm? ', function(ok) {
			if(!ok) {
				return;	
			} else {
				var url = window.location.origin 
						+ "/cameras/" + self.camId
						+ "/download?begin=" + self.currBegin
						+ "&end=" + self.currEnd 
						+ "&stream=" + stream;

				window.location = url;
			}
		});


	});

	// snapshot button
	this.buttons.snapshot.click(function() {
		// $("#file-list").html("<span class='subtle'>loading...</span>");
		// var time = 1000*moment( self.inputs.date.val() ).unix(); 
		// getSnapshot(time);
	});

	// livestream button
	this.buttons.livestream.click(function() {
		var stream = self.inputs.streams.val();
		if (!stream) {

		}
		self.mode = 'live';
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


CameraPage.prototype.loadIndexer = function( begin, end, cb ) {

	var self = this;
	
	this.indexer.clear();

    $.getJSON(	"/cameras/" + this.camId + 
				"/streams/" + this.streamId + 
				"/list_videos?start=" + begin +
				"&end=" + end, 
		function( data ) {

			for (var i = 0; i < data.videos.length; i++) {
				
				var start = data.videos[i].start;
				var end   = data.videos[i].end;

				self.indexer.push( data.videos[i] );	
			}
			if(cb) cb();
		}
	);
};


CameraPage.prototype.zoomBack = function() {
	
	var self = this;
	var z = this.zoomHistory.pop();
	if ( z ) {
		self.launchTimeline( 5, z.begin, z.end );	
	} 
	if ( !this.zoomHistory.length ) {
		$('#zoom-back').fadeOut();
	}
}


CameraPage.prototype.zoom = function( begin, end ) {

	var self = this;

	this.zoomHistory.push({
		begin:  this.currBegin,
		end:    this.currEnd
	});
	
	$('#zoom-back').fadeIn();

	self.launchTimeline( 5, begin, end ); // 50
}

CameraPage.prototype.play = function( begin, end ) {

	var self = this;

	self.mode = 'archive';
	console.log(end);
	if (begin && end && self.mode !== 'live') {
		var timelineOverlay = $('<div>', {
			style:'position: absolute; z-index: 1000; top:0; left:0; width:100%; height:100%; background:rgba(250,250,250,0.8);margin:0; padding:6;color: rgba(100,100,100,0.5)',
			class:'timelineOverlay csspinner line back-and-forth no-overlay',
			html:'loading...'
		}).appendTo('#timeline-container');
	}

	this.loadIndexer( begin, end, function() {
		self.launchTimeline( 5, begin, end); // 50
		self.player.playVideo( self.camId, self.streamId, begin, end );
		$('.timelineOverlay').fadeOut(function() {
			$('.timelineOverlay').remove();
		});

		self.buttons.toggleMotion.fadeIn();
		self.buttons.toggleMotion.prop('disabled', true);
		self.buttons.toggleMotion.html('loading motion data...');

		self.loadMotionData( begin, end, function() {
			self.buttons.toggleMotion.prop('disabled', false);
			if (self.showMotion) {
				self.overlayMotionData();
			} else {
				self.hideMotionData();
			}
		});
	});


}


CameraPage.prototype.launchTimeline = function( block_size, begin, end) {

	// console.log("launch timeline: " + new Date(begin) ) ;
	var self = this;

	var beginTime = self.formattedTimeFromTimestamp( begin );
	var endTime   = self.formattedTimeFromTimestamp( end );

	$('#timeline-begin-time').html( beginTime );
	$('#timeline-end-time').html( endTime );

// 	$('#timeline-begin-time').fadeOut( 100, function() {
// 		$('#timeline-begin-time').html( beginTime ).fadeIn();
// 	});
//
// 	$('#timeline-end-time').fadeOut( 100, function() {
// 		$('#timeline-end-time').html( endTime ).fadeIn();
// 	});

	this.currBegin = begin;
	this.currEnd   = end;

	this.timeline.clear();

	block_size = block_size || 2;
	var elements;
	if (block_size == 1) {
		elements = this.indexer.elements;
	} else {
		elements = this.indexer.agglutinate(block_size);
	}

	this.timeline.setEnd( end );
	this.timeline.setBegin( begin );

	for( var i in elements ) {

		var start = elements[i].start;
		var end   = elements[i].end;
	
		self.updateTimelines({
			cam:        self.camId,
			stream:     self.streamId,
			start:      start,
			end:        end,
			totalTime:  elements[i].totalTime,
			thumb:      elements[i].thumb
		});
	}

	if (self.showMotion) {
		self.overlayMotionData();
	}
};

CameraPage.prototype.loadMotionData = function( start, end, cb ) {

	var self = this;

	$.getJSON(	"/cameras/" + self.camId + 
			"/sensors?start=" + start + 
			"&end=" + end,
			function( data ) {
				self.motionData = data;
				if (cb) cb(data);
			}
		);
	
//	development
	// $.getJSON( "/dev/motion?start=" + start + "&end=" + end,
	// 		function(data) {
	// 			self.motionData = data;
	// 			if( cb ) cb(data);
	// 		});
};


CameraPage.prototype.toggleMotion = function() {
	if (!self.showMotion) {
		self.showMotion = true;
		self.overlayMotionData();
	} else {
		self.showMotion = false;
		self.hideMotionData();
	}
}


CameraPage.prototype.hideMotionData = function() {
	var self = this;
	self.timeline.resetColors();	
	self.buttons.toggleMotion.html('show motion');
}

CameraPage.prototype.overlayMotionData = function() {

	var self = this;

	if (self.motionData && self.motionData.data) {
		var prevTime = 0;
		for (var i in self.motionData.data) {
			var start = parseInt( self.motionData.data[i].t );
			var duration = 1000;
			if (self.timeline && start - prevTime > duration) {
				prevTime = start;
				self.timeline.paintRectByTime( start, duration, 'rgb(240,160,60)' );
			}
		}
	}

	self.buttons.toggleMotion.html('hide motion');
};


CameraPage.prototype.updateTimelines = function( data, options ) {

	var self = this;

	if (!self.timeline) {
		console.log("ERROR: no such timeline");
		return;
	}

	var thumb = "/cameras/" + this.camId + "/streams/" + this.streamId + "/thumb/" + data.thumb;

	var img = new Image();
		
	var showThumbWrapper = function(d) { 
		self.showThumb(d.attr("data-thumb"));
		// self.updateTime( parseInt(d.attr('data-start'))  );
	};

	self.timeline.append({
		start:       data.start,
		w:           data.end - data.start,
		thumb:       thumb,
		totalTime:   data.totalTime,
		mouseover:   showThumbWrapper,
		mouseclick:  function(d) {
			self.jumpTo(self, d);
		}
	});
}


CameraPage.prototype.updateTime = function( time ) {

	var t       = new Date(time);
	var hours   = t.getHours();
	var minutes = t.getMinutes();
	var seconds = t.getSeconds();

	if ( parseInt(seconds) < 10) seconds = '0' + seconds;
	if ( parseInt(minutes) < 10) minutes = '0' + minutes;

	var formattedTime = hours + ':' + minutes + ':' + seconds;
	$('#thumb-time').html(formattedTime);
};


CameraPage.prototype.showThumb = function( thumb ) {
   
	var currentThumb = this.thumbImg.attr('src');

	this.thumb.show();

	this.lastThumbRequest = this.lastThumbRequest || Date.now() - 1000;
	var dt = Date.now() - this.lastThumbRequest;
	
	if (currentThumb !== thumb && dt > 100) {
		this.lastThumbRequest = Date.now();
		this.thumbImg.attr('src', thumb);
	} else {
		
	}
}


CameraPage.prototype.jumpTo = function(cameraPage, d) {

	console.log('jump to');

	var self = cameraPage;

	// var player = document.getElementById("strobeMediaPlayback");
	var time   = parseInt( d.attr('data-totalTime') );

	var rx = d3.mouse(d[0][0])[0];
	rx = rx / self.timeline.width;
	var px = parseFloat( d.attr('x') )/100.0;
	var offset = (rx - px) * self.timeline.width;
	var t_offset = offset * self.timeline.timeSpan / self.timeline.width;
	t_offset /= 1000;
	
	if ( this.player && this.player.canSeekTo(time + t_offset) ) {
		this.player.seek(time + t_offset);
		this.player.play();
	}
}


CameraPage.prototype.formattedTimeFromTimestamp = function( timestamp ) {

    var
        date          = new Date(timestamp),
        hours         = (date.getHours()   < 10 ? '0' + date.getHours()   : date.getHours()),
        minutes       = (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes()),
        seconds       = (date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds()),
        formattedTime = hours + ':' + minutes + ':' + seconds;

    return formattedTime;
}

