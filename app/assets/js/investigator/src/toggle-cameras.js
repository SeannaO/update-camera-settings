var React                = require('react/addons');
var mui                  = require('material-ui');
var FloatingActionButton = mui.FloatingActionButton;
var bus                  = require('./event-service.js');

var ToggleCameraList = React.createClass({

	toggle: function() {
		bus.emit('toggle-cameras-list');	
	},

	componentDidRender: function() {
		console.log('ok');
	},

	render: function() {

		return (
			<div
				onClick   = {this.toggle}
				className = 'noselect btn-highlight'
			>
				<span className = 'glyphicon glyphicon-facetime-video'>
				</span>
			</div>
		);
	}
});

module.exports = ToggleCameraList;
