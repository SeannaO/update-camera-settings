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
            $("#camera-list").html("no cameras have been added<br>");
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

	var menuHtml = "" +
				"<a href = \"javascript:editCamera('" + camera._id + "')\">[ edit ]</a> | " +
                "<a href = \"javascript:cameraSchedule('" + camera._id + "')\">[ schedule ]</a> | " +
                "<a href = \"javascript:cameraMotion('" + camera._id + "')\">[ motion ]</a> | " +
				"<a href = \"javascript:deleteCamera('" + camera._id + "')\">[ remove ]</a>";
   
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
        html: '<div class="camera-item-rtsp">' + camera.status + '</div>'
    }).appendTo("#camera-item-"+camera._id);

	switchHtml = '' +
		'<input type="checkbox" id="switch-'+camera._id+'" name="switch-'+camera._id+'" class="switch" value="1"/>' +
		'<label for="switch-'+camera._id+'">off/on</label>';

	$("<div>", {
		class: "camera-item-switch",
		html: switchHtml
	}).appendTo("#camera-item-"+camera._id);

	$("<div>", {
		id: "thumb-" + camera._id,
		class: "thumb-container"
	}).appendTo("#camera-item-"+camera._id);
           
	console.log( camera );

	if (camera.enabled == "1") {
		$("#switch-"+camera._id).attr('checked', true);
	} else {
		$("#switch-"+camera._id).attr('checked', false);
	}

	$("#switch-"+camera._id).change( function() {

		if ( $("#switch-"+camera._id).is(':checked') ) {
			startRecording(camera._id);
		} else {
			stopRecording(camera._id);
		}
	});
};


var startRecording = function(camId) {

    $.ajax({
        url: "/cameras/"+camId+"/start_recording",
        success: function(data) {
            if (data.error || data.success === false) {
                $("#switch-"+camId).attr('checked', false);
            } else {
                $("#switch-"+camId).attr('checked', true);
            }
        }, 
        error: function() {
            $("#switch-"+camId).attr('checked', false);
        }
    
	});
};


var stopRecording = function(camId) {
    $.ajax({
        url: "/cameras/"+camId+"/stop_recording",
        success: function(data) {
            if (data.error || data.success === false) {
                console.log(  $("#switch-"+camId).is(':checked') );
                $("#switch-"+camId).attr('checked', true);
            } else {
                $("#switch-"+camId).attr('checked', false);
            }
        }, 
        error: function() {
            $("#switch-"+camId).attr('checked', true);
        }
    });
};


var addCamera = function(camera, cb) {
        
    if (!camera.id) {
        camera.id = 'id_'+Math.random(100);
    }

    $.ajax({
        type: "POST",
        url: "cameras/new",
        data: JSON.stringify( camera ),
        contentType: 'application/json',
        success: function(data) {
            cb( data );
        }
    });
};


var deleteCamera = function(id) {

    $.ajax({
        type: "DELETE",
        url: "cameras/" + id,
        contentType: 'application/json',
        success: function(data) {
            if (data.success) {
                $("#camera-item-"+data._id).fadeOut();
            } else {
                alert("error: " + data.error);
            }
        }
    });    
};

