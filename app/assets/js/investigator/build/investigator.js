React.render(
	React.createElement("div", null, 
		React.createElement(CameraGrid, null), 
		React.createElement(CamerasListBox, {url: "/cameras.json"})
	),
	document.getElementById('main')
);
