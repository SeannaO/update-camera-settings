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
		}).appendTo("#timelines").mouseleave( function() {
			$("#thumb").fadeOut();
		});
		$("<div>", {
			id: "thumb-" + id,
			class: "thumb-container"
		}).appendTo("#timeline-"+id);
	}
	
	timelines[id] = new Timeline("#timeline-"+id);

    $.getJSON( "/cameras/" + id + "/list_videos?start="+startTime+"&end="+Date.now(), function( data ) {

        var videos = data.videos;

		for (var i = 0; i < videos.length; i++) {
			if ( videos[i].file && videos[i].start && videos[i].end) {
				timelineData[0].times.push({ thumb: "/cameras/" + id + "/thumb/" + removeTsExt(videos[i].file), starting_time: (parseInt(videos[i].start)-1000), ending_time: (parseInt(videos[i].end) + 1000)}); 
				var start = videos[i].start;
				/*
				timeline.append({
					start:	videos[i].start,
					w: videos[i].end - videos[i].start,
					thumb: "/cameras/"+id+"/thumb/"+videos[i].start,
					mouseover: function(d) {
						showThumb( d.attr("data-thumb") );
						console.log(Date.now());					
					}
				});
				*/
				updateTimelines({
					cam: id,
					start: videos[i].start,
					end: videos[i].end
				});
			} 
		}
		
        charts[count] = d3.timeline().width(800).rotateTicks(90).showToday().stack(true).tickFormat({
            format: d3.time.format("%H:%M"), 
            tickTime: d3.time.minute, 
            tickNumber: 1, 
            tickSize: 5 
        }).hover(function (d, i, datum) { 
            showThumb(d.thumb);
        });
		
        //var svg = d3.select("#timeline-"+id).append("svg").attr("width", 800).datum(timelineData).call(charts[count]);         
		console.log("#timeline-"+id);
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
            $("#camera-list").html("<table class='table table-hover'>");

            $("#camera-list table").append("<thead>");
            $("#camera-list table thead").append("<th></th>");
            $("#camera-list table thead").append("<th> name </th>");
            $("#camera-list table thead").append("<th> ip </th>");
            $("#camera-list table thead").append("<th> rtsp url </th>");
            $("#camera-list table thead").append("<th> status </th>");

            $("#camera-list table").append("<tbody>");
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
        
        $("#camera-list table").append("</tbody></table>");
    });
    
};


var scan = function() {
    
    $.getJSON( "/scan", function( data ) {

        $("#list").html("");

        if (data.length > 0) {
            $("#list").append("<b> found ONVIF cameras on the following ips: </b><br><br>");
        }
        else {
            $("#list").html("<b>no ONVIF cameras found</b><br>");
        }

        for (var i = 0; i < data.length; i++) {
            console.log("item");
            $("#list").append("<span class = 'item'>"+data[i].ip+"</span>");
            console.log(data[i]);
        }
    });
};


var addCameraItem = function( camera ) {
    console.log(camera);
    console.log(camera.name);

    var row = "<tr id = '" + camera._id + "'>";
        row += "<td>";
        row += "<a href = \"javascript:deleteCamera('" + camera._id + "')\">[ - ]</a>";
        row += " || <a href = \"javascript:editCamera('" + camera._id + "')\">[ edit ]</a>";
        row += "</td>";
        row += "<td><a href='/cameras/" + camera._id + "'>"+ camera.name+"</a></td>";
        row += "<td>"+camera.ip+"</td>";
        row += "<td>"+camera.rtsp+"</td>";
        row += "<td>";
        row += "<div>";
        row += '<input type="checkbox" id="switch-'+camera._id+'" name="switch-'+camera._id+'" class="switch" />';
        row += '<label for="switch-'+camera._id+'">on/off</label>';
        row += '</div>';        
        row += "</td>";
        row += "</tr>";
        $("#camera-list table tbody").append(row);
            

        if (camera.status === 0) {
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
                $("#"+data._id).fadeOut();
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

