var iOS = ( navigator.userAgent.match(/(iPad|iPhone|iPod)/g) ? true : false );

function Player( el ) {

	var self = this;

	this.layers = {};

	this.el = el;

	this.layers.livePlayer = $("<div>", {
		id:      'live-player',
		class:   'player-layer'
	}).appendTo(el);


	var controls = iOS ? 'controls' : '';
	
	this.layers.nativePlayer = $("<video autoplay " + controls + " class='player-layer'>", {
		id:      'native-player'
	}).appendTo(el);
	
	this.layers.snapshot = $("<div>", {
		id:      'snapshot',
		class:   'player-layer'
	}).appendTo(el);

	this.layers.strobePlayer = $("<object>", {
		id:      'strobeMediaPlayback-' + $(self.el).attr('id'),
		class:   'player-layer'
	}).appendTo(el);
	console.log( this.layers.strobePlayer[0] );

	this.layers.strobePlayer.html(
		"<p>( this player requires flash. check if it's enabled and make sure your browser supports flash )</p>"
	);

	window.onCurrentTimeChange = function (time, playerId) {
		if (self.mode == 'live') {
			clearTimeout( self.playerInactiveTimeout );
			self.playerInactiveTimeout = setTimeout( function() {
				console.log(el);
				$(window).trigger('playerInactive', el);
			}, 3000);
		}
		$(window).trigger( 'currentTimeChange', time );
	}

	$(window).on('currentTimeChange', function(e, t) {
		self.currentTime = t;
	});

	this.currentPlayer = null;
}


/**
 * Launches native player 
 *		runs on safari (osx/ios) / some android devices
 */
Player.prototype.launchNativePlayer = function( url ) {
	
	self = this; 

	this.currentPlayer = 'native';

	for( var i in this.layers ) {
		this.layers[i].hide();
	}
	this.layers.nativePlayer.show();
	this.layers.nativePlayer.attr("width", "100%");
	this.layers.nativePlayer.attr("height", "100%");
	this.layers.nativePlayer.attr("position", "absolute");
	this.layers.nativePlayer.attr("src", url);
	this.layers.nativePlayer[0].addEventListener('timeupdate',function( e ){
		var t = self.layers.nativePlayer[0].currentTime;
		$(window).trigger('currentTimeChange', t );
	});
};


/**
 * Launches vlc plugin player
 *		doesnt run well on osx 
 *		DEPRECATED
 */
Player.prototype.showLiveStream = function( url ) {
	console.log('deprecated function');
};


/**
 * Launches strobe player
 *  
 */
Player.prototype.launchStrobePlayer = function( options ) {

	var self = this;

	this.currentPlayer = 'strobe';
	
	for( var i in this.layers ) {
		this.layers[i].hide();
	}

	this.layers.strobePlayer.show();

	options.url = encodeURIComponent( options.url );

	var width = options.width || '100%';
	var height = options.height || '100%';

	var parameters = {
		src:                             options.url,
		autoPlay:                        options.autoplay,
		verbose:                         true,
		controlBarMode:                  "none",
		// controlBarAutoHide:           "true",
		// controlBarPosition:           "bottom",
		poster:                          "",
		plugin_hls:                      "/swf/HLSDynamicPlugin.swf",
		javascriptCallbackFunction:      "window.onJavaScriptBridgeCreated",
		bufferTime:                      0.1,
		dvrBufferTime:                   0.1,
		initialBufferTime:               0.1,
		dvrDynamicStreamingBufferTime:   0.1,
		liveBufferTime:                  0.1,
		liveDynamicStreamingBufferTime:  0.1
	};

	var wmodeValue = "direct";
	var wmodeOptions = ["direct", "opaque", "transparent", "window"];

	if ( parameters.hasOwnProperty("wmode") ) {
		if (wmodeOptions.indexOf(parameters.wmode) >= 0) {
			wmodeValue = parameters.wmode;
		}	            	
		delete parameters.wmode;
	}

	// Embed the player SWF:	            
	swfobject.embedSWF(
			"/swf/StrobeMediaPlayback.swf"
			, "strobeMediaPlayback-" + $(self.el).attr('id')
			, width
			, height
			, "10.0.0"
			, "/swf/expressInstall.swf"
			, parameters
			, {
				allowFullScreen: "true",
				wmode: wmodeValue
			}
			, {
				name: "strobeMediaPlayback-" + $(self.el).attr('id')
			}
	);

// 	window.onCurrentTimeChange = function (time, playerId) {
// 		var timelineWidth = $("#timeline").width();	
// 	    var totalTime = 24*60*60;
// 		var absolute_time = indexer.getAbsoluteTime( time );
// 		var dt = ( absolute_time - timeline.begin )/1000; 
// 		var pos = dt * (1.0 * timelineWidth) / totalTime - 2;
// 		$("#marker").css("left", pos);
// 	}
// 			
// 	window.onDurationChange = function (time, playerId) {
// 	}
//
	this.layers.strobePlayer = $("#strobeMediaPlayback-" + $(self.el).attr('id'));

	var player;
	window.onJavaScriptBridgeCreated = function(playerId) {
		if (!player ) {
			player = document.getElementById(playerId);
			// Add event listeners that will update the 
			player.addEventListener("currentTimeChange" , "window.onCurrentTimeChange");
			player.addEventListener("durationChange"    , "window.onDurationChange");

			// Pause/Resume the playback when we click the Play/Pause link
			document.getElementById("play-pause").onclick = function(){
				var state = player.getState();
				if (state == "ready" || state == "paused") {
					player.play2();
				}
				else if (state == "playing") {
					player.pause();
				}
				return false;
			};
		}
	}
};


