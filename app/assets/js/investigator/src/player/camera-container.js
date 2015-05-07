var React            = require('react/addons');
var PlayerContainer  = require('./player-container.js');
var DownloadButton   = require('../toolbar/download.js');
var GoToCameraButton = require('../toolbar/go-to-camera.js');
var bus              = require('../services/event-service.js');


var CameraContainer = React.createClass({

	componentDidMount: function() {
	},

	getInitialState: function() {
		return {
			width:     '480px',
			height:    '360px',
			hovering:  false
		}
	},

	mouseEnterHandler: function() {
		this.setState({
			hovering:  true
		});
	},

	mouseLeaveHandler: function() {
		this.setState({
			hovering:  false
		});
	},

	downloadVideo: function(id) {
		bus.emit('download-video', {
			id:  this.props.cam_id
		});
	},

	goToCamera: function(id) {
		bus.emit('go-to-camera', {
			id: this.props.cam_id
		});
	},

	render: function() {

		var style = {
			width:   this.props.width,
			height:  this.props.height
		}

		var toolbarStyle = {
			opacity: this.state.hovering ? 0.8 : 0.1
		}

		return (
			<div 
				ref          = 'container'
				className    = 'camera-container'
				style        = {style}
				onMouseEnter = {this.mouseEnterHandler}
				onMouseLeave = {this.mouseLeaveHandler}
			>
				<div className='camera-container-menu'>
					<div className='close-window' onClick = {this.props.close}> [ x ] </div>
					<div className='window-title'>
						{this.props.name || this.props.ip}
					</div>
				</div>

				<PlayerContainer 
					cam_id  = {this.props.cam_id}
					ip      = {this.props.ip}
					streams = {this.props.streams}
					key     = {this.props.cam_id}
					begin   = {this.props.begin}
					end     = {this.props.end}
				/>

				<div className = 'player-toolbar' style = {toolbarStyle}>
					<DownloadButton
					 	onclick = {this.downloadVideo}
					/>
					<GoToCameraButton
					 	onclick = {this.goToCamera}
					/>
				</div>
			</div>
		);
	}
});

module.exports = CameraContainer;
