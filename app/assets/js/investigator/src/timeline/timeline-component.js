var React            = require('react/addons');
var bus              = require('../event-service.js');
var Subtimeline      = require('./subtimeline.js');
var FFTimeline       = require('./ff-timeline.js');
var TimelineScale    = require('./timeline-scale.js');
var TimelineSelector = require('./timeline-selector.js');
var tweenState       = require('react-tween-state');

var PureRenderMixin           = require('react/addons').addons.PureRenderMixin;
var TimelineEventHandlerMixin = require('./timeline-event-handler-mixin.js');
var TimelineZoomMixin         = require('./timeline-zoom-in-mixin.js');
var TimelineAutoresizeMixin   = require('./timeline-autoresize-mixin.js');
var ThumbnailsTooltipMixin    = require('./thumbnails-tooltip-mixin.js');


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
		TimelineAutoresizeMixin,
		ThumbnailsTooltipMixin,
		tweenState.Mixin
	],

	getInitialState: function() {
	
		var d = new Date();
		d.setHours(0,0,0,0);
		d = Date.parse(d);

		var day = 24*60*60*1000;

		return {
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

		this.seek( time - 1000 );


		// this.setState({
		// 	begin:  time - 15*60*1000,
		// 	end:    time + 15*60*1000
		// });

	},

	seek: function(time) {

		this.seekTime = Date.now();

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
				var dt  = Math.abs( cam.time - this.state.time );

				bus.emit('current-time', this.state.time);

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
						begin   = {this.getTweeningValue('begin')}
						end     = {this.getTweeningValue('end')}
						width   = {this.state.width}
						camera  = {cam}
						opacity = {opacity}
					/>
				);
		}

		return subtimelines;
	},
	
	handleMouseEnter: function() {
		this.thumbnailsMixinMouseEnter();
	},

	handleMouseLeave: function() {
		this.thumbnailsMixinMouseLeave();
	},

	handleMouseMove: function(e) {
		this.thumbnailsMixinMouseMove(e);
		if (!!this.state.beginDrag) {
			var px = e.nativeEvent.offsetX;
			this.setState({
				endDrag: px
			});
		}
	},

	handleMouseDown: function(e) {
		var px = e.nativeEvent.offsetX;

		this.setState({
			beginDrag: px
		});

	},

	handleMouseUp: function(e) {

		var dx = 0;
		var px = e.nativeEvent.offsetX;
		if (this.state.beginDrag) {
			dx = Math.abs(px - this.state.beginDrag);
		}

		var beginDrag = this.state.beginDrag;
		var endDrag   = this.state.endDrag;

		var max = Math.max( beginDrag, endDrag );
		var min = Math.min( beginDrag, endDrag );

		beginDrag = min;
		endDrag   = max;

		this.setState({
			beginDrag:  null,
			endDrag:    null
		});

		if (dx > 5) {
			var begin = this.getTimeFromPosition( beginDrag );
			var end   = this.getTimeFromPosition( endDrag );

			this.tweenState( 'begin', {
				easing:    tweenState.easingTypes.easeInOutQuad,
				duration:  200,
				endValue:  begin
			});
			this.tweenState( 'end', {
				easing:    tweenState.easingTypes.easeInOutQuad,
				duration:  200,
				endValue:  end
			});
		} else {
			this.handleClick(e);
		}
	},


	render: function() {

		var position = this.getPosition( this.state.time );

		var subtimelines = this.getSubtimelines();

		var dragCursorLeftStyle = {
			display:  !!this.state.beginDrag,
			left:     this.state.beginDrag || 0,
		}

		return (
			
			<div>
				<div {...this.getZoomMouseEvents() } 
					ref          = 'timeline'
					id           = 'timeline-component'
					className    = 'noselect'
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

					<TimelineSelector
						p1      = {this.state.beginDrag}
						p2      = {this.state.endDrag}
						visible = {!!this.state.beginDrag && !!this.state.endDrag}
					/>

				</div>

				<TimelineScale
					begin = {this.getTweeningValue('begin')}
					end   = {this.getTweeningValue('end')}
					width = {this.state.width}
				/>

				{this.getThumbnailTooltipElement()}

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

