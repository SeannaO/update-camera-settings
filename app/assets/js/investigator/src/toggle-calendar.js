var React = require('react/addons');

var ToggleCalendar = React.createClass({

	toggle: function() {
		$(window).trigger('toggle-cameras-list');	
	},


	render: function() {

		return (
			<div
				onClick   = {this.toggle}
				className = '.noselect'
			>
				<span className = 'glyphicon glyphicon-facetime-video'>
				</span>
			</div>
		);
	}
});

module.exports = ToggleCameraList;
