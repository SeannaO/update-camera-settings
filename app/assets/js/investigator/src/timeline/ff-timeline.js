var React           = require('react/addons');
var PureRenderMixin = require('react/addons').addons.PureRenderMixin;
var bus             = require('../event-service.js');

var FFTimeline = React.createClass({

	mixins: [ PureRenderMixin ],

	trimData: function(data, begin, end) {

		if(!data) return;
		var a = 0;
		var b = data.length - 1;

		while(a < b) {

			var k = Math.floor( (a + b)/2 );
			if (data[k].start < begin) {
				a = k+1;
			} else {
				b = k;
			}
		}

		var k0 = a;

		a = 0;
		b = data.length - 1;
		while (a < b) {
			var k = Math.ceil( (a + b)/2 );
			if (data[k].start > end) {
				b = k-1;
			} else {
				a = k;
			}
		}

		var k1 = b;

		var interval = [0,0];

		interval[0] = k0 < k1 ? k0 : k1;
		interval[1] = k0 > k1 ? k0 : k1;

		return interval;
	},

	componentWillUpdate: function(nextProps, nextState) {

		console.log('fftimeline');

		var cameras = nextProps.cameras;
		var begin = Math.round(nextProps.begin);
		var end = Math.round(nextProps.end);
		
		var minBegin;
		var maxEnd;

		for (var i in cameras) {

			var cam = cameras[i];
		
			if (!cam.indexer) return;
			
			var interval = this.trimData(cam.indexer.elements, begin, end);
			var elements = cam.indexer.elements;
			
			var b, e;

			if (elements[interval[0]]) b = elements[interval[0]].start;
			if (elements[interval[1]]) e = elements[interval[1]].end;
			
			if ( b && ( !minBegin || b < minBegin ) ) minBegin = b;
			if ( e && ( !maxEnd || e > maxEnd ) ) maxEnd = e;
		}

		begin = minBegin + 5000;
		end = maxEnd - 5000;
		var dt = (end - begin) / 30.0;

		var segments = [];

		for (var t = begin; t < end; t+=dt) {
			
			var segment = {};
			segment.thumbs = {};
			segment.begin = t;
			segment.length = dt;

			for (var i in cameras) {

				var cam = cameras[i];

				if (!cam.indexer) return;

				var el = cam.indexer.getRelativeTime(t, {returnElement: true});
				if (!el) continue;

				var thumb_name = el.start + '_' + (el.end - el.start);
				var thumb = "/cameras/" + cam.id + "/streams/" + cam.streams[0].id + "/thumb/" + thumb_name;

				segment.thumbs[i] = thumb;
			}
			segments.push( segment );
		}
		this.segments = segments;
	},

	handleMouseLeave: function(i) {
		bus.emit('hideThumb');
	},

	handleMouseMove: function(i) {
		return function(e, d) {
			var seg = this.segments[i];

			for (var id in this.props.cameras) {
				bus.emit('showThumb', {
					id:     id,
					thumb:  seg.thumbs[id]
				});
			}
			
		}.bind(this);
	},

	handleMouseClick: function(i) {
		
		return function(e, d) {
			var seg = this.segments[i];

			if (!this.props.seek) return;
			this.props.seek( seg.begin - 5000 );

			bus.emit('hideThumb');
		}.bind(this);
	},

	getSegments: function() {
		
		var nCameras = Object.keys(this.props.cameras).length;

		var segs = [];

		for( var i in this.segments ) {
			var nThumbs = Object.keys( this.segments[i].thumbs ).length;

			var style = {
				opacity: 1.0 * nThumbs / nCameras
			};

			segs.push(
				<div 
					className   = 'ff-segment'
					key         = {i}
					onMouseMove = {this.handleMouseMove(i)}
					onClick     = {this.handleMouseClick(i)}
					style       = {style}
				>
				</div>
			);
		}

		return segs;
	},

	render: function() {
		return (
			<div id = 'ff-timeline'
				onMouseLeave = {this.handleMouseLeave}
			>
				{this.getSegments()}
			</div>
		);
	}
});


module.exports = FFTimeline;
