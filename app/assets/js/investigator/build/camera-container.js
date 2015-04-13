//
//

// var dragSource = {
// 	beginDrag: function(component) {
// 		return {
// 			item: {
// 				id: component.props.cam_id
// 			}
// 		};
// 	}
// };

// var dropTarget = {
// 	over: function(component, item) {
// 		component.props.moveCamera(item.id, component.props.cam_id);
// 	}
// };


var CameraContainer = React.createClass({displayName: "CameraContainer",


// 	mixins: [ReactDND.DragDropMixin],	
//
// 	statics: {
// 		configureDragDrop: function(register) {
// 			register('cameraContainer', {
// 				dropTarget:  dropTarget,
// 				dragSource:  dragSource
// 			});
// 		}
// 	},

	componentDidMount: function() {
	},

	getInitialState: function() {
		return {
			width:   '480px',
			height:  '360px'
		}
	},

	render: function() {

		var style = {
			width:   this.props.width,
			height:  this.props.height
		}

		return (
			React.createElement("div", {ref: "container", className: "camera-container", style: style
				// {...this.dragSourceFor('cameraContainer')}
				// {...this.dropTargetFor('cameraContainer')}
			}, 
				React.createElement("div", {className: "camera-container-menu"}, 
					React.createElement("div", {className: "close-window", onClick: this.props.close}, " [ x ] "), 
					React.createElement("div", {className: "window-title"}, 
						this.props.name || this.props.ip
					)
				), 

				React.createElement(PlayerContainer, {
					cam_id: this.props.cam_id, 
					ip: this.props.ip, 
					streams: this.props.streams, 
					key: this.props.cam_id, 
					begin: this.props.begin, 
					end: this.props.end}
				)
			)
		);
	}
});

