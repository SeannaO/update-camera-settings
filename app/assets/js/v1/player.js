function Player() {

	this.layers = {};
	
	this.layers.livePlayer = $("<div>", 
		id:      '#live-player',
		class:   'player-layer'
	).appendTo(el);

	this.layers.nativePlayer = $("<video>", 
		id:      '#native-player',
		class:   'player-layer'
	).appendTo(el);
	
	this.layers.snapshot = $("<div>", 
		id:      '#snapshot',
		class:   'player-layer'
	).appendTo(el);

	this.layers.strobePlayer = $("<object>", 
		id:      'strobeMediaPlayback',
		class:   'player-layer'
	).appendTo(el);

	this.layers.strobePlayer.html(
		"<p>( this player requires flash. check if it's enabled and make sure your browser supports flash )</p>"
	);
}


/**
 * Launches native player 
 *		runs on safari (osx/ios) / some android devices
 */
Player.prototype.launchNativePlayer = function( url ) {

	for( var i in this.layers ) {
		this.layers[i].hide();
	}
	this.layers.nativePlayer.show();
	this.layers.attr("src", url);
};


/**
 * Launches vlc plugin player
 *		doesnt run well on osx 
 */
Player.prototype.showLiveStream = function( url ) {
	
	for( var i in this.layers ) {
		this.layers[i].hide();
	}

	var html = '<embed type="application/x-vlc-plugin"' +
				'name="102"' +
				'autoplay="yes" width="640" height="480"' +
				'target="'+url+'" />';

	this.layers.livePlayer.html( html );
	this.layers.livePlayer.show();
};


/**
 * Launches strobe player
 *  
 */
Player.prototype.launchStrobePlayer = function( options ) {

	for( var i in this.layers ) {
		this.layers[i].hide();
	}

	this.layers.strobePlayer.show();

	options.url = encodeURIComponent( options.url );

	var parameters = {
		src:                         options.url,
		autoPlay:                    options.autoplay,
		verbose:                     true,
		controlBarAutoHide:          "true",
		controlBarPosition:          "bottom",
		poster:                      "",
		plugin_hls:                  "/swf/HLSDynamicPlugin.swf",
		javascriptCallbackFunction:  "window.onJavaScriptBridgeCreated"
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
			, "strobeMediaPlayback"
			, 640
			, 480
			, "10.0.0"
			, "/swf/expressInstall.swf"
			, parameters
			, {
				allowFullScreen: "true",
				wmode: wmodeValue
			}
			, {
				name: "strobeMediaPlayback"
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
				else 
					if (state == "playing") {
						player.pause();
					}
				return false;
			};
		}
	}
};


/**
 * Jumps to specified time  
 *	@param { time } Number
 *		elapsed time in seconds
 */
Player.prototype.jumpTo = function( time ) {
	
	var player = document.getElementById("strobeMediaPlayback");
	// var time   = parseInt( d.attr('data-totalTime') );

	if (player.canSeekTo(time) ) {
		console.log("seek to " + time);
		player.seek(time);
	}
};


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
Player.prototype.playVideo = function( stream, begin, end ) { 
	
	loadIndexer( begin, end, function() {
		launchTimeline( 50, begin, end);
	});
		
	// $("#file-list").html("<span class='subtle'>loading...</span>");

	timeline_begin = begin; 
	timeline_end   = end;

	// var stream = $("#stream-selector").val();

	var url = window.location.protocol + "//" + window.location.host + "/cameras/"+camId+"/video.m3u8?begin="+timeline_begin+"&end="+timeline_end+"&stream="+stream;

	if (!this.canPlayHLS()) {
		launchStrobePlayer({
			url:       url,
			autoplay:  true
		});
	} else {
		launchNativePlayer( url );
	}
};


/**
 * Checks if broser supports hls natively
 *
 */
Player.prototype.canPlayHLS = function() {
	return document.createElement('video').canPlayType('application/vnd.apple.mpegURL') === 'maybe';
};
