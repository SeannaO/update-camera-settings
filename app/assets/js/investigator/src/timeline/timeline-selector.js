var React = require('react/addons');

var PureRenderMixin = require('react/addons').addons.PureRenderMixin;

var TimelineSelector = React.createClass({

	mixins: [ PureRenderMixin ],

	render: function() {

		var p1 = Math.round(this.props.p1),
			p2 = Math.round(this.props.p2);

		var left  = p1 < p2 ? p1 : p2;
		var right = p1 < p2 ? p2 : p1;
		var width = right - left;

		console.log(left + ' ' + right + ' ' + width);

		var style = {
			position:       'absolute',
			top:            '0px',
			left:           left + 'px',
			width:          width + 'px',
			height:         '100%',
			background:     'rgba(200,200,200, 0.8)',
			display:        this.props.visible ? '' :  'none',
			pointerEvents:  'none',
			background:     'rgba(200,200,100, 0.7)'
		};

		return (
			<div 
				style = {style}
			>
				
			</div>
		);
	}

});

module.exports = TimelineSelector;
