var React = require('react/addons');
var bus   = require('../services/event-service.js');

var GoLiveButton = React.createClass({

	handleClick: function() {
		bus.emit('go-live', {
		});
	},

	getInitialState: function() {
		return({
			isLive: this.props.isLive
		});
	},

	render: function() {

		var className = 'btn-highlight glyphicon glyphicon-eye-open';
		return(
			<span
				className = {className}
				onClick   = {this.handleClick}
			/>
		);
	}
});


module.exports = GoLiveButton;
