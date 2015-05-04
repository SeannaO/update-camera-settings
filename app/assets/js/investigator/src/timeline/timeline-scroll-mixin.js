var React      = require('react/addons');
var tweenState = require('react-tween-state');

var TimelineScrollMixin = {

	scrollRight: function() {
		var dt = this.state.end - this.state.begin;
		var maxEnd = this.zoomHistory[0].end;

		var end = Math.min( this.state.end + dt/2, maxEnd );
		var begin = end - dt;

		this.tweenState( 'begin', {
			easing:    tweenState.easingTypes.easeInOutQuad,
			duration:  200,
			endValue:  begin
		});

		this.tweenState( 'end', {
			easing:    tweenState.easingTypes.easeInOutQuad,
			duration:  200,
			endValue: end
		});
	},

	scrollLeft: function() {
		var dt = this.state.end - this.state.begin;
		var minBegin = this.zoomHistory[0].begin;

		var begin = Math.max( this.state.begin - dt/2, minBegin );
		var end = begin + dt;

		this.tweenState( 'begin', {
			easing:    tweenState.easingTypes.easeInOutQuad,
			duration:  200,
			endValue:  begin
		});

		this.tweenState( 'end', {
			easing:    tweenState.easingTypes.easeInOutQuad,
			duration:  200,
			endValue: end
		});
	},

	getScrollButtons: function() {

		var displayLeftArrow = !!this.zoomHistory[0] && (this.state.begin != this.zoomHistory[0].begin)
		var displayRightArrow = !!this.zoomHistory[0] && (this.state.end != this.zoomHistory[0].end)

		var scrollLeftStyle = {
			display: displayLeftArrow ? '' : 'none'
		}

		var scrollRightStyle = {
			display: displayRightArrow ? '' : 'none'
		}

		return (
			<div>
				<div 
					id        = "scroll-right"
					className = 'btn-highlight noselect'
					onClick   = {this.scrollRight}
					style     = {scrollRightStyle}
				>
					<span className = 'glyphicon glyphicon-chevron-right'></span>

				</div>

				<div 
					id        = "scroll-left"
					className = 'btn-highlight noselect'
					onClick   = {this.scrollLeft}
					style     = {scrollLeftStyle}
				>	
					<span className = 'glyphicon glyphicon-chevron-left'></span>
				</div>
			</div>
	  );
	}

};

module.exports = TimelineScrollMixin;
