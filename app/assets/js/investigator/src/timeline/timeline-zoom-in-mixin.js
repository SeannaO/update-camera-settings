var React = require('react/addons');

var TimelineZoomMixin = {
	

	getZoomMouseEvents: function() {
		return {
			onDrag:  this.handleDragstart,
		}
	},

	handleDragstart: function(e, d) {
		var px    = e.nativeEvent.offsetX;
		var el    = this.refs.timeline.getDOMNode();
		var width = el.offsetWidth;
		
		var pos = px/width;

		var timeSpan = this.state.end - this.state.begin;

		var time = this.state.begin + pos * timeSpan;

		this.seek( time );

		this.setState({
			dragging:      true,
			dragStartPos:  px,
			dragEndPos:    null
		});

		console.log('drag start:');
	}
};


module.exports = TimelineZoomMixin;
