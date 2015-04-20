var React    = require('react/addons');
var swfUtils = require('./swf-utils.js');

				// <div className = 'status-overlay'>
				// 	loading...
				// </div>
//
//
var PlayerContainer = React.createClass({

	statics: {
		playerListener: function(id, evName, obj) {
			$(window).trigger('player', {
				id:      id,
				evName:  evName
			});
		}
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
				+ '?begin=' + time.begin
				+ '&end=' + time.end
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

		try {
			this.player.setSrc(url);
			this.player.load();
		} catch(err) {
			console.log(err);
		}
	},

	getInitialState: function() {
		return {
		}
	},

	embedFlashPlayer: function() {
		var width  = this.props.width || '100%';
		var height = this.props.height || '100%';

		var autoplay = this.props.autoplay || true;

		var url = this.generateUrl({
			begin:  this.props.begin,
			end:    this.props.end
		});

		var playerID = 'strobe-' + this.props.cam_id;

		var parameters = {
			src: 							 encodeURIComponent( url ),
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
				, playerID
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
					name: playerID
				}
		);

		this.player = $('#strobe-' + this.props.cam_id)[0];
	},


	loadIndexer: function( done ) {

		this.indexer.clear();

		if (!this.props.begin || !this.props.end) return;

		var url = '/cameras/'
				+ this.props.cam_id
				+ '/streams/'
				+ this.props.streams[0].id
				+ '/list_videos?'
				+ '&start=' + this.props.begin
				+ '&end=' + this.props.end;
				
		$.ajax({
			url: url,
			dataType: 'json',
			success: function(data) {
				for(var d of data.videos) {
					this.indexer.push( d );
				}
				if (done) done();
			}.bind(this),
			error: function(err) {
				if(done) done(err);
			}
		});
	},


	componentDidMount: function() {

		this.indexer = new Indexer();
		this.embedFlashPlayer();
		this.loadIndexer();
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

		this.loadIndexer( function(err) {
			this.loadVideo({
				time:    time,
				stream:  stream
			});
		}.bind(this));


	},

	componentWillUnmount: function() {
		swfobject.removeSWF( 'strobe-' + this.props.cam_id );
		console.log('unmount');
	},

	render: function() {
		console.log('render');
		return (
			<div 
				ref       = 'container'
				className = 'player-container' 
			>
				<div id = {'strobe-' + this.props.cam_id}
					className = 'player-container'
				/>
			</div>
		);
	}
});

module.exports = PlayerContainer;

