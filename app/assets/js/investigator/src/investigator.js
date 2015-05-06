var React = require('react/addons');

var CameraGrid       = require('./camera-grid.js');
var ToggleCameraList = require('./toggle-cameras.js');
var CamerasListBox   = require('./cameras-list.js');
var Timeline         = require('./timeline/timeline-component.js');
var Toolbar          = require('./toolbar/toolbar.js');

var Investigator = React.createClass({

	componentDidMount: function() {
	},

	render: function() {
		return (
			<div>
				<div id = "grid">
					<CameraGrid/>
					<CamerasListBox url='/cameras.json' show={false} />
				</div>

				<div id = 'timeline-toolbar-container'>
					<Toolbar/>
				</div>

				<div id = 'timeline-container'>
					<Timeline />
				</div>
			</div>
		)
	}
});

module.exports = Investigator;
