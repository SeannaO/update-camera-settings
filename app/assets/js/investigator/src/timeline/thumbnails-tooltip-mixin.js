var React            = require('react/addons');
var ThumbnailPreview = require('./thumbnail-component.js');

var ThumbnailsTooltipMixin = {
	
	thumbnailsMixinMouseMove: function(e) {
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


	thumbnailsMixinMouseLeave: function() {
		this.setState({
			showThumb: false
		});
	},


	thumbnailsMixinMouseEnter: function() {
		this.setState({
			showThumb: true
		});
	},

	getThumbnailTooltipElement: function() {

		var thumbnailStyle = {
			position:  'absolute',
			zIndex:    10000
		};

		return(
			<ThumbnailPreview 
				px      = {this.state.thumbX}
				py      = {this.state.thumbY}
				thumbs  = {this.state.thumbs}
				visible = {this.state.showThumb}
				style   = {thumbnailStyle}
				time    = {this.state.thumbTime}
			/>
		  );
	}
};


module.exports = ThumbnailsTooltipMixin;
