var Timeline = function( el ) {

	var self = this;

	this.width = 600;
	this.totalTime = 5*60*1000;
	this.dx = this.width / this.totalTime;

	var chart = d3.select(el)
		.append("svg")
		.attr("width", self.width)
		.attr("height", 80)
		.attr("class", "chart");

	this.timeline = chart.append("g")
		.attr("width", self.width)
		.attr("height", 80)
		.attr("class", "mini");

	this.timeline.append("g")
		.append("line")
		.attr("x1", 0)
		.attr("y1", 10)
		.attr("x2", self.width)
		.attr("y2", 10)
		.attr("stroke", "lightgray");

	this.boxes = this.timeline.append("g");	

	setInterval( function() {
		self.refresh();
	}, 1000);
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
			r.attr("x", self.scaleX( d ));
		}
	}
};


Timeline.prototype.scaleX = function( t ) {
	var self = this;
	var x = self.width - this.dx * ( Date.now() - 15000 - t );
	
	return x;
};


Timeline.prototype.scaleW = function( t ) {
	var w = this.dx * t;
	return w;
};


Timeline.prototype.append = function( data ) {
	
	var self = this;

	self.boxes.append("rect")
		.attr("data-start", data.start)
		.attr("data-thumb", data.thumb)
		.attr("x", self.scaleX( data.start ))
		.attr("y", 10)
		.attr("width", self.scaleW(data.w) )
		.attr("height", 20)
		.style("fill", "rgb(100,100,200)")
		.style("stroke", "rgb(100,100,200)")
		.style("stroke-width", "2")
		.on("mouseover", function() {
			var d = d3.select(this);
			data.mouseover(d);
		});
};

