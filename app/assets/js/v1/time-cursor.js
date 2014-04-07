function TimeCursor( timeline ) {
	
	var self = this;
	
	var el = $("<div>",
		class: 'cursor'
	).appendTo( timeline.el );

	self.timeline = timeline;
	self.el = el;
}


TimeCursor.prototype.moveTo = function( relative_time ) {

	var self = this;
	
	var timelineWidth = self.timeline.el.width();	
	var totalTime = self.timeline.totalTime();
	var pos = time * (1.0 * timelineWidth) / totalTime;
	$("#marker").css("left", pos);

};

