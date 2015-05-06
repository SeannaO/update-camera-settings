var React = require('react/addons');

var DownloadButton = React.createClass({

	handleClick: function() {
		var cb = this.props.onclick || function(){ console.log('no cb')};
		cb();
	},

	getInitialState: function() {
		return({
		});
	},

	render: function() {

		var className = 'btn-highlight glyphicon glyphicon-save camera-toolbar-item';

		return(
			<span
				className = {className}
				onClick   = {this.handleClick}
			/>
		);
	}
});


module.exports = DownloadButton;
