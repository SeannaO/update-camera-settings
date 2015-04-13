//
//
var PlayerContainer = React.createClass({

	statics: {
		playerListener: function(id, evName, obj) {
			// console.log(id + ' : ' + evName);
			$(window).trigger('player', {
				id: id,
				evName: evName
			});
		}
	},

	playerListener: function() {
		console.log('listener2');
	},

	getParameters: function() {
	},

	click: function() {
		console.log('click');
	},

	play: function() {
		this.player.play2();
	},

	generateUrl: function( time ) {

		var url;

		if( !!time ) {
			url = window.location.protocol + '//'
				+ window.location.host 
				+ '/cameras/' + this.props.cam_id
				+ '/video.m3u8'
				+ '?begin=' + this.props.begin
				+ '&end=' + this.props.end
				+ '&stream=' + this.props.streams[0].id;
		} else {
			url = window.location.protocol + "//" + 
				window.location.host +
				"/cameras/" + this.props.cam_id + 
				"/live.m3u8" +
				"?stream=" + this.props.streams[0].id;
		}

		return url;
	},

	setUrl: function() {
			
	},

	pause: function() {
		this.player.pause();	
	},

	refresh: function() {
		this.player.load();
	},

	loadVideo: function( params ) {
		
		var time   = params.time;
		var stream = params.stream;

		var url = this.generateUrl( time );
		if(!url) return;

		console.log(url);

		try {
			this.player.setSrc(url);
			this.player.load();
		} catch(err) {
			console.log(err);
		}
	},

	componentDidMount: function() {

		var width  = this.props.width || '100%';
		var height = this.props.height || '100%';

		var autoplay = this.props.autoplay || true;

		var url = this.generateUrl();


		var parameters = {
			src: 							 url,
			autoPlay:                        autoplay,
			verbose:                         true,
			controlBarMode:                  "none",
			poster:                          "",
			plugin_hls:                      "/swf/HLSDynamicPlugin.swf",
			javascriptCallbackFunction:      "PlayerContainer.playerListener",
			bufferTime:                      0.1,
			dvrBufferTime:                   0.1,
			initialBufferTime:               0.1,
			dvrDynamicStreamingBufferTime:   0.1,
			liveBufferTime:                  0.1,
			liveDynamicStreamingBufferTime:  0.1
		};


		swfobject.embedSWF(
				"/swf/StrobeMediaPlayback.swf"
				, "strobe-" + this.props.cam_id
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
					name: "strobe-" + this.props.cam_id
				}
		);

		this.player = $('#strobe-' + this.props.cam_id)[0];
	},

	componentDidUpdate: function( prevProps, prevState) {

		if ( prevProps.begin == this.props.begin 
			&& prevProps.end == this.props.end 
			&& prevProps.activeStream == this.props.activeStream
		) return;

		var time = {
			begin:  this.props.begin,
			end:    this.props.end
		};

		var stream = this.props.activeStream;

		this.loadVideo({
			time:    time,
			stream:  stream
		});
	},

	componentWillUnmount: function() {
		swfobject.removeSWF( 'strobe-' + this.props.cam_id );
		console.log('unmount');
	},

	render: function() {
		return (
			<div ref = 'container' id = {'strobe-' + this.props.cam_id} className='player-container'>
			</div>
		);
	}
});

