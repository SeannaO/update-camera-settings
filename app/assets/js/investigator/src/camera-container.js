//
//

var CameraContainer = React.createClass({

	getParameters: function() {

	},

	click: function() {
		console.log('click');
	},

	componentDidMount: function() {
		var width  = this.props.width || '100%';
		var height = this.props.height || '100%';

		var autoplay = this.props.autoplay || true;

		var url = window.location.protocol + "//" + window.location.host +
			"/cameras/" + this.props.cam_id + 
			"/live.m3u8" +
			"?stream=" + this.props.streams[0].id;

		var parameters = {
			src: 							 url,
			autoPlay:                        autoplay,
			verbose:                         true,
			controlBarMode:                  "none",
			// controlBarAutoHide:           "true",
			// controlBarPosition:           "bottom",
			poster:                          "",
			plugin_hls:                      "/swf/HLSDynamicPlugin.swf",
			javascriptCallbackFunction:      "Player.setupPlayersCallback",
			bufferTime:                      0.1,
			dvrBufferTime:                   0.1,
			initialBufferTime:               0.1,
			dvrDynamicStreamingBufferTime:   0.1,
			liveBufferTime:                  0.1,
			liveDynamicStreamingBufferTime:  0.1
		};


		swfobject.embedSWF(
				"/swf/StrobeMediaPlayback.swf"
				, "player-" + this.props.cam_id
				, width
				, height
				, "10.0.0"
				, "/swf/expressInstall.swf"
				, parameters
				, {
					allowFullScreen: "true",
					wmode: 'direct'
				}
				, {
					name: "player-" + this.props.cam_id
				}
		);
	},

	render: function() {
		return (
			<div className='camera-container'>
				<div className='camera-container-menu'>
					<div className='close-window' onClick = {this.props.close}> [ x ] </div>
					<div className='window-title'>
						{this.props.name || this.props.ip}
					</div>
				</div>

				<div id = {"player-" + this.props.cam_id}>
				</div>
			</div>
		);
	}
});

