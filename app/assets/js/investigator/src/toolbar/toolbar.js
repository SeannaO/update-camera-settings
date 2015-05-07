var React            = require('react/addons');
var bus              = require('../services/event-service.js');
var Datepicker       = require('./datepicker.js');
var CurrentTime      = require('./current-time.js');
var TogglePlay       = require('./toggle-play.js');
var Skip             = require('./skip.js');
var GoLiveButton     = require('./go-live.js');
var ZoomOutButton    = require('./zoom-out.js');
var ToggleCameraList = require('./toggle-cameras.js');

var Toolbar = React.createClass({

	render: function() {

		var disabledWhenNoCameras = {
			pointerEvents:  this.props.noCameras ? 'none' :  '',
			opacity:        this.props.noCameras ? 0.2 :  '',
		};

		return(
			<div id = 'timeline-toolbar' className = 'noselect'>

				<div id = 'datepicker-button' className = 'onTop'>
					<Datepicker id = 'datepicker-button' className = 'onTop'/>
				</div>

				<div id = 'toolbar-spacer' className = 'timeline-toolbar-item'></div>

				<div id = 'current-time' className = 'timeline-toolbar-item'>
					<CurrentTime/>
				</div>

				<div id = 'zoom-out' className = 'timeline-toolbar-item' style={disabledWhenNoCameras}>
					<ZoomOutButton
						visible = {false}
					/>
				</div>

				<div id = 'centralized-buttons' style = {disabledWhenNoCameras}>

					<div id = 'skip-backward' className = 'timeline-toolbar-item'>
						<Skip
							dt    = {-10}
							label = '-10'
						/>
					</div>

					<div id = 'toggle-play' className = 'timeline-toolbar-item'>
						<TogglePlay/>
					</div>

					<div id = 'skip-forward' className = 'timeline-toolbar-item'>
						<Skip
							dt    = {10}
							label = '+10'
						/>
					</div>
				</div>

				<div id = 'rightmost-buttons' className = ''>
					<div id = 'go-live' className ='timeline-toolbar-item'></div>
					<div className = 'timeline-toolbar-item'>
						<ToggleCameraList />
					</div>
				</div>

			</div>
		)
	}
});

module.exports = Toolbar;