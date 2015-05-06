var React  = require('react/addons');
var bus    = require('./event-service.js');
var update = React.addons.update;

var InvestigatorEventsMixin = {

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

	handleIntervalChange: function(d) {
		this.setState({
			begin:  d.begin,
			end:    d.end
		});
	},

	handleCamerasList: function(d) {
		var cameras = {};

		for (var i in d.cameras) {
			var cam = d.cameras[i];
			cam.id = cam._id;
			cameras[ cam._id ] = cam;
		}

		this.setState({
			availableCameras: cameras
		});
	},

	handleTimeUpdate: function(t) {
		this.setState({
			time: t
		});
	},

	handleAddCamera: function(cam) {
		var id      = cam.id;
		var streams = cam.streams;

		var cameras  = this.state.cameras;
		var nCameras = Object.keys(cameras).length;

		var newCam = {};
		newCam[id] = {
			id:        id,
			streams:   streams
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
	
	componentDidMount: function() {
		bus.on('interval-change', this.handleIntervalChange);
		bus.on('loaded-cameras-list', this.handleCamerasList);
		bus.on('download-video', this.handleDownload);
		bus.on('go-to-camera', this.goToCamera);
		bus.on('current-time', this.handleTimeUpdate);
		bus.on('addCamera', this.handleAddCamera);
		bus.on('removeCamera', this.handleRemoveCamera);
	},
	
	componentWillUnmount: function() {
		bus.removeListener('interval-change', this.handleIntervalChange);
		bus.removeListener('loaded-cameras-list', this.handleCamerasList);
		bus.removeListener('download-video', this.handleDownload);
		bus.removeListener('go-to-camera', this.goToCamera);
		bus.removeListener('current-time', this.handleTimeUpdate);
		bus.removeListener('addCamera', this.handleAddCamera);
		bus.removeListener('removeCamera', this.handleRemoveCamera);
	},
};

module.exports = InvestigatorEventsMixin;
