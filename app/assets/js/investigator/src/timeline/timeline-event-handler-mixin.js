var React  = require('react/addons');
var bus    = require('./event-service.js');
var update = React.addons.update;

var TimelineEventHandlerMixin = {

	componentDidMount: function() {
		bus.on('addCamera', this.handleAddCamera);
		bus.on('removeCamera', this.handleRemoveCamera);
		bus.on('playerEvent-timeupdate', this.handlePlayerTimeUpdate);
		bus.on('camera-metadata', this.handleCameraMetadata);
		bus.on('day-selected', this.handleDateChange);
	},

	componentWillUnmount: function() {
		// bus.on('addCamera', this.handleAddCamera);
		// bus.on('removeCamera', this.handleRemoveCamera);
		// bus.on('playerEvent-timeupdate', this.handlePlayerTimeUpdate);
		// bus.on('camera-metadata', this.handleCameraMetadata);
		// bus.on('day-selected', this.handleDateChange);
	},

	handleDateChange: function(d) {
		
		var date = new Date(d.timestamp);

		date.setHours(0,0,0,0);
		var begin = Date.parse(date);

		date.setHours(23,59,59,999);
		var end = Date.parse(date);

		this.setState({
			begin:  begin,
			end:    end
		});
	},

	handleCameraMetadata: function(d) {
		var cam = this.state.cameras[d.id];
		if (!cam) return;
	
		cam.segments = [];
		cam.indexer  = null;

		cam = update( cam, {
			$merge: {
				segments:  d.segments,
				indexer:   d.indexer
			}
		});

		var newCam = {};
		newCam[d.id] = cam;

		var cameras = update( this.state.cameras, {
			$merge: newCam
		});

		this.setState({
			cameras: cameras
		});
	},

	handleAddCamera: function( cam ) {

		var id      = cam.id;
		var streams = cam.streams;

		var colors = [
			'red',
			'yellow',
			'green',
			'blue'
		];

		var cameras  = this.state.cameras;
		var nCameras = Object.keys(cameras).length;

		var color = colors[ nCameras ];

		var newCam = {};
		newCam[id] = {
			id:        id,
			streams:   streams,
			color:     color,
			segments:  []
		};

		var newCameras = update( cameras, {
			$merge: newCam
		});

		this.setState({
			cameras: newCameras
		});
	},

	handleRemoveCamera: function(id) {
		var cameras = this.state.cameras;
		delete cameras[id];
		this.setState({
			cameras: cameras
		});
	},

	handlePlayerTimeUpdate: function(d) {
		var cameras = this.state.cameras;
		if (!cameras[d.id]) return;

		cameras[d.id].time = d.time;

		var time = this.state.time;

		if (!time || d.time > time) {
			time = d.time;

			this.setState({
				cameras:  cameras,
				time:     time,
				loading:  false
			});
		}


		if ( Math.abs( d.time - this.state.time ) > 5000 ) {
			bus.emit('seek', {
				time:  this.state.time,
				id:    d.id
			});
		}
	}

};

module.exports = TimelineEventHandlerMixin;