var getCameraOptions = function(id, cb) {

	var username = $("#camera-username").val();
	var password = $("#camera-password").val();
	if (username && password && username !== '' && password !== ''){
	    $.ajax({
	        type: "GET",
	        url: "/cameras/" + id + "/configuration",
	        data: {camera:{username:username, password:password}},
	        contentType: 'application/json',
	        success: function(data) {
	            cb( data );
	        }
	    });
	}else{
		cb(null);
	}
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

var updateSchedule = function(id, cb) {

    var params = $('#camera-schedule').serializeObject();
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
                $("#add-new-camera-dialog #camera-name").val(data.camera.name);
                $("#add-new-camera-dialog #camera-ip").val(data.camera.ip);
                $("#add-new-camera-dialog #camera-manufacturer").attr("selected", data.camera.manufacturer);
                $("#add-new-camera-dialog #camera-username").val(data.camera.username);
                $("#add-new-camera-dialog #camera-password").val(data.camera.password);
                $("#add-new-camera-dialog #camera-manufacturer").val(data.camera.manufacturer);
                
				if ( data.camera.streams ){

					current_number_of_streams = 0;
                    
					for (var i in data.camera.streams) {
						var stream = data.camera.streams[i];
						addStream( stream );
					}
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
                setConstraintsOnStreamFields(camId);
				$("#camera-username, #camera-password").unbind();
                $("#camera-username, #camera-password").blur(function(){
                    setConstraintsOnStreamFields(camId)
                });

                $("#add-stream").unbind();
                $("#add-stream").click(function(){
                    var streamsFieldsetContainer = $(this).siblings("#streams-fieldset-container");
                    addStreamFieldset(function(fieldset) {
                        
                        $('div.active').removeClass('active').removeClass('in');
                        $('li.active').removeClass('active');

                        var new_stream_tab_id = 'new-stream-' + current_number_of_streams;
                        $('#stream-tabs').append('<li><a href="#' + new_stream_tab_id + '" data-toggle="tab">new stream</a></li>');
                        $('#stream-panes').append('<div class="tab-pane" id="' + new_stream_tab_id + '"></div>');
                        $('#'+new_stream_tab_id).append(fieldset);
                        $('#stream-tabs a:last').tab('show');
                        setConstraintsOnStreamFields(camId);
                    });
                });
                // - -

                $("#add-new-camera-dialog").modal('show');
            } else {
                
            }
        }
    });    
};


