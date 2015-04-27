var TimelineAutoresizeMixin = {

	componentDidMount: function() {
		this.resize();
		window.addEventListener('resize', this.resize);
	},

	componentWillUnmout: function() {
		window.removeEventListener('resize', this.resize);
	},

	resize: function() {
		console.log('resize');
		var width = this.refs.timeline.getDOMNode().offsetWidth;

		this.setState({
			width:  width
		});
	}
};

module.exports = TimelineAutoresizeMixin;
