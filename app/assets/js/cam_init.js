function CameraPage( camId ) {

	this.mouseX = 0;
	this.mouseY = 0;

	this.camId = camId;
	this.streamId = '';

	this.inputs  = {};
	this.buttons = {};

	this.inputs.date    = $('#begin_date');
	this.inputs.streams = $('#stream-selector');
	
	this.buttons.download   = $('#download');
	this.buttons.snapshot   = $('#snapshot');
	this.buttons.livestream = $('#get-livestream');

	this.marker = $('#marker');

	this.indexer = new Indexer();
	this.player = new Player('#video');
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
	
	window.onCurrentTimeChange = function (time, playerId) {
		var timelineWidth = $("#timeline").width();	
	    var totalTime = 24*60*60;
		var absolute_time = self.indexer.getAbsoluteTime( time );
		var dt = ( absolute_time - self.timeline.begin )/1000; 
		var pos = dt * (1.0 * timelineWidth) / totalTime - 2;
		self.marker.css("left", pos);
 	}

	$(document).mousemove(function(e){

		self.mouseX = e.pageX;
		self.mouseY = e.pageY;

		if (self.mouseX < $(window).width()/2) { 
			$("#thumb").css('left', (self.mouseX+10)+'px');
		} else {
			$("#thumb").css('left', (self.mouseX-170)+'px');
		}
		if (self.mouseY < $(window).height()/2) {
			$("#thumb").css('top', (self.mouseY+10)+'px');
		} else {
			$("#thumb").css('top', (self.mouseY-130)+'px');
		}
	});
};


CameraPage.prototype.setupTimeline = function() {

	$('#timeline').html('');

	var timelineContainer = $("<div>", {
		id:     "timeline-container",
		class:  "timeline-container"
	});

	timelineContainer.appendTo("#timeline")
		.mouseleave( function() {
			$("#thumb").hide();
		}
	);

	this.timeline = new Timeline("#timeline-container", { 
		static:    true,
		seekable:  true,
		timeSpan:  24*60*60*1000
	});

};


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
		// console.log('setupDatePicker()');
		// playVideo( camId, streamId, begin_date, end_date );
	});
};


CameraPage.prototype.setupStreamSelector = function() {

	var self = this;

	self.streamId = self.inputs.streams.val();
	
	// debugger;
	this.inputs.streams.change( function() { 

		var begin_date = self.inputs.date.val();

		if (!begin_date) return;
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

		var stream = self.inputs.streams.val();
		var begin  = Date.parse( self.inputs.date.val() );
		var end    = new Date();

		if (!begin) {
			return;
		}

		end.setHours(23);
		end.setMinutes(59);
		end.setSeconds(59);
		
		end = Date.parse( end );

		var url = window.location.origin 
				+ "/cameras/" + self.camId
				+ "/download?begin=" + begin
				+ "&end=" + end 
				+ "&stream=" + stream;
		window.location = url;
	});

	// snapshot button
	this.buttons.snapshot.click(function() {
		// $("#file-list").html("<span class='subtle'>loading...</span>");
		// var time = 1000*moment( self.inputs.date.val() ).unix(); 
		// getSnapshot(time);
	});

	// livestream button
	this.buttons.livestream.click(function() {
		// showLiveStream();
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


CameraPage.prototype.play = function( begin, end ) {

	var self = this;

	this.loadIndexer( begin, end, function() {
		self.launchTimeline( 50, begin, end);
		self.player.playVideo( self.camId, self.streamId, begin, end);
	});
}


CameraPage.prototype.launchTimeline = function( block_size, begin, end) {

	var self = this;

	this.timeline.clear();

	block_size = block_size || 2;
	var elements = this.indexer.agglutinate(block_size);
	
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
}


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
		self.updateTime( parseInt(d.attr('data-start')) );
	};

	self.timeline.append({
		start:       data.start,
		w:           data.end - data.start,
		thumb:       thumb,
		totalTime:   data.totalTime,
		mouseover:   showThumbWrapper,
		mouseclick:  self.jumpTo
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
   
	var currentThumb = $("#thumb img").attr('src');

	$("#thumb").show();

	this.lastThumbRequest = this.lastThumbRequest || Date.now() - 1000;
	var dt = Date.now() - this.lastThumbRequest;
	
	if (currentThumb !== thumb && dt > 100) {
		this.lastThumbRequest = Date.now();
		$("#thumb img").attr('src', thumb);
	} else {
	}
}


CameraPage.prototype.jumpTo = function(d) {
	
	var player = document.getElementById("strobeMediaPlayback");
	var time   = parseInt( d.attr('data-totalTime') );

	if (player.canSeekTo(time) ) {
		console.log("seek to " + time);
		player.seek(time);
	}
}
