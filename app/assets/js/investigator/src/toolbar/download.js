var React = require('react/addons');

var DownloadButton = React.createClass({

	handleClick: function() {
		console.log('download');
	},

	getInitialState: function() {
		return({
		});
	},

	render: function() {

		var className = 'btn-highlight glyphicon glyphicon-save';
		return(
			<span
				className = {className}
				onClick   = {this.handleClick}
			/>
		);
	}
});


module.exports = DownloadButton;
