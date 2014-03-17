var Timeline = function( el, options ) {

	var self = this;

	options = options || {};
	
	this.begin    = options.begin;
	this.end      = options.end;
	this.seekable = options.seekable;

	this.index = [];

	this.width = 600;

	this.setTimeSpan( options.timeSpan || 30*60*1000 );

	this.el = el;

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

	var start = formattedTimeFromTimestamp( Date.now() - this.timeSpan);
	var end   = formattedTimeFromTimestamp( Date.now() - 15000 );

	$(this.startTime).html( start );
	$(this.endTime).html( end );
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
		x = 100 - this.dx * ( Date.now() - 15000 - t );
	} else {
		x = 100 - this.dx * ( self.end - 15000 - t );
	}
	
	return x;
};


Timeline.prototype.scaleW = function( t ) {
	var w = this.dx * t;
	return w;
};


Timeline.prototype.setBegin = function( begin ) {
	this.begin = begin;
};

Timeline.prototype.setEnd = function( end ) {
	this.end = end;
};

Timeline.prototype.append = function( data ) {

	var self = this;

	var rect = self.boxes.append('rect')
		.attr('data-start',       data.start)
		.attr('data-totalTime',   data.totalTime)
		.attr('data-thumb',       data.thumb)
		.attr('x',                self.scaleX( data.start ) + "%")
		.attr('y',                10)
		.attr('width',            self.scaleW(data.w) + "%" )
		.attr('height',           15)
		.style('fill',            'rgb(100,100,200)')
		.style('stroke',          'rgb(100,100,200)')
		.style('stroke-width',    "2")
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


function formattedTimeFromTimestamp(timestamp) {

    var
        date          = new Date(timestamp),
        hours         = (date.getHours()   < 10 ? '0' + date.getHours()   : date.getHours()),
        minutes       = (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes()),
        seconds       = (date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds()),
        formattedTime = hours + ':' + minutes + ':' + seconds;

    return formattedTime;
}



