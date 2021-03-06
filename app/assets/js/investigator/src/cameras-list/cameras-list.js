var React      = require('react/addons');
var CameraItem = require('./camera-item.js');
var bus        = require('../services/event-service.js');

var Animation = React.addons.CSSTransitionGroup;

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
				bus.emit('loaded-cameras-list', {cameras: list});
			}.bind(this),
			error: function(xhr, status, err) {
				console.error(this.props.url, status, err.toString());
			}.bind(this)
		});
	},

	getInitialState: function() {
		return {
			cameras:  [],
			show:     this.props.show
		};
	},

	toggle: function() {
		this.setState({
			show:  !this.state.show
		});
	},

	componentDidMount: function() {
		this.loadCameras();

		var self = this;

		bus.on('toggle-cameras-list', this.toggle);
	},

	componentWillUnmount: function() {
		
		bus.removeListener( 'toggle-cameras-list', this.toggle );
	},

	render: function() {

		var style = {};

		if(!this.state.show) {
			style.display = 'none';
		}

		return (
			<div className='camerasListBox' style={style}>
				<h2>cameras</h2>
				<CamerasList 
					ref     = 'camerasList'
					key     = 'cameras-list'
					cameras = {this.state.cameras}
				/>
			</div>
		);
	}
});


var CamerasList = React.createClass({

	componentDidMount: function() {
		bus.on('addCamera', this.handleAddCamera);
		bus.on('removeCamera', this.handleRemoveCamera);
	},

	componentWillUnmount: function() {
		bus.removeListener('addCamera', this.handleAddCamera);
		bus.removeListener('removeCamera', this.handleRemoveCamera);
	},

	handleAddCamera: function(d) {
		this.disableItem( d.id );	
	},

	handleRemoveCamera: function( id ) {
		this.enableItem( id );
	},

	enableItem: function( id ) {
		if (!this.refs[id]) return;
		this.refs[id].enable();
	},

	disableItem: function( id ) {
		if (!this.refs[id]) return;
		this.refs[id].disable();
	},

	render: function() {

		var list = this.props.cameras.map( function(camera) {
			return (
				<CameraItem 
					key     = {camera._id}
					name    = {camera.name}
					ip      = {camera.ip}
					streams = {camera.streams}
					cam_id  = {camera._id}
					ref     = {camera._id}
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

module.exports = CamerasListBox;
