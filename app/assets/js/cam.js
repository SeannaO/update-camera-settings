var mouseX;
var mouseY;

var lastThumbRequest = Date.now();
var camera_data;
var streams = [];
var timeline;

var timeline_begin;
var timeline_end;

var indexer = new Indexer();

$(document).ready(function(){

	$(document).mousemove(function(e){

		mouseX = e.pageX;
		mouseY = e.pageY;

		if (mouseX < $(window).width()/2) { 
			$("#thumb").css('left', (mouseX+10)+'px');
		} else {
			$("#thumb").css('left', (mouseX-170)+'px');
		}
		if (mouseY < $(window).height()/2) {
			$("#thumb").css('top', (mouseY+10)+'px');
		} else {
			$("#thumb").css('top', (mouseY-130)+'px');
		}
	});

	$("#timeline").mouseleave( function() {
	});
});


var getStreamsInfo = function(camId, cb) {

	$.ajax({
		url: '/cameras/' + camId + '/json',
		success: function(data) {
			if (!data.camera.streams) {
				if (cb) cb("no streams");
				return;
			} else {
				camera_data = data.camera;
				streams = data.camera.streams;
				populateStreamSelector( data.camera.streams );	
				if (!data.camera.name) {
					$("#camera_name").html(data.camera.manufacturer);
				}
				if (cb) cb();
			}
		},
		error: function(err) {
			console.log( err );
		}
	});
};


var populateStreamSelector = function(streams) {
	
	
	for (var s in streams) {

		var text = '';

		if ( streams[s].name ) {
			text = text + streams[s].name + ' - ';
		} if ( streams[s].resolution ) {
			text = text + streams[s].resolution;
		} else {
			text = text + ' ' + streams[s].url;
		}
		
		$('#stream-selector')
          .append($('<option>', { value: streams[s].id })
          .text( text ));		
	}
};


var getRtsp = function( options ) {
	
	var streamId = $("#stream-selector").val();

	for (var s in streams) {
		if (streams[s].id === streamId) {
			return streams[s];
		} 
	}

	return '';
};


var showImage = function(url) {

	var imageHtml = "<a href = '"+url+"'><img src='"+url+"' width='640' height='480'/></a>";
	$("#snapshot").html(imageHtml);
};


var getSnapshot = function(time) {

	$("#live-player").hide();		
	$("#nativePlayer").hide();
	$("#StrobeMediaPlayback").hide();

	$("#snapshot").html("<h5 class = 'text-muted lead video-box-message'> loading... </h5>").show();

	$.ajax({
		url: "/cameras/"+camId+"/snapshot?time="+time,
		success: function(data, status, xhr) {
			var ct = xhr.getResponseHeader("content-type") || "";
			if (ct.indexOf('image') > -1) {                        
				showImage( "/cameras/"+camId+"/snapshot?time="+time );
			}
			else {
				$("#snapshot").html("<h5 class = 'text-muted lead video-box-message'>" + data + "</h5>"); 
			}
		}, 
		error: function(err) {
			$("#snapshot").html("<h5 class = 'text-muted lead'>there was an error: " + err + "</h5>");
		}
	});
};


var launchNativePlayer = function( url ) {

	$("#live-player").hide();	
	$("#snapshot").hide();
	$("#nativePlayer").show();
	$("#nativePlayer").attr("src", url);
};


var showLiveStream = function() {
	
	$("#snapshot").hide();
	$("#nativePlayer").hide();
	
	var url = getRtsp().url;
/*
	var html = '<object type="application/x-vlc-plugin" data="' + url + '" width="640" height="480" id="video1">';
	html += '<param name="movie" value="'+ url +'"/>';
	html += '<embed type="application/x-vlc-plugin" name="video1"';
	html += 'autoplay="no" loop="no" width="640" height="480"';
	html += 'target="'+ url +'" /> </object>';
*/

	var html = '<embed type="application/x-vlc-plugin"' +
				'name="102"' +
				'autoplay="yes" width="640" height="480"' +
				'target="'+url+'" />';

	$("#live-player").html( html );
	$("#live-player").show();
};