Player.prototype.seek = function( time ) {
	
	if( this.currentPlayer == 'strobe' ) {
		this.layers.strobePlayer[0].seek( time );
	} else if (this.currentPlayer == 'native' ) {
		this.layers.nativePlayer[0].currentTime = time;
	}
};


Player.prototype.canSeekTo = function( time ) {
	
	if( this.currentPlayer == 'strobe' ) {
		return this.layers.strobePlayer[0].canSeekTo( time );
	} else if( this.currentPlayer == 'native' ) {
		return true;
	}
}

Player.prototype.play = function() {
	
	if( this.currentPlayer == 'strobe' ) {
		this.layers.strobePlayer[0].play2();
	} else if( this.currentPlayer == 'native' ) {
		console.log('native');
		this.layers.nativePlayer[0].play();
	}
};

/**
 * Jumps to specified time  
 *	@param { time } Number
 *		elapsed time in seconds
 */
Player.prototype.jumpTo = function( time ) {
	
	// console.log(time);
	// console.log(this.currentPlayer + ' jumpTo: ' + time ); 
	if (this.currentPlayer  == 'strobe') {	
		// var player = document.getElementById("strobeMediaPlayback");
		var player = this.layers.strobePlayer[0];
		if ( player.canSeekTo(time) ) {
			console.log("seek to " + time);
			player.seek(time);
			player.play2();
		}
	} else if( this.currentPlayer  == 'native' ) {
		this.layers.nativePlayer[0].currentTime = time;	
	}
};

Player.prototype.stopFF = function() {
	clearInterval(this.ffInterval);
};

Player.prototype.ff = function() {

	var self = this;
	var dt = this.currentTime;
	this.ffInterval = setInterval( function() {
		dt += 1;
		self.jumpTo( dt );
	}, 200/3.0);
}

/**
 * Plays video using compatible player 
 *  if platform doesnt support native hls, uses flash player instead
 *
 *	@param { stream } String
 *		stream id
 *	@param { begin } Number
 *		begin time (utc millisecs)
 *	@param { end } Number
 *		end time (utc millisecs)
 *  
 */
Player.prototype.playVideo = function( camId, streamId, begin, end ) { 
	
	// loadIndexer( begin, end, function() {
	// 	launchTimeline( 50, begin, end);
	// });

	var url = "";

	if (!begin && !end) {
		this.mode = 'live';
		url = window.location.protocol + "//" + window.location.host +
			"/cameras/" + camId + 
			"/live.m3u8" +
			"?stream=" + streamId;
	} else {	
		this.mode = 'archived';
		url = window.location.protocol + "//" + window.location.host +
			"/cameras/" + camId + 
			"/video.m3u8?begin=" + begin +
			"&end=" + end +
			"&stream=" + streamId;
	}
	console.log( url );

	if (!this.canPlayHLS()) {
		this.launchStrobePlayer({
			url:       url,
			autoplay:  true
		});
	} else {
		this.launchNativePlayer( url );
	}
};


Player.prototype.resume = function() {
	

	if( this.currentPlayer == 'strobe' ) {
		this.layers.strobePlayer[0].play2();
	} else if( this.currentPlayer == 'native' ) {
		console.log('native');
		this.layers.nativePlayer[0].play();
	}
}

/**
 * Checks if broser supports hls natively
 *
 */
Player.prototype.canPlayHLS = function() {
	return document.createElement('video').canPlayType('application/vnd.apple.mpegURL') === 'maybe';
};


Player.prototype.hideAll = function() {
	
	var self = this;
	for( var i in this.layers ) {
		this.layers[i].hide();
	}
};

