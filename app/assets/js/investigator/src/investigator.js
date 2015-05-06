var React = require('react/addons');

var CameraGrid       = require('./camera-grid.js');
var ToggleCameraList = require('./toggle-cameras.js');
var CamerasListBox   = require('./cameras-list.js');
var Timeline         = require('./timeline/timeline-component.js');
var Toolbar          = require('./toolbar/toolbar.js');
var bus              = require('./event-service.js');

var InvestigatorEventsMixin = require('./investigator-events-mixin.js');

var Investigator = React.createClass({

	mixins: [ 
		InvestigatorEventsMixin
	],

	getInitialState: function() {
		return {
			cameras: {}
		}
	},

	shouldComponentUpdate: function() {
		return false;
	},

	render: function() {
		return (
			<div>
				<div id = "grid">
					<CameraGrid ref = 'grid'/>
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
