var React = require('react');

function isSameDay(a, b) {
  return a.startOf('day').isSame(b.startOf('day'));
}

var Datepicker = React.createClass({

	getInitialState: function() {
		return {}
	},

	handleDayTouchTap: function(day, modifiers, event) {
		this.setState({
			selectedDay: day
		});
	},

	componentDidMount: function() {
		this.pickadate = $(this.refs.button.getDOMNode()).pickadate({
			onSet: function(d) {
				if (!d) return;
				console.log(d);
			 	$(window).trigger('day-selected', {
					timestamp: d.select
				});
			}
		});
	},

	render: function() {

		return (
			<div
				ref       = 'button'
				id        = 'toggle-date-picker'
				className = 'btn-highlight'
				type      = 'text'
				value     = ""
			>
				<span className = "glyphicon glyphicon-calendar"></span>
			</div>
		);
	}
});

module.exports = Datepicker;
