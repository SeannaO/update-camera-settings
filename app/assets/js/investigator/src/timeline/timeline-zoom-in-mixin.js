var React      = require('react/addons');
var tweenState = require('react-tween-state');

var TimelineZoomMixin = {

	startDragThreshold: 5,

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
	},

	handleDragEnd: function(beginDrag, endDrag, dx) {

		this.setState({
			dragging:   false,
			beginDrag:  null,
			endDrag:    null
		});

		if (dx > this.startDragThreshold) {
			var begin = this.getTimeFromPosition( beginDrag );
			var end   = this.getTimeFromPosition( endDrag );

			this.tweenState( 'begin', {
				easing:    tweenState.easingTypes.easeInOutQuad,
				duration:  200,
				endValue:  begin
			});

			this.tweenState( 'end', {
				easing:    tweenState.easingTypes.easeInOutQuad,
				duration:  200,
				endValue:  end
			});
			return true;
		}

		return false;
	}
};


module.exports = TimelineZoomMixin;
