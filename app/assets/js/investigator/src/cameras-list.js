// cameras list
//
var CamerasListBox = React.createClass({

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
			<div className='camerasListBox'>
				<h2>cameras</h2>
				<CamerasList cameras={this.state.cameras}/>
			</div>
		);
	}
});


var CamerasList = React.createClass({
	render: function() {
		var list = this.props.cameras.map( function(camera) {
			return (
				<CameraItem 
					key     = {camera._id}
					name    = {camera.name}
					ip      = {camera.ip}
					streams = {camera.streams}
					cam_id  = {camera._id}
				>
				</CameraItem>
			);
		});

		return (
			<div className='camerasList'>
				{list}
			</div>
		);
	}
});

