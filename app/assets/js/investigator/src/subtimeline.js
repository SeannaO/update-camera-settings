var React = require('react/addons');
var bus   = require('./event-service.js');


var Subtimeline = React.createClass({

	getInitialState: function() {
		return {
		}
	},

	getPosition: function( time ) {

		if (isNaN(time)) return;

		var timespan = this.props.end - this.props.begin;
		var d        = time - this.props.begin;
		var w        = this.props.width;

		return ( w*d / timespan );
	},
		
	shouldComponentUpdate: function( nextProps, nextState ) {
		
		
		return true;
	},

	getSegments: function() {

		var segments = [];
		var opacity = this.props.opacity;

		for(var seg of this.props.camera.segments) {
			var px = this.getPosition( seg.start );
			var w = this.getPosition( seg.end ) - px;
			var seg_style = {
				position:    'absolute',
				left:        px,
				width:       w,
				opacity: 	 opacity
			};

			segments.push(
					<div 
						key       = {seg.start}
						style     = {seg_style}
						className = 'subtimeline-segment'
					/>
			);
		}

		return (
				<div className = 'subtimeline'>
					{segments}
				</div>
	    );
	},

	render: function() {
		
		// console.log('rendering subtimeline');

		var segments = this.getSegments();
		
		return (
				<div className = 'subtimeline'>
					{segments}
				</div>
	    );
	}
});

module.exports = Subtimeline;
