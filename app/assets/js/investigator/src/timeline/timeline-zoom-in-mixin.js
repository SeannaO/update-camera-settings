var React      = require('react/addons');
var tweenState = require('react-tween-state');
var bus        = require('../event-service.js');

var TimelineZoomMixin = {

	startDragThreshold: 5,

	zoomHistory: [],

	getZoomMouseEvents: function() {
		return {
			onDrag:  this.handleDragstart,
		}
	},

	componentDidMount: function() {
		bus.on('zoom-out', this.zoomOut);
		bus.on('day-selected', this.clearHistory);
	},

	componentWillUnmount: function() {
		bus.removeListener('zoom-out', this.zoomOut);
		bus.removeListener('day-selected', this.clearHistory);
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

			this.zoomIn( beginDrag, endDrag );

			return true;
		}

		return false;
	},


	zoomIn: function( beginDrag, endDrag ) {

		this.pushZoom( this.state.begin, this.state.end );
		bus.emit('zoom-in', {});

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

	},


	zoomOut: function() {

		var zoom = this.popZoom();

		if (!zoom) {
			return;
		}
		else if (!this.zoomHistory[0]) {
			bus.emit('no-more-zoom-out',{});
		}

		this.tweenState( 'begin', {
			easing:    tweenState.easingTypes.easeInOutQuad,
			duration:  200,
			endValue:  zoom.begin
		});

		this.tweenState( 'end', {
			easing:    tweenState.easingTypes.easeInOutQuad,
			duration:  200,
			endValue:  zoom.end
		});
	},


	clearHistory: function() {
		this.zoomHistory = [];
	},

	popZoom: function() {
		var zoom = this.zoomHistory.pop();
		return zoom;
	},


	pushZoom: function(begin, end) {
		this.zoomHistory.push({
			begin:  begin,
			end:    end
		});
	}
};


module.exports = TimelineZoomMixin;
