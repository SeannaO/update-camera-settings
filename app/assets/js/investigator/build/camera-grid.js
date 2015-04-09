////
// CameraGrid
//

var itemDropTarget = {
	acceptDrop: function(component, item) {
		var newCameras = component.state.cameras;
		newCameras.push({
			name:     item.name,
			ip:       item.ip,
			id:       item.id,
			streams:  item.streams,
			enable:   item.enable
		});
		component.setState({cameras: newCameras});
	}
};


var CameraGrid = React.createClass({displayName: "CameraGrid",

	mixins: [ReactDND.DragDropMixin],

	statics: {
		configureDragDrop: function(register) {
			register('cameraItem', {
				dropTarget: itemDropTarget
			});
		}
	},

	handleResize: function(e) {
		var el = this.refs.grid.getDOMNode();
		var width = el.offsetWidth;
		var height = el.offsetHeight;

		if (this.state.cameras.length) {
			var cam = this.state.cameras[0];

			debugger;
		}
	},

	componentDidMount: function() {
		window.addEventListener('resize', this.handleResize);
	},

	removeCamera: function(cameraItem) {
		return function() {
			cameraItem.enable();
			var cameras = this.state.cameras;
			for (var i in cameras) {
				if (cameras[i].id == cameraItem.id) break;
			}
			cameras.splice(i, 1);
			this.setState({cameras: cameras});
		}.bind(this)
	},

	getInitialState: function() {
		return{ 
			cameras: []
		}
	},

	render: function() {
		
		var self = this;
		var list = this.state.cameras.map( function(cameraItem) {
			return (
				React.createElement(CameraContainer, {
					ref: cameraItem.cam_id, 
					key: cameraItem.cam_id, 
					cam_id: cameraItem.id, 
					name: cameraItem.name, 
					ip: cameraItem.ip, 
					close: self.removeCamera(cameraItem), 
					streams: cameraItem.streams}
				)
			);
		});

		return (
			React.createElement("div", React.__spread({ref: "grid"},  this.dropTargetFor('cameraItem'), {className: "cameraGrid"}), 
				 list 	
			)
		);
	}
});

