var Timeline = function( el, options ) {

	var self = this;

	options = options || {};
	
	this.begin    = options.begin;
	this.end      = options.end;
	this.seekable = options.seekable;

	this.awaitingTags = [];
	
	if ( isNaN(options.offset) ) {
		this.offset = 15000;
	} else {
		this.offset = options.offset;
	}


	this.index = [];

	this.el = $(el);
	this.width = this.el.width();

	this.setTimeSpan( options.timeSpan || options.totalTime || 30*60*1000 );

//
	this.streamId = options.streamId;
	this.camId = options.camId;
	this.indexer = new Indexer();
	this.zoomHistory = [];

	this.thumb    = $('#thumb');
	this.thumbImg = $('#thumb img');
	this.marker   = $('#marker');

	this.timelineSelectorEl = $("#timeline-selector");
	this.timelineSelector   = new TimelineSelector("#timeline-selector");

	this.liveOverlay = $('<div>', {
			class:'liveOverlay timelineOverlay',
			html:'showing live stream... click here or select a date to play archived video'
		}).hide().appendTo(el);

	this.overlay = $('<div>', {
			class:'loadingOverlay timelineOverlay csspinner line back-and-forth no-overlay',
			html:'loading...'
		}).hide().appendTo(el);

	this.mouse = {
		pressed:   false,
		dragged:  false,
		x:             0,
		y:             0
	};
//
	// this.el = el;

	var chart = d3.select(el)
		.append("svg")
		.attr("width", "100%")
		.attr("height", 30)
		.attr("class", "chart")
		.style("background", "none");

	this.timeline = chart.append("g")
		.attr("width", "100%")
		.attr("height", 20)
		.attr("class", "boxes");

	this.timeline.append("g")
		.append("line")
		.attr("x1", 0)
		.attr("y1", 10)
		.attr("x2", "100%")
		.attr("y2", 10)
		.attr("stroke", "lightgray");

	this.startTime = $("<div>", {
		html: '',
		class: 'timeline-start-time'
	}).appendTo(el);

	this.endTime = $("<div>", {
		html: '',
		class: 'timeline-end-time'
	}).appendTo(el);

	this.boxes = this.timeline.append("g");	

	if (!options.static) {
		setInterval( function() {
			self.refresh();
		}, 1000);
	}

	////
	this.setupEvents();
	////
};

//
//
//

Timeline.prototype.setupEvents = function() {

	var self = this;
	
	$(window).on('currentTimeChange', function(e, time) {

		var timelineWidth      = self.el.width();
	    var totalTime          = self.getTimeSpan()/1000.0;
		var absolute_time      = self.indexer.getAbsoluteTime( time );
		var dt                 = ( absolute_time - self.begin )/1000.0;
		var pos                = dt * (1.0 * timelineWidth) / totalTime;

		var formattedCurrTime = new Date(absolute_time);
		$("#curr-time").html(formattedCurrTime);

		self.marker.css("left", pos);

		if ( parseInt(self.marker.css('left')) > timelineWidth*1.05 ) {
			self.marker.hide();
		} else {
			self.marker.show();
		}
	});

	this.liveOverlay.click( function() {
		$(window).trigger('switch_to_archive');
	});

	this.el.mousedown( function(e) {
		var x = e.pageX - self.timelineSelectorEl.parent().offset().left;//left;
		self.timelineSelector.setLeft( x );
		self.timelineSelector.setRight( x ); 				
		self.mouse.pressed = true;
		self.mouse.dragged = false;
		$('.timeline-marker').fadeIn();
	});

	this.el.mousemove( function(e) {

		var px = e.pageX - self.timelineSelectorEl.parent().offset().left;
	
		var posTime = self.getTimeByPosition( px );
		self.updateTime( posTime );		

		if ( self.mouse.pressed ) {
			self.mouse.dragged = true;
			var x = e.pageX - self.timelineSelectorEl.parent().offset().left;
			self.timelineSelector.setBounds( x ); 				
		}
	});

	this.el.mouseup( function(e) {
		
		self.timelineSelector.hideTimes();

		self.mouse.pressed = false;
		$('.timeline-marker').fadeOut();
		
		if ( !self.mouse.dragged ) {
			// console.log("that was a click");
		} else { 
			// console.log("that was a drag");
			var startTime = self.getTimeByPosition(
				self.timelineSelector.left
			);

			var endTime = self.getTimeByPosition(
				self.timelineSelector.right
			);
			
			self.zoom(startTime, endTime);	

			self.timelineSelector.setLeft( 0 );
			self.timelineSelector.setRight( 0 ); 				
		}
	});
	
	this.el.mouseleave( function() {
		self.thumb.hide();
	});

	$(document).mousemove(function(e){

		self.mouse.x = e.pageX;
		self.mouse.y = e.pageY;

		if (self.mouse.x < $(window).width()/2) { 
			self.thumb.css('left', (self.mouse.x+10)+'px');
		} else {
			self.thumb.css('left', (self.mouse.x-170)+'px');
		}
		if (self.mouse.y < $(window).height()/2) {
			self.thumb.css('top', (self.mouse.y+10)+'px');
		} else {
			self.thumb.css('top', (self.mouse.y-130)+'px');
		}
	});


	$('#zoom-back').click( function() {
		self.zoomBack();
	});
};

