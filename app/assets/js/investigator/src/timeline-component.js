var React            = require('react/addons');
var bus              = require('./event-service.js');
var Subtimeline      = require('./subtimeline.js');
var ThumbnailPreview = require('./thumbnail-component.js');

var PureRenderMixin           = require('react/addons').addons.PureRenderMixin;
var TimelineEventHandlerMixin = require('./timeline-event-handler-mixin.js');
var TimelineZoomMixin         = require('./timeline-zoom-in-mixin.js');
var TimelineAutoresizeMixin   = require('./timeline-autoresize-mixin.js');

var update = React.addons.update;


var Cursor = React.createClass({

	render: function() {

		var position = this.props.position;

		var style = {
			left:        this.props.position + 'px',
			background:  this.props.color,
			display: 	 isNaN( position ) ? 'none' : '',
			opacity:     this.props.loading ? 0.5 : 1.0
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
	
	mixins: [
		PureRenderMixin,
		TimelineEventHandlerMixin,
		TimelineZoomMixin,
		TimelineAutoresizeMixin
	],

	getInitialState: function() {
	
		var d = new Date();
		d.setHours(0,0,0,0);
		d = Date.parse(d);

		var day = 24*60*60*1000;

		return {
			begin:    d,
			end:      d + day,
			width:    0,
			cameras:  {}
		}
	},

	componentDidMount: function() {
	},

	getPosition: function( time ) {

		if (isNaN(time)) return;

		var timespan = this.state.end - this.state.begin;

		var d = time - this.state.begin;
		var w = this.state.width;

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


	getTimeFromPosition: function(px) {
		var el    = this.refs.timeline.getDOMNode();
		var width = el.offsetWidth;
		
		var pos = px/width;

		var timeSpan = this.state.end - this.state.begin;

		return this.state.begin + pos * timeSpan;
	},


	handleClick: function(e, d) {

		var px   = e.nativeEvent.offsetX;
		var time = this.getTimeFromPosition( px );

		console.log( '[click]   time: ' + new Date(time) + '   px: ' + px );

		this.seek( time );

		// this.setState({
		// 	begin:  time - 15*60*1000,
		// 	end:    time + 15*60*1000
		// });

	},

	seek: function(time) {
		bus.emit('seek', {
			time: time
		});
		
		this.setState({
			time:    time,
			loading:  true
		});
	},


	componentDidUpdate: function( prevProps, prevState) {
		if (prevState.time !== this.state.time) {
			for(var cam_id in this.state.cameras) {
				var cam = this.state.cameras[ cam_id ];
				var dt = Math.abs( cam.time - this.state.time );
				if (dt > 5000) {
					// console.log('camera is falling behind');
					bus.emit('seek', {
						id:    cam_id,
						time:  this.state.time
					});
				}
			}
		}
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
	
	handleMouseEnter: function() {
		this.setState({
			showThumb: true
		});
	},

	handleMouseLeave: function() {
		this.setState({
			showThumb: false
		});
	},

	debounce: function(func, wait, immediate) {
		var timeout;
		return function() {
			var context = this, args = arguments;
			var later = function() {
				timeout = null;
				if (!immediate) func.apply(context, args);
			};
			var callNow = immediate && !timeout;
			clearTimeout(timeout);
			timeout = setTimeout(later, wait);
			if (callNow) func.apply(context, args);
		};
	},

	handleMouseMove: function(e) {
		this.mouseMove(e);
	},

	mouseMove: function(e) {
		var px = e.nativeEvent.offsetX;
		var py = e.nativeEvent.offsetY;

		console.log('px: ' + px);
		var thumbs = [];
		var time = this.getTimeFromPosition( px );

		console.log( 'time: ' + new Date(time) + '   px: ' + px );

		for (var i in this.state.cameras) {
			var cam = this.state.cameras[i];
			if(!cam.indexer) {
				thumbs.push('');
				continue;
			} 

			var el = cam.indexer.getRelativeTime( time, { returnElement: true });
			if (!el) {
				thumbs.push('');
				continue;
			}

			var thumb_name = el.start + '_' + (el.end - el.start);
			var thumb = "/cameras/" + cam.id + "/streams/" + cam.streams[0].id + "/thumb/" + thumb_name;
			thumbs.push( thumb || '' );
		}

		this.setState({
			thumbX:     px,
			thumbY:     py,
			thumbs:     thumbs,
			thumbTime:  time
		});
	},

	handleMouseDown: function() {
		console.log('mouse down');
	},

	handleMouseUp: function() {
		console.log('mouse up');
	},


	render: function() {

		var position = this.getPosition( this.state.time );

		var subtimelines = this.getSubtimelines();

		var thumbnailStyle = {
			position:  'absolute',
			zIndex:    10000
		}

		return (
			
			<div>
				<div {...this.getZoomMouseEvents() } 
					ref          = 'timeline'
					id           = 'timeline-component'
					className    = ''
					onClick      = {this.handleClick}
					onMouseEnter = {this.handleMouseEnter}
					onMouseLeave = {this.handleMouseLeave}
					onMouseMove  = {this.handleMouseMove}
					onMouseDown  = {this.handleMouseDown}
					onMouseUp    = {this.handleMouseUp}
				>
					{subtimelines}

					<Cursor 
						key       = 'cursor'
						ref       = 'cursor'
						className = 'shadow'
						position  = {position}
						loading   = {this.state.loading}
					/>

				</div>

				<ThumbnailPreview 
					px      = {this.state.thumbX}
					py      = {this.state.thumbY}
					thumbs  = {this.state.thumbs}
					visible = {this.state.showThumb}
					style   = {thumbnailStyle}
					time    = {this.state.thumbTime}
				/>
			</div>
			
		);
	}
});

module.exports = Timeline;

