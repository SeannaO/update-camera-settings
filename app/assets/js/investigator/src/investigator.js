var React = require('react/addons');

var CameraGrid           = require('./grid/camera-grid.js');
var CamerasListBox       = require('./cameras-list/cameras-list.js');
var Timeline             = require('./timeline/timeline-component.js');
var TimelineOverlayMixin = require('./timeline-overlay-mixin.js');
var Toolbar              = require('./toolbar/toolbar.js');
var bus                  = require('./services/event-service.js');

var InvestigatorEventsMixin = require('./investigator-events-mixin.js');

var Investigator = React.createClass({

	mixins: [ 
		InvestigatorEventsMixin,
		TimelineOverlayMixin
	],

	componentDidMount: function() {
	},

	loadSession: function() {

		var state = sessionStorage.getItem('state');
		if (!state) return;

		state = JSON.parse(state);

		// load cameras
		for(var i in state.cameras) {
			var cam = state.cameras[i];
			setTimeout( (function(c) {
				this.refs.grid.addCamera(c);
			}).bind(this, cam), 50*i);
		}

		// load day
		if (state.day) {
			bus.emit('day-selected', state.day);
		}

		// load interval
		if (state.begin && state.end) {
			setTimeout( (function() {
				this.refs.timeline.zoomToInterval( state.begin, state.end );
			}).bind(this), 50);
		}

		// load time
		if (state.time) {
			this.refs.timeline.seek( state.time );
		}
	},

	getInitialState: function() {
		return {
			cameras: {}
		}
	},


	shouldComponentUpdate: function( nextProps, nextState ) {

		if (nextState.availableCameras != this.state.availableCameras) {
			this.loadSession();
			return false;
		}

		sessionStorage.setItem('state', JSON.stringify({
			begin:    nextState.begin,
			end:      nextState.end,
			cameras:  nextState.cameras,
			time:     nextState.time,
			day:      nextState.day
		}));

		
		if (
				this.state.cameras != nextState.cameras ||
				this.state.isLive != nextState.isLive 
		) {
			return true;
		}

		return false;

	},

	render: function() {

		var nCameras = 0;
		if (this.state.cameras) nCameras = Object.keys( this.state.cameras );

		var liveTimelineOverlay = this.state.isLive ? this.getTimelineOverlay() : '';

		return (
			<div>
				<div id = "grid">
					<CameraGrid 
						ref    = 'grid'
						isLive = {this.state.isLive}
					/>
					<CamerasListBox url='/cameras.json' show={false} />
				</div>

				<div id = 'timeline-toolbar-container'>
					<Toolbar 
						noCameras = { nCameras == 0 }
						isLive    = {this.state.isLive}
					/>
				</div>

				<div id = 'timeline-container'>
					<Timeline 
						ref    = 'timeline'
						isLive = {this.state.isLive}
					/>

					{ liveTimelineOverlay }
				</div>
			</div>
		)
	}
});

module.exports = Investigator;
