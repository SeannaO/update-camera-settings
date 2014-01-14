var mouseX = 0;
var mouseY = 0;
var current_number_of_streams = 0;
$(document).ready(function(){

	$(document).mousemove(function(e){

		mouseX = e.pageX;
		mouseY = e.pageY;

		if (mouseX < $(window).width()/2) { 
			$("#thumb").css('left', mouseX+'px');
		} else {
			$("#thumb").css('left', (mouseX-300)+'px');
		}
		if (mouseY < $(window).height()/2) {
			$("#thumb").css('top', (mouseY+15)+'px');
		} else {
			$("#thumb").css('top', (mouseY-250)+'px');
		}
	});

	$("#timelines").mouseleave( function() {
	});
});


var cameras = [];
var charts = [];

function basename(path) {
    return path.replace(/\\/g,'/').replace( /.*\//, '' );
}
 
function dirname(path) {
    return path.replace(/\\/g,'/').replace(/\/[^\/]*$/, '');
}

function removeTsExt(fileName) {
    fileName = basename( fileName );
    return fileName.replace('.ts', '');
}

var timelineSetup = function( cam_id, id, name ) {

    var label = name ? name : id;

    var timelineData = [];
    timelineData.push({label: label, times: []});

    var startTime = Date.now() - 1*60*60*1000; // 1hour from now

	var count = 0;

	if (id) {
		$("<div>", {
			id: "timeline-"+id,
			class: "timeline-container"
		}).appendTo("#camera-item-"+cam_id).mouseleave( function() {
			$("#thumb").fadeOut();
		});

	}
	
	timelines[id] = new Timeline("#timeline-"+id);

    $.getJSON( "/cameras/" + cam_id + "/streams/" + id + "/list_videos?start="+startTime+"&end="+Date.now(), function( data ) {

        var videos = data.videos;

		for (var i = 0; i < videos.length; i++) {
			if ( videos[i].file && videos[i].start && videos[i].end) {
				timelineData[0].times.push({ thumb: "/cameras/" + cam_id + "/streams/" + id + "/thumb/" + removeTsExt(videos[i].file), starting_time: (parseInt(videos[i].start)-1000), ending_time: (parseInt(videos[i].end) + 1000)}); 
				var start = videos[i].start;

				updateTimelines({
					cam: cam_id,
                    stream: id,
					start: videos[i].start,
					end: videos[i].end
				});
			} 
		}
		
		count++;
	});
               
};


var showThumb = function( thumb ) {
    
	var currentThumb = $("#thumb img").attr('src');

	if (mouseX < $(window).width()/2) { 
		$("#thumb").css('left', mouseX+'px');
	} else {
		$("#thumb").css('left', (mouseX-300)+'px');
	}
	if (mouseY < $(window).height()/2) {
		$("#thumb").css('top', (mouseY+15)+'px');
	} else {
		$("#thumb").css('top', (mouseY-250)+'px');
	}
	$("#thumb").fadeIn();
	if (currentThumb !== thumb) {
		$("#thumb img").attr('src', thumb);
	} else {
	}
};


var list = function() {
            
    $.getJSON( "/cameras.json", function( data ) {

        $("#camera-list").html("listing cameras...");

        if (data.length > 0) {
            $("#camera-list").html("");
        }
        else {
            $("#camera-list").html("<div id='no-cameras'>no cameras have been added<br></div>");
        }

        for (var i = 0; i < data.length; i++) {
            if (data[i]) {
                cameras.push( data[i] );
                addCameraItem(data[i]);
                for (var j in data[i].streams) {
                    timelineSetup(data[i]._id, data[i].streams[j].id, data[i].streams[j].name);
                }
            }
        }
    });
    
};


var addCameraItem = function( camera ) {

	var cameraItem = $("<div>", {
		id: "camera-item-" + camera._id,
		class: "camera-item"
	}).prependTo("#camera-list");

	var schedule_status_class = camera.schedule_enabled ? "green" : "red";

	var menuHtml = "<a href = \"javascript:editCamera('" + camera._id + "')\">[ edit ]</a> | " +
                "<a class=\"schedule\" href = \"javascript:cameraSchedule('" + camera._id + "')\">[<span class=\"status " + schedule_status_class + "\"></span>schedule ]</a> | ";
	if (camera.manufacturer !== 'undefined' && camera.manufacturer !== 'unknown'){
		menuHtml += "<a class=\"motion\" href = \"javascript:cameraMotion('" + camera._id + "')\">[<span class=\"status gray\"></span> motion ]</a> | ";	
	}
	menuHtml += "<a href = \"javascript:deleteCamera('" + camera._id + "')\">[ remove ]</a>";
   
	$("<div>", {
		class: "camera-item-menu",
		html: menuHtml
	}).appendTo(cameraItem);

	$("<div>", {
		class: "camera-item-name",
		html: '<a href = "/cameras/'+camera._id+'/">' + (camera.name || (camera.ip + " | " + camera.manufacturer)) + '</a>'
	}).appendTo("#camera-item-"+camera._id);

        $("<div>", {
        class: "camera-item-status",
        html:  camera.status
    }).appendTo("#camera-item-"+camera._id);

	// switchHtml = '' +
	// 	'<input type="checkbox" id="switch-'+camera._id+'" name="switch-'+camera._id+'" class="switch" value="1"/>' +
	// 	'<label for="switch-'+camera._id+'">off/on</label>';

	// $("<div>", {
	// 	class: "camera-item-switch",
	// 	html: switchHtml
	// }).appendTo("#camera-item-"+camera._id);

	$("<div>", {
		id: "thumb-" + camera._id,
		class: "thumb-container"
	}).appendTo("#camera-item-"+camera._id);
           
	console.log( camera );

	// if (camera.enabled == "1") {
	// 	$("#switch-"+camera._id).attr('checked', true);
	// } else {
	// 	$("#switch-"+camera._id).attr('checked', false);
	// }

	// $("#switch-"+camera._id).change( function() {

	// 	if ( $("#switch-"+camera._id).is(':checked') ) {
	// 		startRecording(camera._id);
	// 	} else {
	// 		stopRecording(camera._id);
	// 	}
	// });

	
	for (var s in camera.streams) {

		var thumb = camera.streams[s].latestThumb;
		var streamId = camera.streams[s].id;
		
		if (thumb) {
			var thumbUrl = '/cameras/' + camera._id + '/streams/' + streamId + '/thumb/' + thumb;
			
			var img = new Image();

			$(img).attr({
				src: thumbUrl,
				width: "100%",
				height: "100%"
			}).load(function(){
				$("#thumb-"+camera._id).html( $(this) );
			}).error(function(){
				console.log("unable to load image")
			});	
			
			break;
		}
	}
	if (camera.manufacturer !== 'undefined' && camera.manufacturer !== 'unknown'){
		$.ajax({
			type: "GET",
			url: "/cameras/" + camera._id + "/motion.json",
			contentType: 'application/json',
			success: function(data) {
				var new_status = "gray";
				switch(data.camera.motion.enabled)
				{
					case true:
						new_status = "green";
						break;
					case false:
						new_status = "red";
						break;
					default:
						new_status = "gray";
				}
				$("#camera-item-" + camera._id + " .motion .status").removeClass("gray green red").addClass(new_status);
			},
			error: function( data ) {
				console.log(data);
			}
		});
	}
	$('#no-cameras').remove();

};

var addCamera = function(camera, cb) {
        
    if (!camera.id) {
        camera.id = 'id_'+Math.random(100);
    }

    $.ajax({
        type: "POST",
        url: "/cameras/new",
        data: JSON.stringify( camera ),
        contentType: 'application/json',
        success: function(data) {
            cb( data );
        },
		error: function( data ) {
			console.log(data);
			cb( null );
		}
    });
};


var deleteCamera = function(id) {

    $.ajax({
        type: "DELETE",
        url: "/cameras/" + id,
        contentType: 'application/json',
        success: function(data) {
            if (data.success) {
                $("#camera-item-"+data._id).fadeOut();
            } else {
                alert("error: " + data.error);
            }
        },
		error: function( data ) {
			console.log(data);
		}
    });    
};

var getCameraOptions = function(cb) {
	var username = $("#camera-username").val() || '';
	var password = $("#camera-password").val() || '';
	var manufacturer = $("#camera-manufacturer").val() || '';
	var ip = $("#camera-ip").val() || '';
	//if (username && password && username !== '' && password !== ''){
	$.ajax({
		type: "GET",
		cache:false,
		url: "/camera_options.json",
		data: {camera:{username:username, password:password, manufacturer:manufacturer, ip:ip}},
		contentType: 'application/json',
		success: function(data) {
			cb( data );
		},
		error: function( data ) {
			console.log(data);
			cb( null );
		}

	});
};


var updateCamera = function(id, cb) {
    
    var params = $('#camera-form').serializeObject();

	console.log(params);

    $.ajax({
        type: "PUT",
        url: "/cameras/" + id,
        data: JSON.stringify( params.camera ),
        contentType: 'application/json',
        success: function(data) {
            cb( data );
        }
    });
};

var timeStringToHourAndMinutes = function(str){
	arr = str.split(":");
	return {hour: parseInt(arr[0]), minutes: parseInt(arr[1])};
};

var updateSchedule = function(id, cb) {

    var params = $('#camera-schedule').serializeObject();
    for (i in params.schedule){
    	if (params.schedule[i].open === params.schedule[i].close){
    		params.schedule[i].open = null;
    		params.schedule[i].close = null;
    	}else if (params.schedule[i].open === "0:00" && params.schedule[i].close === "23:59"){
			params.schedule[i].open = false;
			params.schedule[i].close = false;    		
    	}else{
    		params.schedule[i].open = timeStringToHourAndMinutes(params.schedule[i].open);
    		params.schedule[i].close = timeStringToHourAndMinutes(params.schedule[i].close);    		
    	}
    }
	console.log( params );
    $.ajax({
        type: "PUT",
        url: "/cameras/" + id + "/schedule",
        data: JSON.stringify( params ),
        contentType: 'application/json',
        success: function(data) {
            cb( data );
        }
    });
};

var updateMotion = function(id, cb) {

    var params = $('#camera-motion').serializeObject();
	console.log( params );
    $.ajax({
        type: "PUT",
        url: "/cameras/" + id + "/motion",
        data: JSON.stringify( params ),
        contentType: 'application/json',
        success: function(data) {
            cb( data );
        }
    });
};


var editCamera = function(camId) {

    $("#update-camera").show();
    $("#add-new-camera").hide();
	$("#stream-tabs").html("");
	$("#stream-panes").html("");
    $.ajax({
        type: "GET",
        url: "/cameras/" + camId + "/json",
        contentType: 'application/json',
        success: function(data) {
            console.log(data.camera);
            if (data.success) {

				current_camera = data.camera;
				$('#add-new-camera-dialog .modal-title').html("edit camera");
                $("#add-new-camera-dialog #camera-name").val(data.camera.name);
                $("#add-new-camera-dialog #camera-ip").val(data.camera.ip).prop('disabled', 'disabled');;
                $("#add-new-camera-dialog #camera-manufacturer").val(data.camera.manufacturer).attr("selected", data.camera.manufacturer).prop('disabled', 'disabled').unbind();
                $("#add-new-camera-dialog #camera-username").val(data.camera.username || '');
                $("#add-new-camera-dialog #camera-password").val(data.camera.password || '');
                

				current_number_of_streams = 0;
				for (var i in data.camera.streams) {
					var stream = data.camera.streams[i];
					stream.camId = camId;
					addStream( stream );
				}
                
                $("#update-camera").unbind();
                $("#update-camera").click( function() {
                    updateCamera( camId, function(data) {
                        if (data.success) {
                            location.reload();
                        } else {
							console.log( data );
                        }
                    });
                });
                setConstraintsOnStreamFields(function(error){

                });

                $("#add-stream").unbind();
                $("#add-stream").click(function(){
                    // var streamsFieldsetContainer = $(this).siblings("#streams-fieldset-container");
                    addStream(function(){
						setConstraintsOnStreamFields(function(error){

						});
                    });
                });
                // - -

                $("#add-new-camera-dialog").modal('show');
            } else {
                
            }
        }
    });    
};


var setConstraintsOnStreamFields = function(cb){

	getCameraOptions(function(data){
		if (data && data.resolutions && $.isArray(data.resolutions) && data.resolutions.length > 0){
			// credentials are correct
			//get the supported parameters of the camera
			$('.camera-stream-resolution-select').each(function(){
				var self = $(this);
				var current_val = self.val() || self.attr('data-resolution');
				self.html('');
				for (idx in data.resolutions){
					self.append($('<option>', {
				    	value: data.resolutions[idx].value,
				    	text: data.resolutions[idx].name
					}));
				}
				self.val(current_val);
			});

			if (data.framerate_range){
				$(".camera-stream-framerate-input").attr({
					min: data.framerate_range.min,
					max: data.framerate_range.max
				});
			}
			if (data.quality_range){
				$(".camera-stream-quality-input").attr({
					min: data.quality_range.min,
					max: data.quality_range.max
				});
			}
			cb(null);
		}else{
			cb("unauthorized");
		}
	});
};

var meridian = function(hour){
	return (Math.round(hour / 12) > 0) ? " PM" : " AM";
};


var to12HourTime = function(hours){
	return ( (hours + 11) % 12 + 1 );
};


scanForCameras = function() {
            
    $("#scan-spinner").show();
    $.ajax({
        type: "GET",
        url: "/scan.json",
        contentType: 'application/json',
        success: function(data) {
            var ip_addresses = $.map(cameras, function(n,i){
               return [ n.ip ];
            });
            for (var idx in data) {
                if ($.inArray(data[idx].ip, ip_addresses) === -1){
                    addCamera( data[idx], function(result) {
                        if (result && result._id){
                            addCameraItem( result );
                            console.log(result);
                            for (var j in result.streams) {
                                timelineSetup(result._id, result.streams[j].id, result.streams[j].name);
                            }
                        }
                    });                                
                }
            }
            $("#scan-spinner").hide();
        }
    });    
    
};


var generateScheduleTable = function() {
	var days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

	var header = '<tr>';
	header += '<th></th>';
	for (var d in days) {
		var day = days[d];
		header += '<th>' + day + '</th>';
	}
	header += '</tr>';
	
	var startTime = '<tr>';
	startTime += '<td>Start Time</td>';
	
	for (var d in days) {
		var day = days[d];
		startTime += '<td>';
		startTime += '<div class="form-group">';
		startTime += '<div class="input-append bootstrap-timepicker">';
		startTime += '<input type="text" class="form-control input-small" id="schedule-'+day+'-open" name="schedule['+day+'][open]">';
		startTime += '</div>';
		startTime += '</div>';
		startTime += '</td>';
	}
	startTime += '</tr>';


	var endTime = '<tr>';
	endTime += '<td>End Time</td>';
	
	for (var d in days) {
		var day = days[d];
		endTime += '<td>';
		endTime += '<div class="form-group">';
		endTime += '<div class="input-append bootstrap-timepicker">';
		endTime += '<input type="text" class="form-control input-small" id="schedule-'+day+'-close" name="schedule['+day+'][close]">';
		endTime += '</div>';
		endTime += '</div>';
		endTime += '</td>';
	}
	endTime += '</tr>';

	var table = '<table class="table table-bordered">';
	table += header;
	table += startTime;
	table += endTime;
	table += '</table>';
	return table;
};


var addStreamFieldset = function( cb ) {
	
	var current_stream_id = current_number_of_streams;

	var fieldset = $('<fieldset>', {
		class: 'recording-profile-fields'
	});

	//
	// hidden id field
	var camera_stream_id = $('<input>', {
		type: 'hidden',
		id: 'camera-streams-' + current_stream_id + '-id',
		name: 'camera[streams][' + current_stream_id + '][id]'
	});
    // end of hidden id field
	//
	var manufacturer = $("#camera-manufacturer").val();

	//
	// name field
	var camera_stream_name_group = $('<div>', {
		class: 'form-group',
		html: '<label for="camera-stream-name">name</label>'
	});

	var camera_stream_name = $('<input>', {
		type: 'string',
		class: 'form-control',
		id: 'camera-streams-' + current_stream_id + '-name',
		name: 'camera[streams][' + current_stream_id + '][name]'
	});
	
	camera_stream_name_group.append( camera_stream_name );

		//
	// retention field
	var camera_stream_retention_group = $('<div>', {
		class: 'form-group  col-xs-4',
		html: '<label for="camera-stream-retention">retention period</label>'
	});

	var camera_stream_retention = $('<input>', {
		type: 'number',
		min: 1,
		class: 'form-control camera-streams-retention',
		id: 'camera-streams-' + current_stream_id + '-retention',
		name: 'camera[streams][' + current_stream_id + '][retention]'
	});
	camera_stream_retention_unit = $("<span class='retention-unit'>days</span>");
	camera_stream_container = $("<div>").append(camera_stream_retention_unit).append(camera_stream_retention);
	camera_stream_retention_group.append( camera_stream_container );
	// end of retention field
	//

	if (manufacturer == 'unknown'){

		var ip = $("#camera-ip").val();
		var username = $("#camera-username").val();
		var password = $("#camera-password").val();
		var rtsp_uri = '';
		if (username.length > 0){
			rtsp_uri = "rtsp://" + username + ":" + password + "@" + ip + "/";
		}else{
			rtsp_uri = "rtsp://" + ip + "/";			
		}
		var camera_stream_rtsp_group = $('<div>', {
			class: 'form-group',
			html: '<label for="camera-stream-rtsp">rtsp Stream</label>'
		});
		
		var camera_stream_rtsp = $('<input>', {
			type: 'text',
			class: 'form-control',
			id: 'camera-streams-' + current_stream_id + '-url',
			name: 'camera[streams][' + current_stream_id + '][url]',
			value: rtsp_uri
		});	
		camera_stream_rtsp_group.append( camera_stream_rtsp );

		fieldset.append( camera_stream_id );
		fieldset.append( camera_stream_name_group );		
		fieldset.append( camera_stream_rtsp_group );
		fieldset.append( camera_stream_retention_group );
	}else{

		// end of name field
		//
		
		//
		// resolution field
		var camera_stream_resolution_group = $('<div>', {
			class: 'form-group col-xs-3',
			html: '<label for="camera-stream-resolution">resolution</label>'
		});

		var camera_stream_resolution = $('<select>', {
			class: 'form-control camera-stream-resolution-select',
			id: 'camera-streams-' + current_stream_id + '-resolution',
			name: 'camera[streams][' + current_stream_id + '][resolution]'
		});
		
		camera_stream_resolution_group.append( camera_stream_resolution );
		// end of resolution field
		//
		
		//
		// framerate field
		var camera_stream_framerate_group = $('<div>', {
			class: 'form-group  col-xs-2',
			html: '<label for="camera-stream-framerate">framerate</label>'
		});

		var camera_stream_framerate = $('<input>', {
			type: 'number',
			min: 1,
			max: 30,
			class: 'form-control camera-stream-framerate-input',
			id: 'camera-streams-' + current_stream_id + '-framerate',
			name: 'camera[streams][' + current_stream_id + '][framerate]'
		});
		
		camera_stream_framerate_group.append( camera_stream_framerate );
		// end of framerate field
		//

		//
		// quality field
		var camera_stream_quality_group = $('<div>', {
			class: 'form-group  col-xs-2',
			html: '<label for="camera-stream-quality">quality</label>'
		});

		var camera_stream_quality = $('<input>', {
			type: 'number',
			min: 1,
			max: 30,
			class: 'form-control camera-stream-quality-input',
			id: 'camera-streams-' + current_stream_id + '-quality',
			name: 'camera[streams][' + current_stream_id + '][quality]'
		});
		
		camera_stream_quality_group.append( camera_stream_quality );
		// end of quality field
		//
		
		fieldset.append( camera_stream_id );
		// fieldset.append( camera_stream_rtsp_group );
		fieldset.append( camera_stream_name_group );
		fieldset.append( camera_stream_resolution_group );
		fieldset.append( camera_stream_framerate_group );
		fieldset.append( camera_stream_quality_group );
		fieldset.append( camera_stream_retention_group );
	}

	var check_stream_button = $('<button>', {
		id: 'check-stream-button-'+current_stream_id,
		class: 'btn btn-info btn-sm check-stream',
		html: 'check stream'
	});

    current_number_of_streams++;

    cb( fieldset, current_stream_id);
};


var addStream = function( stream, cb) {

	addStreamFieldset( function(fieldset, current_stream_id) {
		var idx = current_number_of_streams-1;

        $('div.active').removeClass('active').removeClass('in');
        $('li.active').removeClass('active');
		var stream_name = 'new stream';
        if (stream && stream.name){
			stream_name = stream.name;
        }

		var new_stream_tab_id = 'new-stream-' + current_stream_id;
		$('#stream-tabs').append('<li><a href="#' + new_stream_tab_id + '" data-toggle="tab">' + stream_name + '</a></li>');
		$('#stream-panes').append('<div class="tab-pane" id="' + new_stream_tab_id + '"></div>');
		$('#'+new_stream_tab_id).append(fieldset);
		$('#stream-tabs a:last').tab('show');

		var check_stream_button = $('<button>', {
			id: 'check-stream-button-'+current_stream_id,
			class: 'btn btn-info btn-sm check-stream',
			html: 'check stream'
		});		

		var remove_stream_button = $('<button>', {
			id: 'remove-stream-button-'+new_stream_tab_id,
			class: 'btn btn-danger btn-sm remove-stream',
			html: 'remove stream'
		});
		
		var spinner = $('<div class="spinner" id="check-stream-spinner-'+current_stream_id+'">' +
				'<div class="bounce1"></div>' +
				'<div class="bounce2"></div>' +
				'<div class="bounce3"></div>' +
				'</div>');

		spinner.hide();

		var check_stream_status = $('<div>',{
			id: 'check-stream-status-' + current_stream_id,
			class: 'check-stream-status'
		});        

		$('#'+new_stream_tab_id).append(check_stream_button);  		
		$('#'+new_stream_tab_id).append(remove_stream_button); 
		$('#'+new_stream_tab_id).append(spinner);
		$('#'+new_stream_tab_id).append(check_stream_status);  

		check_stream_button.click( function( e ) {
			e.preventDefault();
			checkH264( current_stream_id );
		});

		remove_stream_button.click( function( e ) {
			e.preventDefault();
			removeStream( stream );
		});
		
		for (var attr in stream) {
			$("#add-new-camera-dialog #camera-streams-" + idx + "-" + attr).val( stream[attr] );
			$("#add-new-camera-dialog #camera-streams-" + idx + "-" + attr).attr( 'data-'+attr, stream[attr] );
		}
		if (typeof cb === 'function' ){
			cb();
		}
	});
};


var removeStream = function( stream ) {
	
	console.log( "remove stream: " + stream.id + " from camera: " + stream.camId );

	if ( confirm("are you sure you want to remove this stream?") ) {
		// console.log("remove!"); 
		$.ajax({
			type: 'DELETE',
			url: '/cameras/' + stream.camId + '/streams/' + stream.id,
			success: function(data) {
				if (data.error) {
					alert(data.error);
					location.reload();
				} else {
					location.reload();
				}
			}
		});

	} else {
	}
};

var checkH264 = function( new_stream_id ) {

	var button = $('#check-stream-button-'+new_stream_id);
	var spinner = $('#check-stream-spinner-'+new_stream_id);
	var stream_status = $('#check-stream-status-'+new_stream_id);

	console.log(new_stream_id);
	console.log(stream_status);

	stream_status.html("");

	spinner.show();

	button.attr('disabled', 'disabled');
	button.html('checking stream...');
	var manufacturer = $("#camera-manufacturer").val();
	
	var params = {}
	if (manufacturer == 'unknown'){
		params['url'] = $('#camera-streams-' + new_stream_id + '-url').val();
	}else{
		var camera = {};
		var stream = {};
		camera['username'] = $('#camera-username').val();
		camera['password'] = $('#camera-password').val();
		camera['ip'] = $('#camera-ip').val();
		camera['manufacturer'] = manufacturer;

		stream['resolution'] = $('#camera-streams-' + new_stream_id + '-resolution').val();
		stream['framerate'] = $('#camera-streams-' + new_stream_id + '-framerate').val();
		stream['quality'] = $('#camera-streams-' + new_stream_id + '-framerate').val();
		params['camera'] = camera;
		params['stream'] = stream;
	}

	$.ajax({
		type: "POST",
		url: '/check_h264.json',
		data: params,
		success: function( data ) {
			button.removeAttr('disabled');
			button.html('check stream');
			
			if (data.h264) {
				stream_status.removeClass('stream-error');
				stream_status.addClass('stream-ok');
				stream_status.html("this stream is h264");
			} else {
				stream_status.removeClass('stream-ok')
				stream_status.addClass('stream-error');
				stream_status.html("invalid h264 stream");
			}

			spinner.fadeOut( function() {
				stream_status.fadeIn();
			});
		},
		error: function( data ) {
			button.removeAttr('disabled');			
		}
	});
};


var cameraSchedule = function(camId) {

    $.ajax({
        type: "GET",
        url: "/cameras/" + camId + "/schedule.json",
        contentType: 'application/json',
        success: function(data) {
            console.log(data);
            if (data.success) {
                $('#camera-schedule-enable').prop('checked', data.schedule_enabled == "1").change( function() {

                    if ( $(this).is(':checked') ) {
                        $('#camera-schedule-dialog .form-control').prop('disabled', false);
                    } else {
                        $('#camera-schedule-dialog .form-control').prop('disabled', true);
                    }
                });

				var days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
				
				for (var d in days) {
					var day = days[d];
					if (data.schedule[d].close === false){
 						$('#schedule-'+day+'-open').timepicker('setTime',   "0:00");
						$('#schedule-'+day+'-close').timepicker('setTime',  "23:59");
					}else if (data.schedule[d].close || data.schedule[d].open){
						$('#schedule-'+day+'-open').timepicker('setTime',   data.schedule[d].open.hour + ":" + data.schedule[d].open.minutes);
						$('#schedule-'+day+'-close').timepicker('setTime',  data.schedule[d].close.hour   + ":" + data.schedule[d].close.minutes);						
					}else{
 						$('#schedule-'+day+'-open').timepicker('setTime',   "0:00");
						$('#schedule-'+day+'-close').timepicker('setTime',  "0:00");
					}
				}

                if (data.schedule_enabled){
                    $('#camera-schedule-dialog .form-control').prop('disabled', false);
                }else{
                	$('#camera-schedule-dialog .form-control').prop('disabled', true);
                }


                $("#update-schedule").unbind();
                $("#update-schedule").click( function() {
                    updateSchedule( camId, function(data) {
                        if (data.success) {
                            location.reload();
                        } else {
                            alert(data.error);
                        }
                    });
                });
                $("#camera-schedule-dialog").modal('show');
            } else {
                
            }
        },
		error: function( data ) {
			console.log(data);
		}
    });
};


var cameraMotion = function(camId) {

    $.ajax({
        type: "GET",
        url: "/cameras/" + camId + "/motion.json",
        contentType: 'application/json',
        success: function(data) {
            console.log(data);
            if (data.success && data.camera.motion) {
                $('#camera-motion-enable').prop('checked', data.camera.motion.enabled == "1").change( function() {

                    if ( $(this).is(':checked') ) {
                        $('#camera-motion-dialog .form-control').prop('disabled', false);
                    } else {
                        $('#camera-motion-dialog .form-control').prop('disabled', true);
                    }
                });
                $('#camera-motion-threshold').val(data.camera.motion.threshold);
                $('#camera-motion-sensitivity').val(data.camera.motion.sensitivity);

                $("#update-motion").unbind();
                $("#update-motion").click( function() {
                    updateMotion( camId, function(data) {
                        if (data.success) {
                            location.reload();
                        } else {
                            alert(data.error);
                        }
                    });
                });
                $("#camera-motion-dialog").modal('show');
            } else {
                
            }
        },
		error: function( data ) {
			console.log(data);
		}
    });
};

