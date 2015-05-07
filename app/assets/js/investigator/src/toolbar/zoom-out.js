var React = require('react/addons');
var bus   = require('../services/event-service.js');

var ZoomOutButton = React.createClass({

	handleClick: function() {
		bus.emit('zoom-out', {
		});
	},

	getInitialState: function() {
		return({
			visible: this.props.visible
		});
	},

	show: function() {
		this.setState({
			visible: true
		});
	},

	hide: function() {
		this.setState({
			visible: false
		});
	},

	componentWillUnmount: function() {
		bus.removeListener('day-selected', this.hide);
		bus.removeListener('no-more-zoom-out', this.hide);
		bus.removeListener('zoom-in', this.show);
	},

	componentDidMount: function() {
		bus.on('day-selected', this.hide);
		bus.on('no-more-zoom-out', this.hide);
		bus.on('zoom-in', this.show);
	},

	render: function() {

		var style = {
			marginLeft: '15px',
			display: this.state.visible ? '' : 'none'
		};

		var className = 'btn-highlight glyphicon glyphicon-zoom-out';
		return(
			<span
				style     = {style}
				className = {className}
				onClick   = {this.handleClick}
			/>
		);
	}
});


module.exports = ZoomOutButton;
