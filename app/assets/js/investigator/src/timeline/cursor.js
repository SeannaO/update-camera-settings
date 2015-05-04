var React           = require('react/addons');
var PureRenderMixin = require('react/addons').addons.PureRenderMixin;

var Cursor = React.createClass({

	mixins: [
		PureRenderMixin
	],

	render: function() {

		var position = this.props.position;

		var style = {
			left:        this.props.position + 'px',
			background:  this.props.color,
			display: 	 isNaN( position ) ? 'none' : '',
			opacity:     this.props.loading ? 0.5 : 1.0
		}

		return(
			<div
				ref       = 'cursor'
				className = 'timeline-cursor'
				style     = {style}>
			</div>
		);
	}
});


module.exports = Cursor;
