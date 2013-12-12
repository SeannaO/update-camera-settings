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

var timelineSetup = function( id, name ) {

    var label = name ? name : id;

    var timelineData = [];
    timelineData.push({label: label, times: []});

    var startTime = Date.now() - 1*60*60*1000; // 1hour from now

	var count = 0;

	if (id) {
		$("<div>", {
			id: "timeline-"+id,
			class: "timeline-container"
		}).appendTo("#camera-item-"+id).mouseleave( function() {
			$("#thumb").fadeOut();
		});
		$("<div>", {
			id: "thumb-" + id,
			class: "thumb-container"
		}).appendTo("#camera-item-"+id);
	}
	
	timelines[id] = new Timeline("#timeline-"+id);

    $.getJSON( "/cameras/" + id + "/list_videos?start="+startTime+"&end="+Date.now(), function( data ) {

        var videos = data.videos;

		for (var i = 0; i < videos.length; i++) {
			if ( videos[i].file && videos[i].start && videos[i].end) {
				timelineData[0].times.push({ thumb: "/cameras/" + id + "/thumb/" + removeTsExt(videos[i].file), starting_time: (parseInt(videos[i].start)-1000), ending_time: (parseInt(videos[i].end) + 1000)}); 
				var start = videos[i].start;

				updateTimelines({
					cam: id,
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
                timelineSetup(data[i]._id, data[i].name);
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
		'<label for="switch-'+camera._id+'">on/off</label>';

	$("<div>", {
		class: "camera-item-switch",
		html: switchHtml
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


var updateCamera = function(id, cb) {
    
    var params = $('#camera-form').serializeObject();
    
    $.ajax({
        type: "PUT",
        url: "/cameras/" + id,
        data: JSON.stringify( params["camera"] ),
        contentType: 'application/json',
        success: function(data) {
            cb( data );
        }
    });
};

var updateSchedule = function(id, cb) {

    var params = $('#camera-schedule').serializeObject();
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


var editCamera = function(camId) {

    $("#update-camera").show();
    $("#add-new-camera").hide();

    $.ajax({
        type: "GET",
        url: "/cameras/" + camId + "/json",
        contentType: 'application/json',
        success: function(data) {
            console.log(data);
            if (data.success) {
                $("#add-new-camera-dialog #camera-name").val(data.camera.name);
                $("#add-new-camera-dialog #camera-ip").val(data.camera.ip);
                $("#add-new-camera-dialog #camera-manufacturer").val(data.camera.manufacturer);
                $("#add-new-camera-dialog #camera-username").val(data.camera.username);
                $("#add-new-camera-dialog #camera-password").val(data.camera.password);
                if (typeof data.camera.streams !== 'undefined'){
                    var $streamsFieldsetContainer = $("#streams-fieldset-container");
                    $("#streams-fieldset-container").html("");
                    current_number_of_streams = 0;
                    for (var i = 0; i < data.camera.streams.length; i++)
                    addStreamFieldSet(function(fieldset){
                        $streamsFieldsetContainer.append(fieldset);
                    });
                    for (var idx in data.camera.streams){
                        $("#add-new-camera-dialog #camera-streams-" + idx + "-resolution").val(data.camera.streams[idx].resolution);
                        $("#add-new-camera-dialog #camera-streams-" + idx + "-framerate").val(data.camera.streams[idx].framerate);
                        $("#add-new-camera-dialog #camera-streams-" + idx + "-quality").val(data.camera.streams[idx].quality);
                        $("#add-new-camera-dialog #camera-streams-" + idx + "-retention-period").val(data.camera.streams[idx].retention_period);                    
                    }
                }
                

                $("#update-camera").unbind();
                $("#update-camera").click( function() {
                    updateCamera( camId, function(data) {
                        //console.log(data);
                        if (data.success) {
                            location.reload();
                        } else {
                            alert(data.error);
                        }
                    });
                });
                
                $("#add-new-camera-dialog").modal('show');
            } else {
                
            }
        }
    });    
};

var meridian = function(hour){
 return (Math.round(hour / 12) > 0) ? " PM" : " AM"
};
var to12HourTime = function(hours){
 return ((hours + 11) % 12 + 1)
};

scanForCameras = function() {
            
    $("#scan-status").html('scanning for cameras...');
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
                            timelineSetup(result._id, result.name);
                        }
                    });                                
                }
            }
        }
    });    
    
};


var addStreamFieldSet = function(cb) {
    var $fieldset = $("<fieldset class=\"recording-profile-fields\">" +
                    "<div class=\"form-group\">" +
                        "<label for=\"camera-stream-resolution\">resolution</label>" +
                        "<select class=\"form-control\" id=\"camera-streams-" + current_number_of_streams + "-resolution\" name=\"camera[streams][" + current_number_of_streams +"][resolution]\">" +
                            "<option value=\"half\">Half</option>" +
                            "<option value=\"full\">Full</option>" +
                        "</select>" +
                    "</div>" +
                    "<div class=\"form-group\">" +
                        "<label for=\"camera-stream-framerate\">framerate</label>" +
                        "<input type=\"number\" min=\"1\" max=\"30\" class=\"form-control\" id=\"camera-streams-" + current_number_of_streams + "-framerate\" name=\"camera[streams][" + current_number_of_streams + "][framerate]\">" +
                    "</div>" +
                    "<div class=\"form-group\">" +
                        "<label for=\"camera-stream-quality\">quality</label>" +
                        "<input type=\"number\" min=\"16\" max=\"36\" class=\"form-control\" id=\"camera-streams-" + current_number_of_streams + "-quality\" name=\"camera[streams][" + current_number_of_streams + "][quality]\">" +
                    "</div>" +
                    "<div class=\"form-group\">" +
                        "<label for=\"camera-stream-retention-period\">Retention Period (days)</label>" +
                        "<input type=\"number\" min=\"1\" value=\"90\" class=\"form-control\" id=\"camera-streams-" + current_number_of_streams + "-retention-period\" name=\"camera[streams][" + current_number_of_streams + "][retention_period]\">" +
                    "</div>" +
                    "<button type=\"button\" class=\"btn btn-default\" id=\"remove-stream-" + current_number_of_streams + "\">Remove</button>" +
                "</fieldset>");
    $fieldset.find("#remove-stream-" + current_number_of_streams).click(function(){
        $(this).parent().remove();
    });
    current_number_of_streams++;
    cb($fieldset);
};


var cameraSchedule = function(camId) {

    $.ajax({
        type: "GET",
        url: "/cameras/" + camId + "/schedule/json",
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
                $("#schedule-sunday-open").timepicker('setTime',   to12HourTime(data.schedule[0].open.hour)    + ":" + data.schedule[0].open.minutes + meridian(data.schedule[0].open.hour));
                $("#schedule-monday-open").timepicker('setTime',   to12HourTime(data.schedule[1].open.hour)    + ":" + data.schedule[1].open.minutes + meridian(data.schedule[1].open.hour));
                $("#schedule-tuesday-open").timepicker('setTime',  to12HourTime(data.schedule[2].open.hour)    + ":" + data.schedule[2].open.minutes + meridian(data.schedule[2].open.hour));
                $("#schedule-wednesday-open").timepicker('setTime',to12HourTime(data.schedule[3].open.hour)    + ":" + data.schedule[3].open.minutes + meridian(data.schedule[3].open.hour));
                $("#schedule-thursday-open").timepicker('setTime', to12HourTime(data.schedule[4].open.hour)    + ":" + data.schedule[4].open.minutes + meridian(data.schedule[4].open.hour));
                $("#schedule-friday-open").timepicker('setTime',   to12HourTime(data.schedule[5].open.hour)    + ":" + data.schedule[5].open.minutes + meridian(data.schedule[5].open.hour));
                $("#schedule-saturday-open").timepicker('setTime', to12HourTime(data.schedule[6].open.hour)    + ":" + data.schedule[6].open.minutes + meridian(data.schedule[6].open.hour));

                $("#schedule-sunday-close").timepicker('setTime',   to12HourTime(data.schedule[0].close.hour)   + ":" + data.schedule[0].close.minutes + meridian(data.schedule[0].close.hour));
                $("#schedule-monday-close").timepicker('setTime',   to12HourTime(data.schedule[1].close.hour)   + ":" + data.schedule[1].close.minutes + meridian(data.schedule[1].close.hour));
                $("#schedule-tuesday-close").timepicker('setTime',  to12HourTime(data.schedule[2].close.hour)   + ":" + data.schedule[2].close.minutes + meridian(data.schedule[2].close.hour));
                $("#schedule-wednesday-close").timepicker('setTime',to12HourTime(data.schedule[3].close.hour)  + ":" + data.schedule[3].close.minutes + meridian(data.schedule[3].close.hour));
                $("#schedule-thursday-close").timepicker('setTime', to12HourTime(data.schedule[4].close.hour)   + ":" + data.schedule[4].close.minutes + meridian(data.schedule[4].close.hour));
                $("#schedule-friday-close").timepicker('setTime',   to12HourTime(data.schedule[5].close.hour)   + ":" + data.schedule[5].close.minutes + meridian(data.schedule[5].close.hour));
                $("#schedule-saturday-close").timepicker('setTime', to12HourTime(data.schedule[6].close.hour)   + ":" + data.schedule[6].close.minutes + meridian(data.schedule[6].close.hour));
                if (data.schedule_enabled == "0"){
                    $('#camera-schedule-dialog .form-control').prop('disabled', true);
                }else{
                    $('#camera-schedule-dialog .form-control').prop('disabled', false);
                }


                $("#update-schedule").unbind();
                $("#update-schedule").click( function() {
                    updateSchedule( camId, function(data) {
                    //console.log(data);
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

