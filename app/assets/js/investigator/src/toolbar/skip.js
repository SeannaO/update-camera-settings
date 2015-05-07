var React = require('react/addons');
var bus   = require('../services/event-service.js');

var Skip = React.createClass({

	handleClick: function() {
		
		bus.emit('skip', {
			dt: this.props.dt
		});
	},

	render: function() {

		var className = 'btn-highlight glyphicon ';

		if( this.props.dt < 0) {
			className += ' ' + 'glyphicon-backward';
		} else {
			className += ' ' + 'glyphicon-forward';
		}

		var style = {
			fontSize: '15pt'
		};

		
		return(
			<span 
				className = {className}
				style     = {style}
				onClick   = {this.handleClick}
			>
			</span>
		);
	}
});

module.exports = Skip;
