////
// CameraGrid
//
var React           = require('react/addons');
var CameraContainer = require('./camera-container.js');
var ReactDND        = require('react-dnd');

var Animation = React.addons.CSSTransitionGroup;

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

		var sizes = component.recalculateSizes(newCameras.length);
		component.setState({
			cameras:       newCameras,
			height:        sizes.height,
			playerWidth:   sizes.playerWidth,
			playerHeight:  sizes.playerHeight,
			paddingLeft:   sizes.paddingLeft
		});
	}
};


var CameraGrid = React.createClass({

	mixins: [ReactDND.DragDropMixin],

		
	statics: {
		configureDragDrop: function(register) {
			register('cameraItem', {
				dropTarget: itemDropTarget
			});
		}
	},

	moveCamera: function(id, afterId) {
// 		var cameras = this.state.cameras;
//
// 		var camIndex, 
// 			afterIndex;
//
// 		for(var i in cameras) {
// 			if (cameras[i].id == id) camIndex = i;
// 			if (cameras[i].id == afterId) afterIndex = i;
// 		}
// 	
// 		var cam = cameras[camIndex];
//
// 		this.setState(React.addons.update(this.state, {
// 			cameras: {
// 				$splice: [
// 					[camIndex, 1],
// 					[afterIndex, 0, cam]
// 				]
// 			}
// 		}));
	},

	recalculateSizes: function( n_cameras ) {

		var el     = this.refs.grid.getDOMNode();
		var width  = el.offsetWidth;
		var height = el.offsetHeight;

		var yPos = $(el).offset().top;

		var h = $(window).height() - yPos;
		var w = width;

		var nCameras = n_cameras || this.state.cameras.length;

		if (!nCameras) return {};

		var total_area = 1.0*w*h / nCameras;
		var scale      = Math.sqrt( total_area / 12.0 );

		var player_w = scale * 4;
		var player_h = scale * 3;

		var fit = false;
		var nx, ny;

		while (!fit && scale > 0) {
			scale-=2;
			player_w = scale * 4;
			player_h = scale * 3;
			nx = Math.floor( w / ( player_w + 15 ) );
			nx = nx > nCameras ? nCameras : nx;
			if (nx == 0) continue;

			ny = Math.ceil( nCameras / nx );
			fit = ( nx*(player_w + 5) <= w-50 && ny*player_h <= h-40 );
		};

		var margin_left = ( w - nx * ( player_w + 10 ) ) / 2.0;

		if ( nx == 3 && nCameras == 4) {
			margin_left = ( w - 2 * ( player_w + 10 ) ) / 2.0;
		}

		return {
			height:        h + 'px',
			playerWidth:   player_w,
			playerHeight:  player_h,
			paddingLeft:   margin_left
		}
	},

	handleResize: function(e) {

		// TODO
		// add debouncing (only re-render when done resizing)
		//
		var sizes = this.recalculateSizes();

		this.setState({
			height:        sizes.height,
			playerWidth:   sizes.playerWidth,
			playerHeight:  sizes.playerHeight,
			paddingLeft:   sizes.paddingLeft
		});
	},

	changeDate: function(e, d) {
		var begin = d.timestamp;
		var end  = d.timestamp + 24*60*60*1000;
		this.setState({
			begin:  begin,
			end:    end
		});
	},

	componentDidMount: function() {
		window.addEventListener('resize', this.handleResize);
		$(window).on('day-selected', this.changeDate);

		var self = this;
	},

	removeCamera: function(cameraItem) {
		return function() {
			cameraItem.enable();
			var cameras = this.state.cameras;
			for (var i in cameras) {
				if (cameras[i].id == cameraItem.id) break;
			}
			cameras.splice(i, 1);

			var sizes = this.recalculateSizes(cameras.length);
			this.setState({
				cameras:       cameras,
				height:        sizes.height,
				playerWidth:   sizes.playerWidth,
				playerHeight:  sizes.playerHeight,
				paddingLeft:   sizes.paddingLeft
			});

		}.bind(this)
	},

	getInitialState: function() {
		return{
			cameras:       [],
			width:         '100%',
			height:        '100%',
			playerWidth:   480,
			playerHeight:  360,
			paddingLeft:   0
		}
	},

	render: function() {
		
		var self = this;

		var width  = this.state.playerWidth,
			height = this.state.playerHeight;

		var style = {
			width:        this.state.width,
			height:       this.state.height,
			paddingLeft:  this.state.paddingLeft
		};
			
		var list = this.state.cameras.map( function(cameraItem) {
			return (
				<CameraContainer 
					ref        = {cameraItem.id}
					width      = {width}
					height     = {height}
					key        = {cameraItem.id}
					cam_id     = {cameraItem.id}
					name       = {cameraItem.name}
					ip         = {cameraItem.ip}
					close      = {self.removeCamera(cameraItem)}
					streams    = {cameraItem.streams}
					moveCamera = {self.moveCamera}
					begin      = {self.state.begin}
					end        = {self.state.end}
				/>
			);
		});

		return (
			<div ref = 'grid' {...this.dropTargetFor('cameraItem')} className='cameraGrid' style={style}>
				{ list }	
			</div>
		);
	}
});

module.exports = CameraGrid;
