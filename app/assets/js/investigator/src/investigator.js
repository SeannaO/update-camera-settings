React.render(
	<div>
		<CameraGrid/>
		<CamerasListBox url='/cameras.json' />
	</div>,
	document.getElementById('main')
);
