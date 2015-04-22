var React       = require('react/addons');
var Subtimeline = require('./subtimeline.js');
var bus         = require('./event-service.js');

var update = React.addons.update;


var Cursor = React.createClass({


	render: function() {

		var position = this.props.position;

		var style = {
			left:        this.props.position + 'px',
			background:  this.props.color,
			display: 	 isNaN( position ) ? 'none' : '' 	
		}

		return(
			<div
				ref       = 'cursor'
				className = 'timeline-cursor'
				style     = {style}>
			</div>
		);
	}
});


/// 
var Timeline = React.createClass({
	
	getInitialState: function() {
	
		var d = new Date();
		d.setHours(0,0,0,0);
		d = Date.parse(d);

		var day = 24*60*60*1000;

		return {
			begin:    d,
			end:      d + day,
			time:     Date.now(),
			width:    0,
			cameras:  {}
		}
	},

	componentDidMount: function() {

		var self = this;

		bus.on('addCamera', function(id) {

			var colors = [
				'red',
				'yellow',
				'green',
				'blue'
			];

			var cameras  = self.state.cameras;
			var nCameras = Object.keys(cameras).length;

			var color = colors[ nCameras ];

			var newCam = {};
			newCam[id] = {
				id:        id,
				color:     color,
				segments:  []
			};

			var newCameras = update( cameras, {
				$merge: newCam
			});

			self.setState({
				cameras: newCameras
			});
		});

		bus.on('removeCamera', function(id) {
			var cameras = self.state.cameras;
			delete cameras[id];
			self.setState({
				cameras: cameras
			});
		});

		bus.on('playerEvent-timeupdate', function(d) {
			var cameras = self.state.cameras;
			if (!cameras[d.id]) return;

			cameras[d.id].time = d.time;

			self.setState({
				cameras: cameras
			});
		});

		bus.on('camera-metadata', this.handleCameraMetadata);
		bus.on('day-selected', this.handleDateChange);

		setInterval( function() {

			if(!self.isMounted()) return;
			var width = self.refs.timeline.getDOMNode().offsetWidth;

			self.setState({
				time:   Date.now(),
				width:  width
			});
		}, 1000);
	},

	getPosition: function( time ) {

		if (isNaN(time)) return;

		var timespan = this.state.end - this.state.begin;
		var d   = time - this.state.begin;
		var w   = this.state.width;

		return ( w*d/timespan );
	},

	getCursors: function() {

		var cameras = this.state.cameras;

		if (!cameras) return;

		var cursors = [];
		
		for( var id in cameras ) {
			var position = this.getPosition( cameras[id].time );
			cursors.push(
				<Cursor
					key      = {id}
					position = {position}
					color    = {cameras[id].color}
				/>
			);
		}

		return cursors;
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
	
		console.log(d.segments);

		cam.segments = [];

		cam = update( cam, {
			$merge: {
				segments: d.segments
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

	handleClick: function(e, d) {


		var px    = e.nativeEvent.offsetX;
		var el    = this.refs.timeline.getDOMNode();
		var width = el.offsetWidth;
		
		var pos = px/width;

		var timeSpan = this.state.end - this.state.begin;

		var time = this.state.begin + pos * timeSpan;

		this.seek( this.state.begin + pos * timeSpan );

		// this.setState({
		// 	begin:  time - 15*60*1000,
		// 	end:    time + 15*60*1000
		// });

	},

	seek: function(time) {
		bus.emit('seek', {
			time: time
		});
	},


	getSubtimelines: function() {
		var cameras = this.state.cameras;
		if(!cameras) return;

		var nCameras = Object.keys( this.state.cameras ).length;
		if(!nCameras) return;

		var opacity = 1.0 / nCameras;

		var subtimelines = [];

		for (var i in this.state.cameras) {
			var cam = this.state.cameras[i];
			subtimelines.push(
					<Subtimeline
						key     = {cam.id}
						begin   = {this.state.begin}
						end     = {this.state.end}
						width   = {this.state.width}
						camera  = {cam}
						opacity = {opacity}
					/>
				);
		}

		return subtimelines;
	},
	

	render: function() {

		var position = this.getPosition( this.state.time );

		var cursors = this.getCursors();
		var subtimelines = this.getSubtimelines();
					
		return (
			<div 
				ref       = 'timeline'
				id        = 'timeline-component'
				className = 'shadow'
				onClick   = {this.handleClick}
			>
				{subtimelines}

				<Cursor 
					key       = 'cursor'
					ref       = 'cursor'
					className = 'shadow'
					position  = {position}/>

				{cursors}	
			</div>
			
		);
	}
});

module.exports = Timeline;

