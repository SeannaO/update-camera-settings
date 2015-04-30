var React  = require('react/addons');
var bus    = require('../event-service.js');
var moment = require('moment');

var PureRenderMixin = require('react/addons').addons.PureRenderMixin;

var CurrentTime = React.createClass({

	mixins: [ PureRenderMixin ],
	
	getInitialState: function() {
		return {
			time: 'pick a date'
		}
	},

	handleDateUpdate: function(d) {
		console.log(d);
		if (!d) return;

		var t = Math.round( d.timestamp );

		this.handleDateUpdate(t);
	},

	handleTimeUpdate: function(t) {

		this.setState({
			time: t
		});
	},

	componentDidMount: function() {

		bus.on('current-time', this.handleTimeUpdate);
		bus.on('day-selected', this.handleDateUpdate);
	},

	render: function() {

		var time = this.state.time;

		if ( !isNaN(time) ) {
			time = moment(time).format('MMM Do YY  h:mm:ss a');
		} else {
			time = '';
		}

		return(
			<div>
				{time}
			</div>
		);
	}
});


module.exports = CurrentTime;
