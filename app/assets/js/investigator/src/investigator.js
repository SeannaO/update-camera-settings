var React = require('react/addons');

var CameraGrid       = require('./camera-grid.js');
var ToggleCameraList = require('./toggle-cameras.js');
var CamerasListBox   = require('./cameras-list.js');
var Datepicker       = require('./toolbar/datepicker.js');
var Timeline         = require('./timeline/timeline-component.js');
var CurrentTime      = require('./toolbar/current-time.js');
var TogglePlay       = require('./toolbar/toggle-play.js');

React.render(
	<div>
		<CameraGrid/>
		<CamerasListBox url='/cameras.json' show={false} />
	</div>,
	document.getElementById('main')
);

React.render(
	<ToggleCameraList />,
	document.getElementById('toolbar')
);

React.render(
	<Timeline />,
	document.getElementById('timeline-container')
);

React.render(
	<Datepicker/>,
	document.getElementById('datepicker-button')
);

React.render(
	<CurrentTime/>,
	document.getElementById('current-time')
);

React.render(
	<TogglePlay/>,
	document.getElementById('toggle-play')
);
