var React = require('react/addons');

var CameraGrid       = require('./camera-grid.js');
var ToggleCameraList = require('./toggle-cameras.js');
var CamerasListBox   = require('./cameras-list.js');
var Datepicker       = require('./datepicker.js');
var Timeline         = require('./timeline/timeline-component.js');

React.render(
	<div>
		<div className='onTop'>
			<Datepicker/>
		</div>
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

