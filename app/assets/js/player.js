var iOS = ( navigator.userAgent.match(/(iPad|iPhone|iPod)/g) ? true : false );

Player.players = {};
Player.setupPlayersCallback = function(playerId, evtName, evtObj) {
	var self = this;
	
	var player = Player.players[playerId];

	if (!('#' + playerId) || player.cbSet) return;
	player.cbSet = true;
	
	playerEl = document.getElementById(playerId);
	// Add event listeners that will update the 
	playerEl.addEventListener("currentTimeChange" , "Player.currentTimeChange" );
	// player.addEventListener("durationChange"    , "window.onDurationChange");

	// Pause/Resume the playback when we click the Play/Pause link
	// document.getElementById("play-pause").onclick = function(){
	// 	var state = player.getState();
	// 	if (state == "ready" || state == "paused") {
	// 		player.play2();
	// 	}
	// 	else if (state == "playing") {
	// 		player.pause();
	// 	}
	// 	return false;
	// };
};
Player.currentTimeChange = function(time, playerId) {
	var player = Player.players[playerId];
	player.currentTimeChange(time, playerId);
};

Player.prototype.setInactiveTimer = function() {

	var self = this;
	clearTimeout( self.playerInactiveTimeout );
	self.playerInactiveTimeout = setTimeout( function() {
		var retrigger = true;
		if (self.state != 'loading') retrigger = self.refresh();
		if (retrigger) self.setInactiveTimer();
	}, 30000);
};

Player.prototype.currentTimeChange = function(time, playerId) {
	var self = this;
	if (self.state == 'pause') return;
	self.state = 'playing';
	if (self.mode == 'live') {
		clearTimeout( self.playerInactiveTimeout );
		self.setInactiveTimer();
	}
	$(window).trigger( 'currentTimeChange', time );
};

function Player( el, port ) {

	Player.players['strobeMediaPlayback-' + $(el).attr('id')] = this;

	var self = this;

	self.port = port;

	this.layers = {};

	this.el = el;

	$(el).bind("DOMSubtreeModified", function() {
		self.cbSet = false;
	});

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

	this.layers.strobePlayer.html(
		"<p>( this player requires flash. check if it's enabled and make sure your browser supports flash )</p>"
	);

	window.onCurrentTimeChange = function (time, playerId) {
	}

	$(window).on('currentTimeChange', function(e, t) {
		if (self.currentPlayer == 'strobe' && t == 0) {
			self.jumpTo(self.currentTime);
			return;
		}
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
	this.state = 'instantiated';
	this.layers.nativePlayer[0].addEventListener('waiting',function( e ){
		this.state = 'loading';
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
	self.cbSet = false;

	if (self.mode == 'live') {
	} else {
		clearTimeout( self.playerInactiveTimeout );
	}

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
		javascriptCallbackFunction:      "Player.setupPlayersCallback",
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

	this.playerId = "strobeMediaPlayback-" + $(self.el).attr('id');

	this.layers.strobePlayer = $("#strobeMediaPlayback-" + $(self.el).attr('id'));

};

Player.prototype.setupCallbacks = function() {
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

Player.prototype.pause = function() {
	
	this.state = 'pause';
	$(window).trigger('playerState', 'pause');

	if( this.currentPlayer == 'strobe' ) {
		try {
			this.layers.strobePlayer[0].pause();
		} catch (err) {
		}
	} else if( this.currentPlayer == 'native' ) {
		this.layers.nativePlayer[0].pause();
	}
};

Player.prototype.play = function() {
	
	this.state = 'playing';
	$(window).trigger('playerState', 'playing');

	if( this.currentPlayer == 'strobe' ) {
		this.layers.strobePlayer[0].play2();
	} else if( this.currentPlayer == 'native' ) {
		this.layers.nativePlayer[0].play();
	}
};

Player.prototype.togglePlay = function() {

	if (this.state == 'playing') {
		this.pause();
	} else {
		this.play();
	}

};

/**
 * Jumps to specified time  
 *	@param { time } Number
 *		elapsed time in seconds
 */
Player.prototype.jumpTo = function( time ) {
	
	if (this.currentPlayer  == 'strobe') {	
		var player = this.layers.strobePlayer[0];
		if ( player.canSeekTo(time) ) {
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
	
	this.camId = this.camId || camId;
	this.streamId = this.streamId || streamId;

	camId = camId || this.camId;
	streamId = streamId || this.streamId;

	this.state = 'playing';

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

	if(this.port) {
		var re = /:\w+/;
		url = url.replace( re, ':' + this.port );
	}

	if (!this.canPlayHLS()) {
		this.launchStrobePlayer({
			url:       url,
			autoplay:  true
		});
	} else {
		this.launchNativePlayer( url );
	}
};

Player.prototype.refresh = function() {

	if (!this.canPlayHLS()) {
		try {
			this.layers.strobePlayer[0].load();
			return true;
		} catch( err ) {
			return false;
		}
	}
	return true;
};

Player.prototype.resume = function() {
	

	if( this.currentPlayer == 'strobe' ) {
		this.layers.strobePlayer[0].play2();
	} else if( this.currentPlayer == 'native' ) {
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


Player.prototype.destroy = function() {
	clearTimeout( this.playerInactiveTimeout );
	playerEl = document.getElementById(this.playerId);
	if (!playerEl) return;
	playerEl.removeEventListener("currentTimeChange" , "Player.currentTimeChange");
	swfobject.removeSWF('strobeMediaPlayback-' + $(this.el).attr('id') );
};
