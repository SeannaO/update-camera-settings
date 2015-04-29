var React            = require('react/addons');
var bus              = require('../event-service.js');
var Subtimeline      = require('./subtimeline.js');
var ThumbnailPreview = require('./thumbnail-component.js');
var FFTimeline       = require('./ff-timeline.js');

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

		this.seek( time - 10000 );

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

		var thumbs = [];
		var time = this.getTimeFromPosition( px );

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

	handleMouseDown: function(e) {
		console.log('mouse down');
		var px = e.nativeEvent.offsetX;

		this.setState({
			beginDrag: px
		});

	},

	handleMouseUp: function(e) {
		console.log('mouse up');

		var dx = 0;
		var px = e.nativeEvent.offsetX;
		if (this.state.beginDrag) {
			dx = Math.abs(px - this.state.beginDrag);
		}

		this.setState({
			beginDrag: null
		});

		if (dx > 10) {
			console.log('dragging');
		} else {
			this.handleClick(e);
		}
	},


	render: function() {

		var position = this.getPosition( this.state.time );

		var subtimelines = this.getSubtimelines();

		var thumbnailStyle = {
			position:  'absolute',
			zIndex:    10000
		}

		var dragCursorLeftStyle = {
			display: !!this.state.beginDrag,
			left: this.state.beginDrag || 0,
		}

		console.log( dragCursorLeftStyle );

		return (
			
			<div>
				<div {...this.getZoomMouseEvents() } 
					ref          = 'timeline'
					id           = 'timeline-component'
					className    = ''
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


				<FFTimeline 
					begin   = {this.state.begin}
					end     = {this.state.end}
					cameras = {this.state.cameras}
					seek    = {this.seek}
				/>

			</div>
			
		);
	}
});

module.exports = Timeline;
