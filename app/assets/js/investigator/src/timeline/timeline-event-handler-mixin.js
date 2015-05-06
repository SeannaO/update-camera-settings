var React  = require('react/addons');
var bus    = require('../event-service.js');
var update = React.addons.update;

var TimelineEventHandlerMixin = {

	componentDidMount: function() {
		bus.on('addCamera', this.handleAddCamera);
		bus.on('removeCamera', this.handleRemoveCamera);
		bus.on('playerEvent-timeupdate', this.handlePlayerTimeUpdate);
		bus.on('camera-metadata', this.handleCameraMetadata);
		bus.on('day-selected', this.handleDateChange);
		bus.on('skip', this.handleSkip);
		bus.on('go-live', this.handleGoLive);
		bus.on('download-video', this.handleDownload);
		bus.on('go-to-camera', this.goToCamera);
	},

	componentWillUnmount: function() {
		bus.removeListener('addCamera', this.handleAddCamera);
		bus.removeListener('removeCamera', this.handleRemoveCamera);
		bus.removeListener('playerEvent-timeupdate', this.handlePlayerTimeUpdate);
		bus.removeListener('camera-metadata', this.handleCameraMetadata);
		bus.removeListener('day-selected', this.handleDateChange);
		bus.removeListener('skip', this.handleSkip);
		bus.removeListener('go-live', this.handleGoLive);
		bus.removeListener('download-video', this.handleDownload);
		bus.removeListener('go-to-camera', this.goToCamera);
	},

	goToCamera: function(d) {

		if (!this.state.begin) return;
		if (!this.state.end) return;
		if (!d.id) return;
		
		var offset = this.state.time;
		if (isNaN(offset)) return;

		var url = window.location.origin + 
			'/cameras/' + d.id + 
			'?time=' + Math.round(this.state.time) + 
			'&begin=' + Math.round(this.state.begin) +
			'&end=' + Math.round(this.state.end);

		window.open( url );
	},

	handleDownload: function(d) {

		if (!this.state.begin || !this.state.end ) {
			return;
		} 

		if (this.state.end - this.state.begin > 2*60*60*1000) {
			toastr.warning('Please select an interval shorter than 2h');
			return;
		}

		var url = window.location.protocol + "//" + window.location.host
			+ "/cameras/" + d.id
			+ "/download?begin=" + parseInt( this.state.begin )
			+ "&end=" + parseInt( this.state.end );

		var begin = new Date(this.state.begin),
			end   = new Date(this.state.end);

		bootbox.confirm('Download video<br><br> <b>FROM</b>: ' + begin + '<br> <b>TO</b>: ' + end  + '<br><br> Confirm? ', function(ok) {
			if(!ok) {
				return;	
			} else {
				var w = window.open( url );
				window.focus();
				w.onload = function() {
					if (w.document.body.innerHTML.length > 0) {
						w.close();
						if (w.document.body.innerHTML.indexOf('long') >= 0) {
							toastr.error('requested video is too long, please select a shorter interval');
						} else {
							toastr.error('couldn\'t find the requested video');
						}
					}
				};
			}
		});
	},

	handleGoLive: function(d) {
		this.setState({
		});
	},

	handleSkip: function(d) {
		if (!d || isNaN(d.dt)) return;
		this.seek(this.state.time + d.dt*1000)
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
		var newCameras = {};

		for (var i in cameras) {
			if (i == id) continue;
			newCameras[i] = cameras[i];
		}

		this.setState({
			cameras: newCameras
		});
	},

	handlePlayerTimeUpdate: function(d) {
		
		if (Date.now() - this.seekTime < 1000) return;

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
