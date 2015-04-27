var React = require('react/addons');
var moment = require('moment');

var PureRenderMixin = require('react/addons').addons.PureRenderMixin;


var ThumbnailPreview = React.createClass({
	

	mixins: [
		PureRenderMixin
	],

	componentDidMount: function() {
		
	},


	formatThumbs: function() {

		this.thumbsCounter = 0;

		if (!this.props.thumbs) return;
		var el = [];
		for (var t of this.props.thumbs) {

			if (t) this.thumbsCounter++;

			var img;
			if (!t) {
				img = <div className = 'thumb-not-available'> <center> no thumbnail </center> </div>
			} else {
				img = <img src = {t}/>
			}

			el.push( 
					<div className = 'thumb'>
						{img}
					</div>
				   );
		}
		return el;
	},


	addZero: function() {
	},


	formatTime: function() {
		var t = moment( this.props.time ).format('h:mm:ss a');
		return t;
	},


	render: function() {

		var thumbsEl = this.formatThumbs();

		var shouldBeVisible = this.thumbsCounter > 0 && this.props.visible;

		var thumbPos = {
			left:     this.props.px + 25,
			top:      this.props.py + 25,
			display:  shouldBeVisible ? '' : 'none',
		};

		var style = 'shadow thumbPopover';

		return(
				<div
					className = {style}
					style     = {thumbPos}
				>
					<center>
						<div id = 'thumbTime'>
								{this.formatTime()}
						</div>
					</center>
					{thumbsEl}
				</div>
		);
	},
});


module.exports = ThumbnailPreview;
