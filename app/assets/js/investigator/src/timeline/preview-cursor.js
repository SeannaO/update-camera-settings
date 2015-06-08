var React = require('react');
var bus   = require('../services/event-service.js');

var PreviewCursor = React.createClass({
	
	hide: function() {
		this.setState({
			visible: false
		});
	},

	updateTime: function(time) {
		this.setState({
			time:     time,
			visible:  true
		});
	},


	getInitialState: function() {
		return {
			visible: false,
		}
	},

	componentDidMount: function() {
		bus.on('ff-preview', function(d) {
			if (d.hide) {
				this.hide();
			} else {
				this.updateTime( d.time );
			}
		}.bind(this));
	},

	renderCursor: function() {
		var style = {
			left: this.props.getPosition(this.state.time)
		}
		return (
			<div 
				className = 'preview-cursor' 
				style = {style} >
			</div>
		);
	},

	render: function() {
		
		if (this.state.visible) {
			return this.renderCursor();
		} else {
			return <div/>;
		}
	}
});


module.exports = PreviewCursor;
