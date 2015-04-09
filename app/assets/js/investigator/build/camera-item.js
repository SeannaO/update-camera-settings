var itemDragSource = {
	beginDrag: function(component) {
		return {
			item: {
				name:     component.props.name,
				ip:       component.props.ip,
				streams:  component.props.streams,
				enable:   component.enable,
				id:       component.props.cam_id
			}
		};
	},

	endDrag: function( component, effect ) {
		if(effect) {
			component.setState({
				hasDropped: true
			});
		}
	},

	canDrag: function( component ) {
		return !component.state.hasDropped;
	}
};


var CameraItem = React.createClass({displayName: "CameraItem",

	mixins: [ReactDND.DragDropMixin],

	getInitialState: function() {
		return {
			hasDropped: false
		};
	},

	statics: {
		configureDragDrop: function(register) {
			register('cameraItem', {
				dragSource: itemDragSource
			});
		}
	},

	enable: function() {
		this.setState({
			hasDropped: false
		});
	},

	render: function() {

		var cx = React.addons.classSet;

		var classes = cx({
			'camera-item':            true,
			'camera-item-available':  !this.state.hasDropped,
			'camera-item-disabled':   this.state.hasDropped
		});

		var isDragging = this.getDragState('cameraItem').isDragging? 'dragging' : 'not dragging';

		// if (isDragging) return null;

		return (
			React.createElement("div", React.__spread({className: classes},  this.dragSourceFor('cameraItem')), 
				this.props.name, 
				React.createElement("br", null), 
				this.props.ip
			)
		);
	}
});


