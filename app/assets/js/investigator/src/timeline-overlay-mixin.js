var React = require('react/addons');

var TimelineOverlayMixin = {
	
	goArchived: function() {
		this.setState({
			isLive: false
		});
	},

	getTimelineOverlay: function() {
		return (
				<div 
					className = 'timeline-overlay'
					onClick   = {this.goArchived}
				>
					<center>
						<div className = 'timeline-overlay-text'>
							streaming live - click here or select a date to watch archived video					  
						</div>
					</center>
				</div>
		   );
	}
};

module.exports = TimelineOverlayMixin;