var launchStrobePlayer = function( options ) {

	$("#snapshot").hide();
	$("#strobeMediaPlayback").show();

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
			, "10.1.0"
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

	window.onCurrentTimeChange = function (time, playerId) {
		var timelineWidth = $("#timeline").width();	
	    var totalTime = 24*60*60;
		var absolute_time = indexer.getAbsoluteTime( time );
		var dt = ( absolute_time - timeline.begin )/1000; 
		var pos = dt * (1.0 * timelineWidth) / totalTime - 2;
		$("#marker").css("left", pos);
	}
			
	window.onDurationChange = function (time, playerId) {
	}

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

var canPlayHLS = function() {
	return document.createElement('video').canPlayType('application/vnd.apple.mpegURL') === 'maybe';
};

////
//
var updateThumb = function(data) {
};


var updateTime = function( time ) {

	var t       = new Date(time);
	var hours   = t.getHours();
	var minutes = t.getMinutes();
	var seconds = t.getSeconds();

	if ( parseInt(seconds) < 10) seconds = '0' + seconds;
	if ( parseInt(minutes) < 10) minutes = '0' + minutes;

	var formattedTime = hours + ':' + minutes + ':' + seconds;
	$('#thumb-time').html(formattedTime);
};


var updateTimelines = function( data, options ) {

	if (!timeline) {
		console.log("ERROR: no such timeline");
		console.log(data);
		return;
	}

	var thumb = "/cameras/" + data.cam + "/streams/" + data.stream + "/thumb/" + data.thumb;

	var img = new Image();
		
	var showThumbWrapper = function(d) { 
		showThumb(d.attr("data-thumb"));
		updateTime( parseInt(d.attr('data-start')) );
	};

	timeline.append({
		start:       data.start,
		w:           data.end - data.start,
		thumb:       thumb,
		totalTime:   data.totalTime,
		mouseover:   showThumbWrapper,
		mouseclick:  jumpTo
	});
}


var jumpTo = function(d) {
	
	var player = document.getElementById("strobeMediaPlayback");
	var time   = parseInt( d.attr('data-totalTime') );
// 	var dt        = time - timeline_begin;
// 	var totalTime = 30*60*1000;
//
// 	var time = dt/1000;
	console.log( d.attr('data-start') );
	console.log( new Date( parseInt( d.attr('data-start') )));
	console.log("seek to " + time);

	if (player.canSeekTo(time) ) {
		console.log("seek to " + time);
		player.seek(time);
	}
}


var showThumb = function( thumb ) {
   
	var currentThumb = $("#thumb img").attr('src');

	$("#thumb").show();

	var dt = Date.now() - lastThumbRequest;
	
	if (currentThumb !== thumb && dt > 100) {
		lastThumbRequest = Date.now();
		$("#thumb img").attr('src', thumb);
	} else {
	}
}


var timelineSetup = function( cam_id, id, name ) {

    var label = name ? name : id;

	if (id) {
		var timelineContainer = $("<div>", {
			id:     "timeline-" + id,
			class:  "timeline-container"
		});
		var timelineName = $("<span>", {
			id:     "timeline-name-" + id,
			class:  "timeline-name",
			html:   "", //name
		})

		timelineContainer.append(timelineName);
		timelineContainer.appendTo("#timeline").mouseleave( function() {
			$("#thumb").hide();
		});
	}
	
	timeline = new Timeline("#timeline-"+id, { 
		static:    true,
		seekable:  true,
		timeSpan:  24*60*60*1000
	});
}


var list = function() {

	if ( camera_data ) {

		for (var j in camera_data.streams) {
			var text = '';
			if ( camera_data.streams[j].name ) {
				text = camera_data.streams[j].name;
			}else if ( camera_data.streams[j].resolution ) {
				text = camera_data.streams[j].resolution;
			} else {
				text = camera_data.streams[j].url;
			}

			timelineSetup(camera_data._id, camera_data.streams[j].id, text);
		}
	}
}


var loadIndexer = function( begin, end, cb ) {

	var id     = $("#stream-selector").val();
	var cam_id = camera_data._id;
	
	indexer.clear();

    $.getJSON( "/cameras/" + cam_id + "/streams/" + id + "/list_videos?start="+begin+"&end=" + end, function( data ) {

        var videos = data.videos;
	
		for (var i = 0; i < videos.length; i++) {
			
			var start = videos[i].start;
			var end   = videos[i].end;

			indexer.push( videos[i] );	
		}
		if(cb) cb();
	});
}


var launchTimeline = function(block_size, begin, end) {

	var id = $("#stream-selector").val();
	var cam_id = camera_data._id;

	block_size = block_size || 2;
	var elements = indexer.agglutinate(block_size);
	
	timeline.clear();
	timeline.setEnd( end );
	timeline.setBegin( begin );

	for( var i in elements ) {

		var start = elements[i].start;
		var end   = elements[i].end;
	
		updateTimelines({
			cam:        cam_id,
			stream:     id,
			start:      start,
			end:        end,
			totalTime:  elements[i].totalTime,
			thumb:      elements[i].thumb
		});
	}
}


var playVideo = function( begin, end ) { 
	
	loadIndexer( begin, end, function() {
		launchTimeline( 50, begin, end);
	});
		
	$("#file-list").html("<span class='subtle'>loading...</span>");

	timeline_begin = begin; 
	timeline_end   = end;

	var stream = $("#stream-selector").val();

	var url = window.location.origin + "/cameras/"+camId+"/video.m3u8?begin="+timeline_begin+"&end="+timeline_end+"&stream="+stream;

	if (!canPlayHLS()) {
		launchStrobePlayer({
			url:       url,
			autoplay:  true
		});
	} else {
		launchNativePlayer( url );
	}
}



