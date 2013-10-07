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

        console.log(data);

        for (var i = 0; i < data.length; i++) {
            addCameraItem(data[i]);
        }
        
        $("#camera-list table").append("</tbody></table>");
    });
    
}


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
            $("#list").append("<span class = 'item'>"+data[i].ip+"</span>")
            console.log(data[i]);
        }
    });
}


var addCameraItem = function( camera ) {
    console.log(camera);
    console.log(camera.name);

    var row = "<tr id = '" + camera._id + "'>";
        row += "<td>";
        row += "<a href = \"javascript:deleteCamera('" + camera._id + "')\">[ - ]</a>";
        row += " || <a href = \"javascript:editCamera('" + camera._id + "')\">[ edit ]</a>";
        row += "</td>";
        row += "<td>"+camera.name+"</td>";
        row += "<td>"+camera.ip+"</td>";
        row += "<td>"+camera.rtsp+"</td>";
        row += "<td> ? </td>";
        row += "</tr>";
        $("#camera-list table tbody").append(row);
}

var addCamera = function(camera, cb) {
        
    $.ajax({
        type: "POST",
        url: "/cameras/new",
        data: JSON.stringify( camera ),
        contentType: 'application/json',
        success: function(data) {
            cb( data );
        }
    });
}


var deleteCamera = function(id) {

    $.ajax({
        type: "DELETE",
        url: "/cameras/" + id,
        contentType: 'application/json',
        success: function(data) {
            if (data.success) {
                $("#"+data._id).fadeOut();
            } else {
                alert("error: " + data.error);
            }
        }
    });    
}


var editCamera = function(camId) {

    $.ajax({
        type: "GET",
        url: "/cameras/" + camId,
        contentType: 'application/json',
        success: function(data) {
            console.log(data);
            if (data.success) {
                $("#add-new-camera-dialog #camera-name").val(data.camera.name);
                $("#add-new-camera-dialog #camera-ip").val(data.camera.ip);
                $("#add-new-camera-dialog #rtsp-stream").val(data.camera.rtsp);                

                $("#add-new-camera-dialog").modal('show');
            } else {
                
            }
        }
    });    
}
