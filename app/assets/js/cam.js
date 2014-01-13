var getStreamsInfo = function(camId) {

	console.log('get streams');

	$.ajax({
		url: '/cameras/' + camId + '/json',
		success: function(data) {
			console.log(data.camera);
			if (!data.camera.streams) {
				return;
			} else {
				populateStreamSelector( data.camera.streams );	
			}
		},
		error: function(err) {
			console.log( err );
		}
	});
};


var populateStreamSelector = function(streams) {
	
	
	for (var s in streams) {
		var text = ( streams[s].name || '' ) + ' - ' + streams[s].resolution;
		$('#stream-selector')
          .append($('<option>', { value: streams[s].id })
          .text( text ));		
	}
};

var getRtsp = function( options ) {
	return('#stream-selector').val();	
};

var showImage = function(url) {

	var imageHtml = "<a href = '"+url+"'><img src='"+url+"' width='640' height='480'/></a>";
	$("#snapshot").html(imageHtml);
};

var getSnapshot = function(time) {

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
			console.log("error");
			$("#snapshot").html("<h5 class = 'text-muted lead'>there was an error: " + err + "</h5>");
		}
	});
};


var launchNativePlayer = function( url ) {

	$("#snapshot").hide();
	$("#nativePlayer").show();
	$("#nativePlayer").attr("src", url);
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
			, "10.1.0"
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