var setConstraintsOnStreamFields = function(camId){
	getCameraOptions(camId,function(data){
		if (data){
			//get the supported parameters of the camera
			if (data && data.resolutions && data.framerate_range && data.quality_range){
				$(".camera-stream-framerate-input").attr({
					min: data.framerate_range.min,
					max: data.framerate_range.max
				});
				$(".camera-stream-quality-input").attr({
					min: data.quality_range.min,
					max: data.quality_range.max
				});

				$('.camera-stream-resolution-select').each(function(){
					var $self = $(this);
					var current_val = $self.val();
					$self.html('');
					for (idx in data.resolutions){
						$self.append($('<option>', {
					    	value: data.resolutions[idx].value,
					    	text: data.resolutions[idx].name
						}));
					}
					$self.val(current_val);
				});
			}
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
                        if (result._id){
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
	
	var fieldset = $('<fieldset>', {
		class: 'recording-profile-fields'
	});

	//
	// hidden id field
	var camera_stream_id = $('<input>', {
		type: 'hidden',
		id: 'camera-streams-' + current_number_of_streams + '-id',
		name: 'camera[streams][' + current_number_of_streams + '][id]'
	});
    // end of hidden id field
	//

	//
	// ** temporary, development only **
	// 
	var camera_stream_rtsp_group = $('<div>', {
		class: 'form-group',
		html: '<label for="camera-stream-rtsp">rtsp (temporary, dev only)</label>'
	});
	
	var camera_stream_rtsp = $('<input>', {
		type: 'text',
		disabled: 'disabled',
		class: 'form-control',
		id: 'camera-streams-' + current_number_of_streams + '-url',
		name: 'camera[streams][' + current_number_of_streams + '][rtsp]'
	});	
	camera_stream_rtsp_group.append( camera_stream_rtsp );
	//
	//
	
	//
	// name field
	var camera_stream_name_group = $('<div>', {
		class: 'form-group',
		html: '<label for="camera-stream-name">name</label>'
	});

	var camera_stream_name = $('<input>', {
		type: 'string',
		class: 'form-control',
		id: 'camera-streams-' + current_number_of_streams + '-name',
		name: 'camera[streams][' + current_number_of_streams + '][name]'
	});
	
	camera_stream_name_group.append( camera_stream_name );
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
		id: 'camera-streams-' + current_number_of_streams + '-resolution',
		name: 'camera[streams][' + current_number_of_streams + '][resolution]'
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
		id: 'camera-streams-' + current_number_of_streams + '-framerate',
		name: 'camera[streams][' + current_number_of_streams + '][framerate]'
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
		id: 'camera-streams-' + current_number_of_streams + '-quality',
		name: 'camera[streams][' + current_number_of_streams + '][quality]'
	});
	
	camera_stream_quality_group.append( camera_stream_quality );
	// end of quality field
	//

	//
	// retention field
	var camera_stream_retention_group = $('<div>', {
		class: 'form-group  col-xs-4',
		html: '<label for="camera-stream-retention">retention period</label>'
	});

	var camera_stream_retention = $('<input>', {
		type: 'number',
		min: 1,
		class: 'form-control',
		id: 'camera-streams-' + current_number_of_streams + '-retention',
		name: 'camera[streams][' + current_number_of_streams + '][retention]'
	});
	
	camera_stream_retention_group.append( camera_stream_retention );
	// end of retention field
	//
	
	fieldset.append( camera_stream_id );
	fieldset.append( camera_stream_rtsp_group );
	fieldset.append( camera_stream_name_group );
	fieldset.append( camera_stream_resolution_group );
	fieldset.append( camera_stream_framerate_group );
	fieldset.append( camera_stream_quality_group );
	fieldset.append( camera_stream_retention_group );

    fieldset.find("#remove-stream-" + current_number_of_streams).click(function(){
        $(this).parent().remove();
    });
	
    current_number_of_streams++;

    cb( fieldset, current_number_of_streams);
};


var addStream = function( stream ) {

	addStreamFieldset( function(fieldset, current_number_of_streams) {
		var idx = current_number_of_streams-1;
		console.log("idx: " + idx);

		var stream_name = stream.name || 'new stream';

		var new_stream_tab_id = 'new-stream-' + current_number_of_streams;
		$('#stream-tabs').append('<li><a href="#' + new_stream_tab_id + '" data-toggle="tab">' + stream_name + '</a></li>');
		$('#stream-panes').append('<div class="tab-pane" id="' + new_stream_tab_id + '"></div>');
		$('#'+new_stream_tab_id).append(fieldset);
		$('#stream-tabs a:last').tab('show');
		
		var check_stream_button = $('<button>', {
			id: 'check-stream-button-'+new_stream_tab_id,
			class: 'btn btn-info btn-sm check-stream',
			html: 'check stream'
		});

		var spinner = $('<div class="spinner" id="check-stream-spinner-'+new_stream_tab_id+'">' +
						'<div class="bounce1"></div>' +
						'<div class="bounce2"></div>' +
						'<div class="bounce3"></div>' +
						'</div>');

		spinner.hide();

		var check_stream_status = $('<div>',{
			id: 'check-stream-status-'+new_stream_tab_id,
			class: 'check-stream-status'
		});	

		//check_stream_status.hide();

		$('#'+new_stream_tab_id).append(check_stream_button);			
		$('#'+new_stream_tab_id).append(spinner);
		$('#'+new_stream_tab_id).append(check_stream_status);	
		
		check_stream_button.click( function( e ) {
			e.preventDefault();
			checkH264( stream.url, new_stream_tab_id );
		});

		for (var attr in stream) {
			$("#add-new-camera-dialog #camera-streams-" + idx + "-" + attr).val( stream[attr] );
		}
	});
};


var checkH264 = function( url, new_stream_tab_id ) {

	var button = $('#check-stream-button-'+new_stream_tab_id);
	var spinner = $('#check-stream-spinner-'+new_stream_tab_id);
	var stream_status = $('#check-stream-status-'+new_stream_tab_id);

	spinner.show();

	button.attr('disabled', 'disabled');
	button.html('checking stream...');

	$.ajax({
		type: "POST",
		url: '/check_h264.json',
		data: {
			url: url
		},
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
 					$('#schedule-'+day+'-open').timepicker('setTime',   to12HourTime(data.schedule[d].open.hour) + ":" + data.schedule[d].open.minutes + meridian(data.schedule[0].open.hour));
					$('#schedule-'+day+'-close').timepicker('setTime',   to12HourTime(data.schedule[d].close.hour)   + ":" + data.schedule[d].close.minutes + meridian(data.schedule[0].close.hour));
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
        }
    });
};