Timeline.prototype.updateTime = function( time ) {

	var t       = new Date(time);
	var hours   = t.getHours();
	var minutes = t.getMinutes();
	var seconds = t.getSeconds();

	if ( parseInt(seconds) < 10) seconds = '0' + seconds;
	if ( parseInt(minutes) < 10) minutes = '0' + minutes;

	var formattedTime = hours + ':' + minutes + ':' + seconds;
	$('#thumb-time').html(formattedTime);
};

Timeline.prototype.load = function(begin, end, cb) {

	var self = this;
	this.overlay.fadeIn();

	self.loadIndexer( begin, end, function() {
		self.overlay.fadeOut();
		self.render(5, begin, end);

		self.loadMotionData( begin, end );

		if (cb) cb();
	});
};


Timeline.prototype.loadIndexer = function(begin, end, cb) {
	
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


Timeline.prototype.zoomBack = function() {
	
	var self = this;
	var z = this.zoomHistory.pop();
	if ( z ) {
		self.render( 5, z.begin, z.end );	
	} 
	if ( !this.zoomHistory.length ) {
		$('#zoom-back').fadeOut();
	}
};


Timeline.prototype.zoom = function( begin, end ) {

	var self = this;

	this.zoomHistory.push({
		begin:  this.currBegin,
		end:    this.currEnd
	});
	
	$('#zoom-back').fadeIn();

	self.render( 5, begin, end ); // 50
};


Timeline.prototype.loadMotionData = function(start, end, cb) {
	
	var self = this;

	// $.getJSON( "/dev/motion?start=" + start + "&end=" + end,   // <-- development
	$.getJSON(	"/cameras/" + self.camId + 
			"/sensors?start=" + start + 
			"&end=" + end,
			function( data ) {
				self.motionData = data;

				$(window).trigger('motion_loaded', {
					streamId: self.streamId,
					camId: self.camId,
					shown: self.showMotion
				});

				if (self.showMotion) {
					self.overlayMotionData();
				} else {
					self.hideMotionData();
				};

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


Timeline.prototype.toggleMotion = function() {
	
	var self = this;

	if (!self.showMotion) {
		self.showMotion = true;
		self.overlayMotionData();
	} else {
		self.showMotion = false;
		self.hideMotionData();
	}
};


Timeline.prototype.overlayMotionData = function() {

	var self = this;

	$(window).trigger('toggle_motion', {
		show: true
	});

	if (self.motionData && self.motionData.data) {
		var prevTime = 0;
		for (var i in self.motionData.data) {
			var start = parseInt( self.motionData.data[i].t );
			var duration = 1000;
			if (self.timeline && start - prevTime > duration) {
				prevTime = start;
				self.paintRectByTime( start, duration, 'rgb(240,160,60)' );
			}
		}
	}
};


Timeline.prototype.hideMotionData = function() {
	var self = this;

	$(window).trigger('toggle_motion', {
		show: false
	});

	self.resetColors();	
};


Timeline.prototype.render = function(block_size, begin, end) {
	
	var self = this;

	var beginTime = Timeline.formattedTimeFromTimestamp( begin );
	var endTime   = Timeline.formattedTimeFromTimestamp( end );

	// $('#timeline-begin-time').html( beginTime );
	// $('#timeline-end-time').html( endTime );

	this.currBegin = begin;
	this.currEnd   = end;

	if ( isNaN(begin) || isNaN(end) ) return;

	var dx = self.width/10.0;
	var dt = Math.round( (end - begin)/10 );

	$('.tick').remove();
	$('.timeline-time').remove();

	var prevTime;

	for (var i = 0; i <= 10; i++) {
		var tick = $('<div>', {
			class: 'tick',
		}).appendTo(self.el);
		tick.css('left', i*dx + 'px');
		
		var t = begin + i*dt; 
		var showSeconds = dt < 60000;

		var time = Timeline.formattedTimeFromTimestamp( t, showSeconds );

		var timeEl = $('<div>', {
			class: 'timeline-time',
			html: time
		}).appendTo(self.el);
		timeEl.css('left', i*dx - 15 + 'px')
	}

	this.clear();

	block_size = block_size || 2;
	var elements;
	if (block_size == 1) {
		elements = this.indexer.elements;
	} else {
		elements = this.indexer.agglutinate(block_size);
	}

	this.setEnd( end );
	this.setBegin( begin );

	for( var i in elements ) {

		var start = elements[i].start;
		var end   = elements[i].end;
	
		var thumb = "/cameras/" + this.camId + "/streams/" + this.streamId + "/thumb/" + elements[i].thumb;

		var img = new Image();

		var showThumbWrapper = function(d) { 
			self.showThumb(d.attr("data-thumb"));
		};

		self.append({
			start:       start,
			w:           end - start,
			thumb:       thumb,
			totalTime:   elements[i].totalTime,
			mouseover:   showThumbWrapper,
			mouseclick:  function(d) {
				self.jumpTo(d);
			}
		});
	}
	
	if (self.showMotion) {
		self.overlayMotionData();
	}

};


Timeline.prototype.jumpTo = function( d ) {

	var self = this;

	var time   = parseInt( d.attr('data-totalTime') );

	var rx = d3.mouse(d[0][0])[0];
	rx = rx / self.width;
	var px = parseFloat( d.attr('x') )/100.0;
	var offset = (rx - px) * self.width;
	var t_offset = offset * self.timeSpan / self.width;
	t_offset /= 1000;

	$(window).trigger('jumpTo', {
		camId: self.camId,
		streamId: self.streamId,
		time: time + t_offset
	});
};

Timeline.prototype.showThumb = function( thumb ) {
   
	var currentThumb = this.thumbImg.attr('src');

	this.thumb.show();

	this.lastThumbRequest = this.lastThumbRequest || Date.now() - 1000;
	var dt = Date.now() - this.lastThumbRequest;
	
	if (currentThumb !== thumb && dt > 100) {
		this.lastThumbRequest = Date.now();
		this.thumbImg.attr('src', thumb);
	} else {
		
	}
};


Timeline.formattedTimeFromTimestamp = function( timestamp, showSeconds ) {

    var
        date          = new Date(timestamp),
        hours         = (date.getHours()   < 10 ? '0' + date.getHours()   : date.getHours()),
        minutes       = (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes()),
        seconds       = (date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds()),
        formattedTime = hours + ':' + minutes;
		
	if (showSeconds) formattedTime = formattedTime + ':' + seconds;

    return formattedTime;
};
// 
//
// 

Timeline.prototype.refresh = function() {
	var self = this;
	var rects = self.boxes.selectAll("rect");

	for (var i in rects[0]) {
		var r = d3.select(rects[0][i]);
		var x = parseFloat( r.attr("x") );
		var d = parseInt( r.attr("data-start") );
		var w = parseFloat( r.attr("width") );

		if (x + w < 0) {
			r.remove();
		} else {
			r.attr("x", self.scaleX( d ) + "%");
		}
	}

	var start = formattedTimeFromTimestamp( Date.now() - this.timeSpan);
	var end   = formattedTimeFromTimestamp( Date.now() - 15000 );
	// var end   = formattedTimeFromTimestamp( Date.now() - 15000 );

	$(this.startTime).html( start );
	$(this.endTime).html( end );
};


Timeline.prototype.getFirstRectAfterTime = function( time, begin, end ) {
	
	var self = this;

	if ( isNaN(begin) || isNaN(end) ) {

		begin = 0;
		end = self.index.length-1;

		return self.getFirstRectAfterTime( time, begin, end );

	} else {
		var middle = Math.floor( (end + begin)/2 );
		if ( time > self.index[begin].start && time < self.index[middle].end ) {
			end = middle;
		} else if ( time > self.index[middle].start && time < self.index[middle].end ) {
			start = middle;	
		} else if ( time < self.index[begin].start ) {
			return self.index[begin]
		}

		return self.getFirstRectAfterTime( relative_time, begin, end );
	}
};


Timeline.prototype.getRectByRelativeTime = function( relative_time, begin, end) {

	var self = this;
	if ( isNaN(begin) || isNaN(end) ) {
		begin = 0;
		end = self.index.length-1;
		return self.getRectByRelativeTime( relative_time, begin, end );
	} else if (end - begin <= 1) {
		return self.index[begin];
	} else {
		var middle = Math.floor( (end + begin)/2 );
		if ( relative_time > self.index[middle].totalTime ) {
			begin = middle;
		} else {
			end = middle;	
		}
		return self.getRectByRelativeTime( relative_time, begin, end );
	}
};


Timeline.prototype.scaleX = function( t ) {
	var self = this;
	var x;

	if (!self.end) {
		x = 100 - this.dx * ( Date.now() - t - self.offset);
		// x = 100 - this.dx * ( Date.now() - t - 15000);
	} else {
		x = 100 - this.dx * ( self.end - t - self.offset);
		// x = 100 - this.dx * ( self.end - t - 15000);
	}
	
	return x;
};


Timeline.prototype.scaleW = function( t ) {
	var w = this.dx * t;
	return w;
};


Timeline.prototype.setBegin = function( begin ) {
	this.begin = begin;
	this.setTimeSpan( this.end - this.begin );
};

Timeline.prototype.setEnd = function( end ) {
	this.end = end;
	this.setTimeSpan( this.end - this.begin );
};

Timeline.prototype.getFirstBox = function() {
	if ( this.boxes.selectAll('rect').length > 0 ) {
		return this.boxes.selectAll('rect')[0][0];
	} else {
		return;
	}
};


Timeline.prototype.paintRectByTime = function( time, duration, color ) {

	var self = this;

	if ( !color ) {
		color = duration || 'rgba(200,200,100)';
		duration = 0;
	}

	for (var i = 0; i <= duration; i += 5000) {
		var t = time + i;

		var rect = self.findRectByTime( t );

		if (rect) {
			$(rect).css('fill', color);
			$(rect).css('stroke', color);
		} else {
			if ( Date.now() - t < 30000 ) {
			    var tag = self.awaitingTags[self.awaitingTags.length-1];
				var lastTime = 0;
				if (tag) lastTime = tag.time;
				if ( time - lastTime > 25000 )	{
					self.awaitingTags.push({
						time: time, 
						duration: duration,
						color: color
					});
				}
			}
			else {
				// console.log('no rect');
			}
		}
	}

};


Timeline.prototype.resetColors = function() {

	var self = this;

	var color = 'rgb(100,100,200)';

	var rects = self.boxes.selectAll('rect')[0];
	for (var i in rects) {
		$(rects[i]).css('fill', color);
		$(rects[i]).css('stroke', color);
	}
};


Timeline.prototype.findRectByTime = function( time, begin, end ) {

	var self = this;

	var rects = self.boxes.selectAll('rect')[0];
	
	if ( isNaN(begin) || isNaN(end) ) {
		begin = 0; 
		end = rects.length-1; 
	}

	if (begin > end) {
		return;
	}

	var middle = Math.round( (begin + end)/2 );
	var middle_time = parseInt( $(rects[middle]).attr('data-start') );
	var middle_duration = parseInt( $(rects[middle]).attr('data-duration') );

	if ( time >= middle_time & time <= middle_time + middle_duration) {
		return rects[middle];
	} else if (time < middle_time) {
		return self.findRectByTime( time, begin, middle-1 );
	} else {
		return self.findRectByTime( time, middle+1, end);
	}

};


Timeline.prototype.append = function( data ) {

	var self = this;

	var colour = data.colour || 'rgb(100,100,200)';

	var rect = self.boxes.append('rect')
		.attr('data-start',       data.start)
		.attr('data-totalTime',   data.totalTime)
		.attr('data-duration',    data.w)
		.attr('data-thumb',       data.thumb)
		.attr('x',                self.scaleX( data.start ) + "%")
		.attr('y',                10)
		.attr('width',            self.scaleW(data.w) + "%" )
		.attr('height',           15)
		.style('fill',            colour)
		.style('stroke',          colour)
		.style('stroke-width',    '2')
		// .attr('class', 'basicChunk')
		.on('mouseover', function() {
			var d = d3.select(this);
			data.mouseover(d);
		})
		.on('click', function() {
			var d = d3.select(this);
			data.mouseclick(d);
		});

	if( this.seekable ) {
		var indexed_box = {
			rect:      rect,
			start:     data.start,
			duration:  data.w
		}
		self.pushToIndex( indexed_box );
	}

	if (Date.now() - data.start < 30000) {
		for (var i = 0; i < 1; i++) {
			var tag = self.awaitingTags.pop();
			if (tag && Date.now() - tag.time < 30000) {
				self.paintRectByTime( tag.time, tag.duration, tag.color );
			}
		}
	}
	
};


Timeline.prototype.clear = function() {
		
	this.boxes.selectAll('rect').data([]).exit().remove()
	console.log("clearing timeline");
}


Timeline.prototype.pushToIndex = function( indexed_box ) {
};


Timeline.prototype.totalTime = function() {
	var self = this;
	var l = self.index.length;
	var totalTime = l > 0 ? self.index[l-1].totalTime : 0;
	return totalTime;
};

//
// Timeline.prototype.begin = function() {
// 	var self = this;
// 	var l = self.index.length;
// 	if ( l <= 0 ) return 0;
//
// 	return self.index[0].start;
// }


Timeline.prototype.end = function() {
	var self = this;
	var l = self.index.length;
	if ( l <= 0 ) return 0;

	return self.index[l-1].start;
}


Timeline.prototype.setTimeSpan = function( t ) {
	this.timeSpan = t;
	this.dx = 100.0 / this.timeSpan;
}


Timeline.prototype.getTimeSpan = function() {
	return this.timeSpan;
}


Timeline.prototype.getTimeByPosition = function( x ) {
	
	var dt = 1.0 * this.timeSpan / this.width;
	return x * dt + this.begin;
}





