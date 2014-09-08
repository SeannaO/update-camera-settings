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

	// this.el = el;

	var chart = d3.select(el)
		.append("svg")
		.attr("width", "100%")
		.attr("height", 30)
		.attr("class", "chart")
		.style("background", "none")
		.style("position", "relative")
		.style("top", "-10px");
		

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
		class: 'timeline-start-time',
		style: 'top: 35px'
	}).appendTo(el);

	this.endTime = $("<div>", {
		html: '',
		class: 'timeline-end-time',
		style: 'top: 35px'
	}).appendTo(el);

	this.boxes = this.timeline.append("g");	

	if (!options.static) {
		setInterval( function() {
			self.refresh();
		}, 1000);
	}
};


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

	var d = new Date();

	var tz_offset = Date.tz_offset || 0;

	var start = formattedTimeFromTimestamp( Date.now() - this.timeSpan + tz_offset*60*60*1000 );
	var end   = formattedTimeFromTimestamp( Date.now() - 15000  + tz_offset*60*60*1000 );
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


function formattedTimeFromTimestamp(timestamp) {

    var
        date          = new Date(timestamp),
        hours         = (date.getHours()   < 10 ? '0' + date.getHours()   : date.getHours()),
        minutes       = (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes()),
        seconds       = (date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds()),
        formattedTime = hours + ':' + minutes + ':' + seconds;

    return formattedTime;
}



