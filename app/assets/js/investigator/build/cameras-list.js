// cameras list
//
var CamerasListBox = React.createClass({displayName: "CamerasListBox",

	loadCameras: function() {
		$.ajax({
			url: this.props.url,
			dataType: 'json',
			success: function(data) {
				var list = [];
				for (var d of data) {
					if (d.streams.length) list.push(d);
				}
				this.setState({cameras: list});
			}.bind(this),
			error: function(xhr, status, err) {
				console.error(this.props.url, status, err.toString());
			}.bind(this)
		});
	},

	getInitialState: function() {
		return {cameras: []};
	},

	componentDidMount: function() {
		this.loadCameras();
	},

	render: function() {
		return (
			React.createElement("div", {className: "camerasListBox"}, 
				React.createElement("h2", null, "cameras"), 
				React.createElement(CamerasList, {cameras: this.state.cameras})
			)
		);
	}
});


var CamerasList = React.createClass({displayName: "CamerasList",
	render: function() {
		var list = this.props.cameras.map( function(camera) {
			return (
				React.createElement(CameraItem, {
					key: camera._id, 
					name: camera.name, 
					ip: camera.ip, 
					streams: camera.streams, 
					cam_id: camera._id
				}
				)
			);
		});

		return (
			React.createElement("div", {className: "camerasList"}, 
				list
			)
		);
	}
});

