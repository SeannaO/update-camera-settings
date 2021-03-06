var React    = require('react/addons');
var ReactDND = require('react-dnd');

var itemDragSource = {
	beginDrag: function(component) {
		return {
			item: {
				name:     component.props.name,
				ip:       component.props.ip,
				streams:  component.props.streams,
				id:       component.props.cam_id
			}
		};
	},

	endDrag: function( component, effect ) {
		if(effect) {
			component.disable();
		}
	},

	canDrag: function( component ) {
		return !component.state.hasDropped;
	}
};


var CameraItem = React.createClass({

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

	disable: function() {
		this.setState({
			hasDropped: true
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
			<div className={classes} {...this.dragSourceFor('cameraItem')}>
				{this.props.name}
				<br/>
				{this.props.ip}
			</div>
		);
	}
});

module.exports = CameraItem;
