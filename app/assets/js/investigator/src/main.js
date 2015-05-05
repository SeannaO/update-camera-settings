var React = require('react/addons');

var CameraGrid        = require('./camera-grid.js');
var ToggleCameraList  = require('./toggle-cameras.js');
var CamerasListBox    = require('./cameras-list.js');
var Timeline          = require('./timeline/timeline-component.js');
var Toolbar           = require('./toolbar/toolbar.js');

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
	<Toolbar/>,
	document.getElementById('timeline-toolbar-container')
);


React.render(
	<Timeline />,
	document.getElementById('timeline-container')
);

