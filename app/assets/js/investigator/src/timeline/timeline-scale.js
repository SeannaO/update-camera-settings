var React  = require('react/addons');
var moment = require('moment');

var PureRenderMixin = require('react/addons').addons.PureRenderMixin;

var TimelineScale = React.createClass({

	mixins: [ PureRenderMixin ],

	getScale: function() {
		
		var begin = this.props.begin,
			end   = this.props.end;

		if ( isNaN(begin) || isNaN(end) ) return;

		var nTicks = 10;

		if (this.props.width < 500) {
			nTicks = 5;
		} else if (this.props.width > 1000) {
			nTicks = 15;
		}

		var dx = 1.0 * this.props.width/nTicks;
		var dt = Math.round( (end - begin)/nTicks );

		var prevTime;

		var ticks = [];


		for (var i = 0; i <= nTicks; i++) {

			var position = {
				left: i*dx + 'px'
			};

			ticks.push( 
				<div 
					key = {i}
					className = 'tick'
					style     = {position}
				/>
			);

			var t = begin + i*dt; 
			var showSeconds = dt < 60000;

			var time = '';
			if (showSeconds) {
				time = moment(t).format('H:mm:ss');
			} else {
				time = moment(t).format('H:mm');
			}

			position = {
				left: i*dx + - 15 + 'px'
			}

			ticks.push(
				<div 
					className = 'timeline-time'
					style = {position}
				>
					{time}
				</div>
			)
		}
		return ticks;
	},

	render: function() {

		var scale = this.getScale();

		return(
			<div>
				{scale}
			</div>
		);
	}
});


module.exports = TimelineScale;
