var React = require('react/addons');
var bus   = require('../event-service.js');

var TogglePlay = React.createClass({
	
	getInitialState: function() {
		return {
			playing: this.props.playing || false
		}
	},

	handleClick: function() {
		var playing = this.state.playing;

		if (!playing) {
			bus.emit('play');
		} else {
			bus.emit('pause');
		}

		this.toggleTime = Date.now();

		this.setState({
			playing:  !playing
		});
	},

	componentDidMount: function() {
		
		this.toggleTime = 0;
		bus.on('playerEvent-timeupdate', this.unpause);
	},

	unpause: function() {
		
		if (this.state.playing) return;
		if (Date.now() - this.toggleTime < 500) return;
		console.log(Date.now() - this.toggleTime);

		this.setState({
			playing:  true
		});
	},

	componentDidUpdate: function() {
	},

	render: function() {
		var classes = 'btn-highlight glyphicon ';

		if (this.state.playing) classes += 'glyphicon-pause';
		else classes += 'glyphicon-play';

		return(
			<span
				onClick   = {this.handleClick}
				className = {classes}
			>
			</span>
		);
	}
});

module.exports = TogglePlay;
