var streams = [];

var getStreamsInfo = function(camId) {

	$.ajax({
		url: '/cameras/' + camId + '/json',
		success: function(data) {
			if (!data.camera.streams) {
				return;
			} else {
				streams = data.camera.streams;
				populateStreamSelector( data.camera.streams );	
				if (!data.camera.name) {
					$("#camera_name").html(data.camera.manufacturer);
				}
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
//		var text = ( streams[s].name || '' ) + ' - ' + streams[s].resolution;
		
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
	$("#StrobeMediaPlayback").show();

	options.url = encodeURIComponent( options.url );

	var parameters = {
		src: options.url,
		autoPlay: options.autoplay,
		verbose: true,
		controlBarAutoHide: "true",
		controlBarPosition: "bottom",
		poster: "",
		plugin_hls: "/swf/HLSDynamicPlugin.swf"
	};

	var wmodeValue = "direct";
	var wmodeOptions = ["direct", "opaque", "transparent", "window"];
	if (parameters.hasOwnProperty("wmode"))
	{
		if (wmodeOptions.indexOf(parameters.wmode) >= 0)
		{
			wmodeValue = parameters.wmode;
		}	            	
		delete parameters.wmode;
	}

	// Embed the player SWF:	            
	swfobject.embedSWF(
			"/swf/StrobeMediaPlayback.swf"
			, "StrobeMediaPlayback"
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
				name: "StrobeMediaPlayback"
			}
	);
};

var canPlayHLS = function() {
	return document.createElement('video').canPlayType('application/vnd.apple.mpegURL') === 'maybe';
};
