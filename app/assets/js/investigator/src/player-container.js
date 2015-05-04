var React    = require('react/addons');
var swfUtils = require('./swf-utils.js');
var bus      = require('./event-service.js');

var PureRenderMixin = require('react/addons').addons.PureRenderMixin;

//
//

global.playerListener = function(id, evName, obj) {

	var id = id.replace('strobe-', '');

	bus.emit('playerEvent', {
		id:      id,
		evName:  evName
	});

	if (evName == 'timeupdate') {

		bus.emit('playerEvent-timeupdate-' + id, {
			time:  obj.currentTime
		});
	}
};


var PlayerContainer = React.createClass({

	mixins: [ PureRenderMixin ],

	statics: {
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

	handleSeek: function(d) {
		
		if (!!d.id && d.id !== this.props.cam_id) {
			return;
		}

		var absolute_time = d.time;
		var relative_time = this.indexer.getRelativeTime( absolute_time, false );

		this.seek( relative_time, absolute_time );
	},
	
	seek: function( relative_time ) {
		if ( isNaN(relative_time) ) {

			this.setState({
				status: "no_video_recorded" 
			});

			this.pause();
			return;
		}

		this.player.seek( relative_time );
		this.play();

		this.setState({
			status: 'loading'
		});

	},

	pause: function() {
		if (this.player.getState() != 'playing') {
			console.log('not playing');
			return;
		}

		try {
			this.player.pause();	
		} catch(err) {
			console.log( err );
		}
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
			this.player.setMediaResourceURL( url );
		} catch(err) {
			console.log(err);
		}
	},

	getInitialState: function() {
		return {
			status: 'just_loaded'
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
			javascriptCallbackFunction:      "window.playerListener",
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
					allowFullScreen:  "true",
					wmode:            'direct',
				}
				, {
					name: playerID
				}
		);

		this.player = document.getElementById( 'strobe-' + this.props.cam_id);
		// this.player = $('#strobe-' + this.props.cam_id)[0];
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

				bus.emit('camera-metadata', {
					id:        this.props.cam_id,
					segments:  this.indexer.groups,
					indexer:   this.indexer
				});

				if (done) done();
			}.bind(this),
			error: function(err) {
				if(done) done(err);
			}
		});
	},

	broadcastTime: function(d) {
		
		var time = this.indexer.getAbsoluteTime(d.time);

		this.currentTime = time;

		this.setState({
			status: 'playing'
		});

		bus.emit('playerEvent-timeupdate', {
			id:    this.props.cam_id,
			time:  time
		});
	},

	componentDidMount: function() {

		this.indexer = new Indexer();
		this.embedFlashPlayer();
		this.loadIndexer();

		bus.on('playerEvent-timeupdate-' + this.props.cam_id, this.broadcastTime );
		bus.on('seek', this.handleSeek);
		bus.on('showThumb', this.handleThumb);
		bus.on('hideThumb', this.handleHideThumb);
		bus.on('play', this.handlePlay);
		bus.on('pause', this.handlePause);
	},

	handlePlay: function() {
		this.play();
	},

	handlePause: function() {
		this.pause();
	},


	handleHideThumb: function() {
		this.setState({
			thumb: null
		});
	},

	handleThumb: function(d) {
		if (!!d.id && d.id !== this.props.cam_id) {
			return;
		}

		this.setState({
			thumb: d.thumb || 'no_thumb'
		});
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

	removeSWF: function() {
		swfobject.removeSWF( 'strobe-' + this.props.cam_id );
	},

	componentWillUnmount: function() {

		this.removeSWF();

		bus.removeListener('playerEvent-timeupdate-' + this.props.cam_id, this.broadcastTime);
		bus.removeListener('seek', this.handleSeek);
		bus.removeListener('showThumb', this.handleThumb);
		bus.removeListener('hideThumb', this.handleHideThumb);
		bus.removeListener('play', this.handlePlay);
		bus.removeListener('pause', this.handlePause);
	},

	render: function() {

		var thumbOverlayStyle = {
			display: this.state.thumb ? '' : 'none'
		};

		var thumbEl;
		if (this.state.thumb == 'no_thumb') {
			thumbEl = <center><div className='overlay-message'>no video recorded</div></center>
		} else {
			thumbEl = <img src={this.state.thumb} width='100%' height='100%'/>
		}

		var statusOverlayStyle = {
			display: this.state.status == 'playing' ?  'none' : ''
		};

		var overlay_message = '';
		if (this.state.status == 'no_video_recorded') overlay_message = 'no video recorded';
		else if (this.state.status == 'loading') overlay_message = 'loading...';
		else if (this.state.status == 'just_loaded') overlay_message = 'player ready';

		return (
			<div 
				ref       = {this.props.cam_id}
				className = 'player-container'
			>
				<div 
					id = {'strobe-' + this.props.cam_id}
					className = 'player-container'
				/>

				<div className = 'status-overlay' style = {statusOverlayStyle}>
					<center>
						<div className='overlay-message'>{overlay_message}</div>
					</center>
				</div>

				<div className = 'status-overlay' style = {thumbOverlayStyle}>
					{thumbEl}
				</div>
			</div>
		);
	}
});

module.exports = PlayerContainer;

