var mouseX = 0;
var mouseY = 0;

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
		html: '<a href = "/cameras/'+camera._id+'/">' + camera.name + '</a>'
	}).appendTo("#camera-item-"+camera._id);

	$("<div>", {
		class: "camera-item-rtsp",
		html: camera.rtsp
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

    var camera = {};

    camera.name = $("#camera-name").val();
    camera.ip = $("#camera-ip").val();
    camera.rtsp = $("#rtsp-stream").val();
    
    $.ajax({
        type: "PUT",
        url: "/cameras/" + id,
        data: JSON.stringify( camera ),
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
                $("#add-new-camera-dialog #rtsp-stream").val(data.camera.rtsp);             

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
                $("#schedule-sunday-open").timepicker('setTime',data.schedule[0].open.hour + ":" + data.schedule[0].open.minutes);
                $("#schedule-monday-open").timepicker('setTime',data.schedule[1].open.hour + ":" + data.schedule[1].open.minutes);
                $("#schedule-tuesday-open").timepicker('setTime',data.schedule[2].open.hour + ":" + data.schedule[2].open.minutes);
                $("#schedule-wednesday-open").timepicker('setTime',data.schedule[3].open.hour + ":" + data.schedule[3].open.minutes);
                $("#schedule-thursday-open").timepicker('setTime',data.schedule[4].open.hour + ":" + data.schedule[4].open.minutes);
                $("#schedule-friday-open").timepicker('setTime',data.schedule[5].open.hour + ":" + data.schedule[5].open.minutes);
                $("#schedule-saturday-open").timepicker('setTime',data.schedule[6].open.hour + ":" + data.schedule[6].open.minutes);

                $("#schedule-sunday-close").timepicker('setTime',data.schedule[0].close.hour + ":" + data.schedule[0].close.minutes);
                $("#schedule-monday-close").timepicker('setTime',data.schedule[1].close.hour + ":" + data.schedule[1].close.minutes);
                $("#schedule-tuesday-close").timepicker('setTime',data.schedule[2].close.hour + ":" + data.schedule[2].close.minutes);
                $("#schedule-wednesday-close").timepicker('setTime',data.schedule[3].close.hour + ":" + data.schedule[3].close.minutes);
                $("#schedule-thursday-close").timepicker('setTime',data.schedule[4].close.hour + ":" + data.schedule[4].close.minutes);
                $("#schedule-friday-close").timepicker('setTime',data.schedule[5].close.hour + ":" + data.schedule[5].close.minutes);
                $("#schedule-saturday-close").timepicker('setTime',data.schedule[6].close.hour + ":" + data.schedule[6].close.minutes);
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

