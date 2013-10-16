var cameras = [];

var list = function() {
            
    $.getJSON( "lifeline/cameras.json", function( data ) {

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

        console.log(data);

        for (var i = 0; i < data.length; i++) {
            cameras.push( data[i] );
            addCameraItem(data[i]);
        }
        
        $("#camera-list table").append("</tbody></table>");
    });  
};


var addCameraItem = function( camera ) {
    console.log(camera);
    console.log(camera.name);

    var row = "<tr id = '" + camera.id + "'>";
        row += "<td>";
        row += "<a href = \"javascript:deleteCamera('" + camera.id + "')\">[ - ]</a>";
        row += " || <a href = \"javascript:editCamera('" + camera.id + "')\">[ edit ]</a>";
        row += "</td>";
        row += "<td>"+camera.name+"</td>";
        row += "<td>"+camera.ip+"</td>";
        row += "<td>"+camera.rtsp+"</td>";
        row += "<td>";
        row += "<div>";
        row += '<input type="checkbox" id="switch-'+camera.id+'" name="switch-'+camera.id+'" class="switch" />';
        row += '<label for="switch-'+camera.id+'">on/off</label>';
        row += '</div>';        
        row += "</td>";
        row += "</tr>";
        $("#camera-list table tbody").append(row);
            

        if (camera.status === 0) {
             $("#switch-"+camera.id).attr('checked', true);
        } else {
             $("#switch-"+camera.id).attr('checked', false);
        }

        $("#switch-"+camera.id).change( function() {
            
            if ( $("#switch-"+camera.id).is(':checked') ) {
                startRecording(camera.id);
            } else {
                stopRecording(camera.id);
            }
        });
};


var startRecording = function(camId) {

    $.ajax({
        type: "POST",
        url: "lifeline/cameras/" + camId + "/start_recording",
        contentType: 'application/json',
        success: function(data) {
            //cb( data );
        },
        error: function() {
            $("#switch-"+camId).attr('checked', false);
        }
    });
};


var stopRecording = function(camId) {

    $.ajax({
        type: "POST",
        url: "lifeline/cameras/" + camId + "/stop_recording",
        contentType: 'application/json',
        success: function(data) {
            //cb( data );
        },
        error: function() {
            $("#switch-"+camId).attr('checked', true);
        }
    });
};


var addCamera = function(camera, cb) {

    $.ajax({
        type: "POST",
        url: "lifeline/cameras",
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
        url: "lifeline/cameras/" + id,
        contentType: 'application/json',
        success: function(data) {
            if (data.success) {
                $("#"+data.id).fadeOut();
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
        url: "lifeline/cameras/" + id,
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
        url: "lifeline/cameras/" + camId,
        contentType: 'application/json',
        success: function(data) {
            console.log(data);
            if (data.success) {
                $("#add-new-camera-dialog #camera-name").val(data.camera.name);
                $("#add-new-camera-dialog #camera-ip").val(data.camera.ip);
                $("#add-new-camera-dialog #rtsp-stream").val(data.camera.rtsp);                
                $("#add-new-camera-dialog #camera-id").val(data.camera.id);                

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
