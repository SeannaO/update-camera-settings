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
var React           = require('react/addons');
var PlayerContainer = require('./player-container.js');


var CameraContainer = React.createClass({


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
			height:  '360px',
		}
	},

	render: function() {

		var style = {
			width:   this.props.width,
			height:  this.props.height
		}

		return (
			<div ref = 'container' className='camera-container' style={style}
				// {...this.dragSourceFor('cameraContainer')}
				// {...this.dropTargetFor('cameraContainer')}
			>
				<div className='camera-container-menu'>
					<div className='close-window' onClick = {this.props.close}> [ x ] </div>
					<div className='window-title'>
						{this.props.name || this.props.ip}
					</div>
				</div>

				<PlayerContainer 
					cam_id  = {this.props.cam_id}
					ip      = {this.props.ip}
					streams = {this.props.streams}
					key     = {this.props.cam_id}
					begin   = {this.props.begin}
					end     = {this.props.end}
				/>
			</div>
		);
	}
});

module.exports = CameraContainer;
