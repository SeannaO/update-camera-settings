var mouseX = 0;
var mouseY = 0;
var lastThumbRequest = Date.now();
var editCameraXHR;

var current_number_of_streams = 0;

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

    $("#timelines").mouseleave( function() {
    });

    $("#camera-subnet").keypress(function(e) {
        if(e.which == 13) {
            e.preventDefault();
            $("#start-camera-scanner").click();
        }
    });

    $('#camera-form').keypress(function(e) {
        if(e.which == 13) {
            e.preventDefault();
            return;
        }
    });

    // $("#camera-subnet").mask("9?99.9?99.9?99");
});


var cameras = {};
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

var timelineSetup = function( cam_id, id, name, cb ) {

    var label = name ? name : id;

    var timelineData = [];
    timelineData.push({label: label, times: []});

    var endTime = Date.now();
    var startTime = endTime - 1*60*60*1000; // 1hour from now

    // var count = 0;

    if (id) {
        var timelineContainer = $("<div>", {
            id: "timeline-"+id,
            class: "timeline-container"
        });
        var timelineName = $("<span>", {
            id: "timeline-name-"+id,
            class: "timeline-name",
            html: (name)
        });

        var cameraItemBps = $('<div>', {
            class: 'bps-info-group',
            id: 'bps-info-group ' + cam_id
        });

        var streamId = id;
        cameraItemBps.append('<div> <span id="'+streamId+'-bps-info">0</span> kb/s</div>');

        timelineContainer.append(timelineName);
        timelineContainer.append(cameraItemBps);
        timelineContainer.appendTo("#camera-item-"+cam_id).mouseleave( function() {
            $("#thumb").hide();
        });

    }


    timelines[id] = new Timeline("#timeline-"+id, { seekable: true });

    // events_timeline[id] = {};
    // events_timeline[id].motion = new Timeline("#motion-timeline-"+id);

    var timelineOverlay = $('<div>', {
        style:'position: absolute; z-index: 1000; top:0; left:0; width:100%; height:100%; background:rgba(250,250,250,0.8);margin:0; padding:6;color: rgba(100,100,100,0.5)',
        class:'timelineOverlay csspinner line back-and-forth no-overlay',
        html:'loading...'
    }).appendTo("#timeline-"+id);


    // request Motion Sensor Data
    // $.ajax({
    // 	type: "GET",
    // 	url: "/cameras/" + cam_id + "/sensors?start=" + startTime + "&end=" Date.now(),
    // 	contentType: 'application/json',
    // 	success: function(data) {
    // 		// Overlay the motion sensor data
    // 	},
    // 	error: function( data ) {
    // 		console.log(data);
    // 	}
    // });


    $.getJSON( "/cameras/" + cam_id + "/streams/" + id + "/list_videos?start="+startTime+"&end="+Date.now(), function( data ) {

        timelineOverlay.fadeOut();

        var videos = data.videos;

        for (var i = 0; i < videos.length; i++) {

            if ( videos[i].start && videos[i].end) {

                timelineData[0].times.push({ 
                    thumb: "/cameras/" + cam_id + "/streams/" + id + "/thumb/" + videos[i].start + '_' + (videos[i].end-videos[i].start), 
                    starting_time: (parseInt(videos[i].start)-1000), 
                    ending_time: (parseInt(videos[i].end) + 1000)
                }); 

                var start = videos[i].start;

                updateTimelines({
                    cam: cam_id,
                    stream: id,
                    start: videos[i].start,
                    end: videos[i].end
                });
            } 
        }

        // count++;

        if (cb) cb({
            cam_id: cam_id,
           stream_id: id,
           start: startTime,
           end: endTime
        });
    });

};


var loadMotionData = function( cam_id, start, end, cb ) {

    $.getJSON(	"/cameras/" + cam_id + 
            "/sensors?start=" + start + 
            "&end=" + end,
            function( data ) {
                if (cb) cb(data);
            }
            );

    //	development
    // $.getJSON( "/dev/motion?start=" + start + "&end=" + end,
    // 		function(data) {
    // 			if( cb ) cb(data);
    // 		});
};


var showThumb = function( thumb ) {

    var currentThumb = $("#thumb img").attr('src');

    $("#thumb").show();

    var dt = Date.now() - lastThumbRequest;

    if (currentThumb !== thumb && dt > 100) {
        lastThumbRequest = Date.now();
        $("#thumb img").attr('src', thumb);
    } else {
    }

};


var list = function() {

    $.ajax({ 
        cache: false,
        url: "/cameras.json", 
        dataType: "json",
        success: function( data ) {

            $("#camera-list").html("listing cameras...");

            if (data.length > 0) {
                $("#camera-list").html("");
            }
            else {
                $("#camera-list").html("<div id='no-cameras'>no cameras have been added<br></div>");
            }

    for (var i = 0; i < data.length; i++) {
        if (data[i]) {
            cameras[data[i]._id]= data[i];
            addCameraItem(data[i]);

            var streamsCounter = 0;
            var totalStreams = data[i].streams.length;

            for (var j in data[i].streams) {
                var text = '';
                if ( data[i].streams[j].name ) {
                    text = data[i].streams[j].name;
                }else if ( data[i].streams[j].resolution ) {
                    text = data[i].streams[j].resolution;
                } else {
                    text = data[i].streams[j].url;
                }

                (function(i) {
                    timelineSetup(data[i]._id, data[i].streams[j].id, text, function(timeline_data) {
                        streamsCounter++;
                        if (streamsCounter >= totalStreams) {
                            addMotionData( timeline_data.cam_id, timeline_data.start, timeline_data.end );
                        }
                        if (data[i].status === 'offline' || data[i].status === 'disconnected') {
                            var $camitem = $("#camera-item-"+data[i]._id);
                            $camitem.animate({
                                backgroundColor: "rgb(243, 255, 102)"
                            }, 1000);
                        }
                    });
                })(i);
            }
        }
    }
        }
    });

};


var addMotionData = function( cam_id, start, end ) {

    var cam = getCameraById( cam_id );

    loadMotionData( cam._id, start, end, function(motionData) {
        for (var s in cam.streams) {
            var id = cam.streams[s].id;
            for (var i in motionData.data) {
                var start = parseInt( motionData.data[i].t );
                var duration = 5000;
                timelines[id].paintRectByTime( start, duration, 'rgb(240,160,60)' );
            }
        }
    });
};


var updateCameraItem = function( camera, cb, reload ) {

    if (reload) {
        $.ajax({
            type: "GET",
            url: "/cameras/" + camera._id + "/json",
            contentType: 'application/json',
            success: function(data) {
                $('#camera-item-' + camera._id).remove();
                addCameraToUI( data.camera );
                if (cb) cb();
            }, 
            error: function() {
                if (cb) cb('error when loading camera');
            }
        });
    } else {
        $('#camera-item-' + camera._id).remove();
        addCameraToUI( camera );
        if (cb) cb();
    }
};


var addCameraItem = function( camera ) {

    // start loading the image as soon as we can
    var img = new Image();

    var cameraItemThumbContainer = $("<div>", {
        id: "thumb-" + camera._id,
        class: "thumb-container"
    });

    for (var s in camera.streams) {

        var thumb = camera.streams[s].latestThumb;
        var streamId = camera.streams[s].id;

        if (thumb) {
            var thumbUrl = '/cameras/' + camera._id + '/streams/' + streamId + '/thumb/' + thumb;

            $(img).attr({
                src: thumbUrl,
                width: "100%",
                height: "100%"
            }).load(function(){
                cameraItemThumbContainer.html( $(this) );
            }).error(function(){
                console.log("unable to load image")
            });	

            break;
        }
    }

    var cameraItem = $("<div>", {
        id:     "camera-item-" + camera._id,
        class:  "camera-item"
    });

    var cameraItemName = $("<h3>", {
        class:  "camera-item-name",
        html:   '<a id="camera-item-link-'+camera._id+'" class="camera-item-link" href = "/cameras/'+camera._id+'/">' + (camera.name || (camera.ip + " | " + camera.manufacturer)) + '</a>'
    });

    var cameraItemStatus = $("<span>", {
        class:  "camera-item-status",
        id:     'camera-item-status-' + camera._id,
        html:   camera.status
    });

    if (camera.motionParams) {
        motionStatus = camera.motionParams.enabled ? 'green' : 'red';
    } else {
        motionStatus = 'gray';
    }

    var schedule_status_class = camera.schedule_enabled ? "green" : "red";

    var menuHtml = "<a class=\"btn btn-xs btn-default edit\" href = \"javascript:editCamera('" + camera._id + "')\"><span class=\"glyphicon glyphicon-edit\"></span>edit</a>" +
        "<a class=\"btn btn-xs btn-default schedule\" href = \"javascript:cameraSchedule('" + camera._id + "')\"><span class=\"status " + schedule_status_class + "\"></span><span class=\"glyphicon glyphicon-calendar\"></span>schedule</a>";
    // if (camera.manufacturer !== 'undefined' && camera.manufacturer !== 'unknown'){
    menuHtml += "<a class=\"btn btn-xs btn-default motion\" href = \"javascript:cameraMotion('" + camera._id + "')\"><span id =\"motion-status-" + camera._id + "\" class=\"status " + motionStatus + "\"></span>motion</a>";	
    // }
    menuHtml += "<a class=\"btn btn-xs btn-default remove\" href=\"javascript:deleteCamera('" + camera._id + "')\"><span class=\"glyphicon glyphicon-remove\"></span>remove</a>";

    var cameraItemMenu = $("<div>", {
        class: "camera-item-menu btn-group",
        html: menuHtml
    });

    cameraItemName.append(cameraItemStatus);
    cameraItem.append(cameraItemName);
    cameraItem.append(cameraItemMenu);
    cameraItem.append(cameraItemThumbContainer);
    cameraItem.prependTo("#camera-list");

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


var addCameraToUI = function( data ) {

    addCameraItem(data);

    var streamsCounter = 0;
    var totalStreams = data.streams.length;

    for (var j in data.streams) {
        var text = '';
        if ( data.streams[j].name ) {
            text = data.streams[j].name;
        }else if ( data.streams[j].resolution ) {
            text = data.streams[j].resolution;
        } else {
            text = data.streams[j].url;
        }

        timelineSetup(data._id, data.streams[j].id, text, function(timeline_data) {
            streamsCounter++;
            if (streamsCounter >= totalStreams) {
                addMotionData( timeline_data.cam_id, timeline_data.start, timeline_data.end );
            }
        });
    }
};


var addCamera = function(camera, cb) {

    if (!camera.id) {
        camera.id = 'id_'+Math.random(100);
    }

    if (camera.streams) { camera.streams = _.without( camera.streams, null, undefined ); }
    if (camera.spotMonitorStreams) { camera.spotMonitorStreams = _.without( camera.spotMonitorStreams, null, undefined ); }

    $.ajax({
        type: "POST",
        url: "/cameras/new",
        data: JSON.stringify( camera ),
        contentType: 'application/json',
        success: function(data) {
            cb( data.camera );
        },
        error: function( err ) {
            toastr.error( err.responseJSON.error );
            cb( null );
        }
    });
};


var deleteCamera = function(id) {

    bootbox.confirm("are you sure you want to remove this camera?", function(ok) {
        if (ok) {
            addOverlayToPage('removing camera...');
            cameras[id].deletedOn = Date.now();
            $.ajax({
                type: "DELETE",
                url: "/cameras/" + id,
                contentType: 'application/json',
                success: function(data) {
                    if (cameras[id]) { delete cameras[id]; }

                    removeOverlayFromPage( function() {
                        toastr.success('Successfully removed camera');
                        $("#camera-item-"+data._id).fadeOut();
                    });
                },
                error: function( data ) {
                    removeOverlayFromPage( function() {
                        toastr.error( data.responseJSON.error );
                    });
                    console.log(data);
                }
            });
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
        cache: false,
        url: "/camera_options.json",
        data: {camera:{username:username, password:password, manufacturer:manufacturer, ip:ip}},
        contentType: 'application/json',
        timeout: 30000,
        success: function(data) {
            if (data && data.resolutions && $.isArray(data.resolutions) && data.resolutions.length > 0){
                cb( data );
            } else{
                cb( null );
            }
        },
        error: function( data, t ) {
            if (t === 'timeout') {
                toastr.error('camera is timing out');
            } else if (data.error) {
                // toastr.error('there was an error when requesting configuration the camera');
                // console.log(data);
            }
            cb( null );
        }

    });
};

var updateCamera = function(id, cb) {

    var params = $('#camera-form').serializeObject();

    // Check if the camera previously had any streams
    var current_camera = cameras[id];
    var manufacturer = params.camera.manufacturer || $("#camera-manufacturer").val();
    var enable_motion = false;
    if (
            (typeof current_camera.streams == 'undefined' || current_camera.streams.length == 0) && 
            params.camera && params.camera.streams && params.camera.streams.length > 0 && 
            typeof manufacturer !== 'undefined' && manufacturer !== 'unknown'
       ){
           enable_motion = true;
       }

    if (params.camera.spotMonitorStreams) { params.camera.spotMonitorStreams = _.without( params.camera.spotMonitorStreams, null, undefined ); }
    if (params.camera.streams) { params.camera.streams = _.without( params.camera.streams, null, undefined ); }

    cameras[id].updatedOn = Date.now();

    // if it had zero streams and it is adding new streams then we should send a request afterwards to enable motion

    $.ajax({
        type: "PUT",
        url: "/cameras/" + id,
        data: JSON.stringify( params.camera ),
        contentType: 'application/json',
        success: function(data) {

            params.camera._id = id;
            cb( data, params.camera );

            if (enable_motion){
                enableMotion(id,function(){

                });
            }
        },
        error: function(err) {
            toastr.error(err.responseJSON.error);	
            cb( {error: err} );
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


var setAuthStatus = function(data, cb){
    var $auth_status = $("#camera-auth-status span");
    if (data) {
        if ($auth_status.hasClass('glyphicon-remove-circle') || !$auth_status.hasClass('glyphicon-ok-circle')){
            $("#camera-auth-status span").addClass("glyphicon-ok-circle").removeClass("glyphicon-remove-circle");    
        }

        if ($('#stream-panes').children().length === 0){
            addStream(function(){
                cb();
            });
        }else{
            cb();
        }
        // credentials are correct and can connect to camera
    }else{
        if ($auth_status.hasClass('glyphicon-remove-ok') || !$auth_status.hasClass('glyphicon-remove-circle')){
            $("#camera-auth-status span").addClass("glyphicon-remove-circle").removeClass("glyphicon-ok-circle");    
        }
    }
};

var validateIp = function() {
    var ip = $("#camera-ip").val();
    var re = /\b(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/;
    if (!re.exec(ip)) {
        $('#ip-error').fadeIn();
    } else {
        $('#ip-error').hide();
    }
}

var editCamera = function(camId) {
    if (editCameraXHR) {
        editCameraXHR.abort();
    }
    $("#update-camera").show();
    $("#add-new-camera").hide();
    $("#stream-tabs").html("");
    $("#stream-panes").html("");
    $("#camera-auth-status span").removeClass("glyphicon-remove-circle glyphicon-ok-circle");
    editCameraXHR = $.ajax({
        type: "GET",
        url: "/cameras/" + camId + "/json",
        contentType: 'application/json',
        success: function(data) {
            if (data.success) {
                current_camera = data.camera;
                $('#add-new-camera-dialog .modal-title').html("edit <span class='device-type-name'>camera</span>");
                $("#add-new-camera-dialog #camera-name").val(data.camera.name);
                $("#add-new-camera-dialog #camera-ip").val(data.camera.ip); //.prop('disabled', 'disabled');;
                $("#add-new-camera-dialog #camera-manufacturer").val(data.camera.manufacturer).attr("selected", data.camera.manufacturer).prop('disabled', 'disabled');
                $("#add-new-camera-dialog #camera-username").val(data.camera.username || '');
                $("#add-new-camera-dialog #camera-password").val(data.camera.password || '');

                validateIp();

                current_number_of_streams = 0;
                if (data.camera.streams.length > 0){
                    for (var i in data.camera.streams) {
                        var stream = data.camera.streams[i];
                        stream.camId = camId;
                        addStream( stream, function(id) {
                            addStreamFieldOverlay( '#' + id );
                        });
                    }
                } else if (
                    !data.camera.spotMonitorStreams || 
                    !data.camera.spotMonitorStreams.length
                ) {
                    addStream(function(id) {
                        addStreamFieldOverlay( '#' + id );
                    });
                }

                for (var i in data.camera.spotMonitorStreams) {
                    var stream = data.camera.spotMonitorStreams[i];
                    stream.camId = camId;
                    addStream( stream, { type: 'spot-monitor' }, function(id) {
                        addStreamFieldOverlay( '#' + id );
                    });
                }

                $("#update-camera").unbind();
                $("#update-camera").click( function() {

                    addOverlayToPage('updating camera configurations...');

                    updateCamera( camId, function(data, camera) {
                        if (data && data.success) {
                            updateCameraItem( camera, function(err) {
                                if (!err) {
                                    removeOverlayFromPage();
                                    toastr.success('Camera configurations successfully updated.')
                                } else {
                                    location.reload();
                                }
                            }, true);
                        } else {
                            removeOverlayFromPage( function() {
                                console.log( data.err );
                            });
                        }
                    });
                });

                var manufacturer = $("#camera-manufacturer").val();
                if (manufacturer && manufacturer != 'unknown'){
                    getCameraOptions(function(data){
                        if (!data) {
                            // removeStreamFieldOverlay();
                            // $("#add-new-camera-dialog").modal('hide');
                        } else {
                            setAuthStatus(data, function(){
                                setConstraintsOnStreamFields(data, function(error){
                                    removeStreamFieldOverlay();
                                });
                            });
                        }
                    });
                } else {
                    removeStreamFieldOverlay();
                }					
                // - -

                $("#add-new-camera-dialog").modal('show');
            } else {

            }
        }
    });    
};


var populateChannelFields = function( optionsPerChannel ) {

    if (!optionsPerChannel) { return; }

    // clear selector before updating it
    $('.camera-stream-channel-select').html('');

    for (var i = 1; i <= optionsPerChannel.nChannels; i++) {
        $('.camera-stream-channel-select').append(
            $('<option>', {
                value: i,
                text: i
            })
        );
    }

    $('.camera-stream-channel-select').each( function(idx) {
        $(this).change( function() {
            var channel = $(this).val();

            if ( optionsPerChannel.resolutionsPerChannel && optionsPerChannel.resolutionsPerChannel[channel] ) {
                var d = {
                    resolutions: optionsPerChannel.resolutionsPerChannel[channel]
                };
                populateResolutionFields( d, idx );
            }

            if ( optionsPerChannel.bitratesPerChannel && optionsPerChannel.bitratesPerChannel[channel] ) {
                var bitrates = optionsPerChannel.bitratesPerChannel[channel];
                populateBitrateFields( bitrates, idx );
            }
        });

        var channel = $(this).attr('data-channel') || 1;
        $(this).val( channel );
    });


    $('.camera-stream-channel-group').show(); 
    $('.camera-stream-channel-select').change();
};


var populateBitrateFields = function(bitrates, idx) {

    // TODO: also handle list of bitrates instead of just range
    if (!bitrates || !bitrates.min || !bitrates.max) { 
        return;
    }

    var min = parseInt( bitrates.min );
    var max = parseInt( bitrates.max );

    if ( !isNaN(idx) ) {

        var el = $( $('.camera-stream-bitrate-select')[idx] );

        var default_val = '512';
        var current_val = el.val() || el.attr('data-bitrate') || default_val;

        el.html('');
        for (var i = min; i <= max; i*=2) {
            el.append($('<option>', {
                value:  i,
                text:   i
            }));
        };

        el.val(current_val);

        $('.camera-stream-bitrate-group').show();

        return;
    }

    $('.camera-stream-bitrate-select').each(function(){
        var self = $(this);
        var default_val = '512';
        var current_val = self.val() || self.attr('data-bitrate') || default_val;

        self.html('');
        for (var i = min; i <= max; i*=2) {
            self.append($('<option>', {
                value:  i,
                text:   i
            }));
        };

        self.val(current_val);
    });

    $('.camera-stream-bitrate-group').show();
};


var populateResolutionFields = function(data, idx) {

    if ( !isNaN(idx) ) {

        var el = $( $('.camera-stream-resolution-select')[idx] );

        var first_val = data.resolutions[0] ? data.resolutions[0].value : 0;
        var current_val = el.val() || el.attr('data-resolution') || first_val;

        el.html('');
        for (idx in data.resolutions) {
            el.append($('<option>', {
                value: data.resolutions[idx].value,
                text: data.resolutions[idx].name
            }));
        }
        el.val(current_val);
        return;
    }

    $('.camera-stream-resolution-select').each(function(){
        var self = $(this);
        var first_val = data.resolutions[0] ? data.resolutions[0].value : 0;

        var current_val = self.val() || self.attr('data-resolution') || first_val;

        self.html('');
        for (idx in data.resolutions) {
            self.append($('<option>', {
                value: data.resolutions[idx].value,
                text: data.resolutions[idx].name
            }));
        }
        self.val(current_val);
    });
};


var setConstraintsOnStreamFields = function(data, cb){
    if (data){
        // credentials are correct
        //get the supported parameters of the camera
        var encoder = false;

        if (data.resolutions && data.resolutions[0] && data.resolutions[0].camera_no) {
            // encoder detected
            encoder = true;
            $('.device-type-name').html('encoder');
        }

        if (encoder) {
            $('.camera-stream-camera_no-select').each(function() {
                var self = $(this);
                var current_val = self.attr('data-camera_no') || self.val() || 0;
                self.html('');
                for (idx in data.resolutions){
                    self.append($('<option>', {
                        value: data.resolutions[idx].camera_no,
                        text: data.resolutions[idx].name
                    }));
                }
                self.val(current_val);
                populateResolutionFields( data.resolutions[current_val] );
            });

            $('.camera-stream-camera_no-select').change(function() {
                var self = $(this);
                var current_val = self.val() || 0;
                populateResolutionFields(data.resolutions[current_val] );
            });

            $('.camera-stream-camera_no-group').show();

        } else {
            populateResolutionFields( data );
        }

        if (data.framerate_range) {
            $(".camera-stream-framerate-input").attr({
                min: data.framerate_range.min,
                max: data.framerate_range.max
            });
        }
        if (data.quality_range) {
            $(".camera-stream-quality-input").attr({
                min: data.quality_range.min,
                max: data.quality_range.max
            });
        }
        if (data.bitrate_range) {
            $(".camera-stream-bitrate-input").attr('');
            populateBitrateFields( data.bitrate_range );
        }
        if (data.optionsPerChannel) {
            populateChannelFields( data.optionsPerChannel );
        }

        cb(null);
    }else{
        cb("unauthorized");
    }
};

var meridian = function(hour){
    return (Math.round(hour / 12) > 0) ? " PM" : " AM";
};


var to12HourTime = function(hours){
    return ( (hours + 11) % 12 + 1 );
};


scanForCameras = function(subnet, cb) {
    $("#camera-scanner-container").hide();
    $("#scan-spinner").show();

    $.ajax({
        type: "GET",
        url: "/scan.json?subnet=" + subnet,
        contentType: 'application/json',
        success: function(data) {
            if (data == 'busy') {
                toastr.warning('scanner is busy now');
                $('#camera-scanner-btn').attr('disabled', true);
                $("#scan-spinner").hide();
                return;
            }
            var ip_addresses = [];
            for (var i in cameras){
                ip_addresses.push(cameras[i].ip)
            }

            var newCameras = 0;

            for (var idx in data) {
                if (ip_addresses.indexOf(data[idx].ip) === -1){
                    newCameras++;
                    ip_addresses.push(data[idx].ip);
                    addCamera( data[idx], function(result) {
                        if (result && result._id){
                            cameras[result._id] = result;
                            addCameraItem( result );
                            for (var j in result.streams) {

                                var text = '';
                                if ( streams[j].name ) {
                                    text = streams[j].name;
                                }else if ( streams[j].resolution ) {
                                    text = streams[j].resolution;
                                } else {
                                    text = streams[j].url;
                                }

                                timelineSetup(result._id, result.streams[j].id, text);
                            }
                        }
                    });                                
                }
            }
            if (newCameras) {
                toastr.info('Found ' + newCameras + ' cameras.');
            } else {
                toastr.info('No new cameras found.');
            }

            $("#scan-spinner").hide();
            if (cb) cb();
        },
        error: function( data ) {
            $("#scan-spinner").hide();
        }
    });    

};

var compareScheduleTime = function(day) {

    var beginString = $('#schedule-'+day+'-open').val() || '';
    var begin = beginString.split(':');
    var endString = $('#schedule-'+day+'-close').val() || '';
    var end = endString.split(':');

    var beginHour   = begin[0] || 0;
    var beginMinute = begin[1] || 0;

    var endHour   = end[0] || 0;
    var endMinute = end[1] || 0;

    var beginTime = new Date();
    beginTime.setHours(beginHour);
    beginTime.setMinutes(beginMinute);

    var endTime = new Date();
    endTime.setHours(endHour);
    endTime.setMinutes(endMinute);

    if (beginTime >= endTime) {
        return 'off';
    } else if (beginString == '0:00' && endString == '23:59'){
        return 'all';
    } else {
        return 'partial';
    }
}

var setupScheduleTableEvents = function() {
    var days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    for (var d in days) {
        $('#schedule-'+days[d]+'-open').change(function() {
            var day = $(this).attr('data-day');
            var recording = compareScheduleTime( day );
            if ( recording == 'all' ) {
                $('.schedule-'+day).css('background', 'none');
                $('#set-all-day-'+day).hide();
            } else if (recording == 'off'){
                $('.schedule-'+day).css('background', 'rgba(193,193,193,0.8)');
                $('#set-all-day-'+day).fadeIn();
            } else if (recording == 'partial') {
                $('.schedule-'+day).css('background', 'rgba(250,250,180,0.8)');
                $('#set-all-day-'+day).fadeIn();
            }
        });
        $('#schedule-'+days[d]+'-close').change(function() {
            var day = $(this).attr('data-day');
            var recording = compareScheduleTime( day );
            if ( recording == 'all' ) {
                $('.schedule-'+day).css('background', 'none');
                $('#set-all-day-'+day).hide();
            } else if (recording == 'off'){
                $('.schedule-'+day).css('background', 'rgba(193,193,193,0.8)');
                $('#set-all-day-'+day).fadeIn();
            } else if (recording == 'partial') {
                $('.schedule-'+day).css('background', 'rgba(250,250,180,0.8)');
                $('#set-all-day-'+day).fadeIn();
            }
        });
    }
};

var setAllDay = function(day) {
    $('#schedule-'+day+'-open').val('0:00').trigger('change');
    $('#schedule-'+day+'-close').val('23:59').trigger('change');
};

var generateScheduleTable = function() {
    var days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    var header = '<tr>';
    header += '<th style="border-left-color: #fff; border-top-color: #fff"></th>';
    for (var d in days) {
        var day = days[d];
        header += '<th class = "schedule-'+day+'">' + day 
            + '<div style="font-size:9pt; opacity: 0.8" id = "set-all-day-'+day+'"><a href="javascript:setAllDay(\''+day+'\')">[ set all day ]</a></div>'
            + '</th>';
    }
    header += '</tr>';

    var startTime = '<tr>';
    startTime += '<td>Start Time</td>';

    for (var d in days) {
        var day = days[d];
        startTime += '<td class = "schedule-'+day+'">';
        startTime += '<div class="form-group">';
        startTime += '<div class="input-append bootstrap-timepicker">';
        startTime += '<input type="text" class="form-control input-small" id="schedule-'+day+'-open" data-day="'+day+'" name="schedule['+day+'][open]">';
        startTime += '</div>';
        startTime += '</div>';
        startTime += '</td>';
    }
    startTime += '</tr>';


    var endTime = '<tr>';
    endTime += '<td>End Time</td>';

    for (var d in days) {
        var day = days[d];
        endTime += '<td class = "schedule-'+day+'">';
        endTime += '<div class="form-group">';
        endTime += '<div class="input-append bootstrap-timepicker">';
        endTime += '<input type="text" class="form-control input-small" id="schedule-'+day+'-close" data-day="'+day+'" name="schedule['+day+'][close]">';
        endTime += '</div>';
        endTime += '</div>';
        endTime += '</td>';
    }
    endTime += '</tr>';

    var table = '<br><table class="table table-bordered">';
    table += header;
    table += startTime;
    table += endTime;
    table += '</table>';
    table += '<div style="color:rgba(0,0,0,0.7)">';
    table += '<br><div style="border-style: solid; border-width: 1px; border-color: rgba(0,0,0,0.5); width:15px; height: 10px; float: left; margin: 5px"></div> recording all day (start time = 0:00, end time = 23:59)';
    table += '<br><div style="background: rgba(240,240,180,1.0); width:15px; height: 10px; float: left; margin: 5px"></div> recording part of the day';
    table += '<br><div style="background: rgba(193,193,193,0.9); width:15px; height: 10px; float: left; margin: 5px"></div> not recording (end time >= start time)';
    table += '</div>';

    return table;
};


var addStreamFieldset = function( opts, cb ) {

    if ( typeof opts === 'function' ) {
        cb = opts;
        opts = {};
    }

    var isSpotMonitorStream = ( opts.type == 'spot-monitor' );
    var fieldType = isSpotMonitorStream ? 'spotMonitorStreams' : 'streams';

    var current_stream_id = current_number_of_streams;

    //
    // hidden spot-monitor field
    var camera_stream_spot_monitor = $('<input>', {
        type: 'hidden',
        id: 'camera-streams-' + current_stream_id + '-spot-monitor',
        name: 'camera[' + fieldType + '][' + current_stream_id + '][spotMonitor]'
    });
    //

    // hidden id field
    var camera_stream_id = $('<input>', {
        type: 'hidden',
        id: 'camera-streams-' + current_stream_id + '-id',
        name: 'camera['+fieldType+'][' + current_stream_id + '][id]'
    });
    // end of hidden id field
    //
    var manufacturer = $("#camera-manufacturer").val();
    var defined_class = manufacturer == 'unknown' ? 'unknown' : 'defined';
    var fieldset = $('<fieldset>', {
        class: 'recording-profile-fields ' + defined_class
    });

    //
    // name field
    var camera_stream_name_group = $('<div>', {
        class: 'form-group',
        html: '<label for="camera-streams-' + current_stream_id + '-name">name</label>'
    });

    var camera_stream_name = $('<input>', {
        type: 'string',
        class: 'form-control',
        id: 'camera-streams-' + current_stream_id + '-name',
        name: 'camera['+fieldType+'][' + current_stream_id + '][name]'
    });

    camera_stream_name_group.append( camera_stream_name );

    //
    // retention field
    var camera_stream_retention_group = $('<div>', {
        class: 'form-group  col-xs-4',
        html: '<label for="camera-streams-' + current_stream_id + '-retention">retention period</label>'
    });

    var camera_stream_retention = $('<input>', {
        type: 'number',
        min: 0,
        class: 'form-control camera-streams-retention',
        id: 'camera-streams-' + current_stream_id + '-retention',
        name: 'camera['+fieldType+'][' + current_stream_id + '][retention]'
    });
    camera_stream_retention_info = $("<span id='retention-info-" + current_stream_id + "' class='retention-info'>recording until disk is full</span>");
    camera_stream_retention_unit = $("<span class='retention-unit'>days</span>");
    camera_stream_container = $("<div>").append(camera_stream_retention_unit).append(camera_stream_retention);
    camera_stream_retention_group.append( camera_stream_container );
    camera_stream_container.append(camera_stream_retention_info);

    // camera_stream_retention_info.hide();

    camera_stream_retention.change(function() {
        var v = camera_stream_retention.val();

        if (!v || !parseInt(v)) {
            camera_stream_retention_info.fadeIn();
        } else {
            camera_stream_retention_info.fadeOut();
        }
    });
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
            html: '<label for="camera-streams-' + current_stream_id + '-rtsp">rtsp Stream</label>'
        });

        var camera_stream_rtsp = $('<input>', {
            type: 'text',
            class: 'form-control',
            id: 'camera-streams-' + current_stream_id + '-url',
            name: 'camera['+fieldType+'][' + current_stream_id + '][url]',
            value: rtsp_uri
        });	
        camera_stream_rtsp_group.append( camera_stream_rtsp );

        fieldset.append( camera_stream_id );
        fieldset.append( camera_stream_name_group );		
        fieldset.append( camera_stream_rtsp_group );

    } else{
        //
        // resolution field
        var camera_stream_resolution_group = $('<div>', {
            class: 'form-group col-xs-3',
            html: '<label for="camera-streams-' + current_stream_id + '-resolution">resolution</label>'
        });

        var camera_stream_resolution = $('<select>', {
            class: 'form-control camera-stream-resolution-select',
            id: 'camera-streams-' + current_stream_id + '-resolution',
            name: 'camera['+fieldType+'][' + current_stream_id + '][resolution]'
        });

        var camera_stream_source_group = $('<div>', {
            class: 'form-group col-xs-3 camera-stream-camera_no-group',
            html: '<label for="camera-streams-' + current_stream_id + '-camera_no">camera</label>'
        }).hide();

        var camera_stream_source = $('<select>', {
            class: 'form-control camera-stream-camera_no-select',
            id: 'camera-streams-' + current_stream_id + '-camera_no',
            name: 'camera['+fieldType+'][' + current_stream_id + '][camera_no]'
        });

        camera_stream_source_group.append( camera_stream_source );
        camera_stream_resolution_group.append( camera_stream_resolution );
        // end of resolution field
        //

        //
        // framerate field
        var camera_stream_framerate_group = $('<div>', {
            class: 'form-group  col-xs-2',
            html: '<label for="camera-streams-' + current_stream_id + '-framerate">framerate</label>'
        });

        var camera_stream_framerate = $('<input>', {
            type: 'number',
            min: 1,
            max: 30,
            class: 'form-control camera-stream-framerate-input',
            id: 'camera-streams-' + current_stream_id + '-framerate',
            name: 'camera['+fieldType+'][' + current_stream_id + '][framerate]'
        });

        camera_stream_framerate_group.append( camera_stream_framerate );
        // end of framerate field
        //

        //
        // quality field
        var camera_stream_quality_group = $('<div>', {
            class: 'form-group  col-xs-2',
            html: '<label for="camera-streams-' + current_stream_id + '-quality">quality</label>'
        });

        var camera_stream_quality = $('<input>', {
            type: 'number',
            min: 1,
            max: 30,
            class: 'form-control camera-stream-quality-input',
            id: 'camera-streams-' + current_stream_id + '-quality',
            name: 'camera['+fieldType+'][' + current_stream_id + '][quality]'
        });

        camera_stream_quality_group.append( camera_stream_quality );
        // end of quality field
        //

        //
        // bitrate field
        var camera_stream_bitrate_group = $('<div>', {
            class: 'form-group  col-xs-4 camera-stream-bitrate-group',
            style: 'display: none',
            html: '<label for="camera-streams-' + current_stream_id + '-bitrate">max bitrate (kbps)</label>'
        });

        var camera_stream_bitrate = $('<select>', {
            class: 'form-control camera-stream-bitrate-select',
            id: 'camera-streams-' + current_stream_id + '-bitrate',
            name: 'camera['+fieldType+'][' + current_stream_id + '][bitrate]'
        });

        camera_stream_bitrate_group.append( camera_stream_bitrate );
        // end of bitrate field
        //

        //
        // channel field
        var camera_stream_channel_group = $('<div>', {
            class: 'form-group  col-xs-2 camera-stream-channel-group',
            style: 'display: none',
            html: '<label for="camera-streams-' + current_stream_id + '-channel">channel</label>'
        });

        var camera_stream_channel = $('<select>', {
            class: 'form-control camera-stream-channel-select',
            id: 'camera-streams-' + current_stream_id + '-channel',
            name: 'camera['+fieldType+'][' + current_stream_id + '][channel]'
        });

        camera_stream_channel_group.append( camera_stream_channel );
        // end of channel field
        //

        fieldset.append( camera_stream_id );
        // fieldset.append( camera_stream_rtsp_group );
        fieldset.append( camera_stream_name_group );
        fieldset.append( camera_stream_source_group);
        fieldset.append( camera_stream_channel_group );
        fieldset.append( camera_stream_resolution_group );
        fieldset.append( camera_stream_framerate_group );
        // fieldset.append( camera_stream_quality_group ); // not being used for now
        fieldset.append( camera_stream_bitrate_group );
    }

    if (!isSpotMonitorStream) {
        fieldset.append( camera_stream_retention_group );
    } else {
        camera_stream_spot_monitor.val( true );
        fieldset.append( camera_stream_spot_monitor );
    }

    fieldset.find("#remove-stream-" + current_stream_id).click(function(){
        $(this).parent().remove();
    });

    current_number_of_streams++;

    cb( fieldset, current_stream_id);
};


var addStreamFieldOverlay = function( stream_tab_id ) {

    var spinner = $('<div>', {
        class: 'spinner',
        html: 'loading configurations...<br><div class="bounce1"></div><div class="bounce2"></div><div class="bounce3"></div>',
        style: 'color: rgba(100,100,100,0.8); width: 100%; margin-top:10%'
    });

    var overlay = $('<div>', {
        class: 'stream-field-overlay',
        style: 'position: absolute; top: 0px; left: 0px; width: 100%; height: 100%; background: rgba(250,250,250,0.8); z-index:100'
    }).appendTo(stream_tab_id);

    spinner.appendTo(overlay);
};


var removeStreamFieldOverlay = function() {
    console.log('remove stream field overlay');
    $('.stream-field-overlay').remove();
};

var addStream = function( stream, opts, cb ) {

    if ( typeof stream === 'function' ) {
        cb = stream;
        opts = {};
    } else if ( typeof opts === 'function' ) {
        cb = opts;
        opts = stream;
    }

    var isSpotMonitorStream = ( opts.type == 'spot-monitor' );
    stream.spotMonitor = isSpotMonitorStream;

    addStreamFieldset( opts, function(fieldset, current_stream_id) {
        var idx = current_number_of_streams-1;

        $('div.active').removeClass('active').removeClass('in');
        $('li.active').removeClass('active');
        var stream_name = 'new stream';

        if (stream && stream.name){
            stream_name = stream.name;
        }

        var new_stream_tab_id = 'new-stream-' + current_stream_id;

        if (!isSpotMonitorStream) {
            $('#stream-tabs').append('<li style="max-width:200px; max-height:35px;overflow:hidden"><a href="#' + new_stream_tab_id + '" data-toggle="tab" id="tab_'+new_stream_tab_id+'">' + stream_name + '</a></li>');
        } else {
            $('#stream-tabs').append('<li style="max-width:200px; max-height:35px;overflow:hidden"><a href="#' + new_stream_tab_id + '" data-toggle="tab" id="tab_'+new_stream_tab_id+'" style="background:#f5f5f5">' + stream_name + '</a></li>');
        }

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

        if (isSpotMonitorStream) {
            $('#'+new_stream_tab_id).prepend('<div id = "spot-monitor-warn"> spot monitor only </div>'); 
        }

        // $('#'+new_stream_tab_id).append(check_stream_button);                  
        $('#'+new_stream_tab_id).append(remove_stream_button); 
        $('#'+new_stream_tab_id).append(spinner);
        $('#'+new_stream_tab_id).append(check_stream_status);  

        check_stream_button.click( function( e ) {
            e.preventDefault();
            checkH264( current_stream_id );
        });

        remove_stream_button.click( function( e ) {
            e.preventDefault();
            console.log(stream);
            if (typeof stream !== 'object') {
                $('#'+new_stream_tab_id).remove();
                $('#tab_'+new_stream_tab_id).remove();
            } else {
                removeStream( stream );
            }
            $('#stream-tabs a:last').tab('show');
        });	

        for (var attr in stream) {
            $("#add-new-camera-dialog #camera-streams-" + idx + "-" + attr).val( stream[attr] );
            $("#add-new-camera-dialog #camera-streams-" + idx + "-" + attr).attr( 'data-'+attr, stream[attr] );
        }
        var retention =  $("#camera-streams-" + idx + "-retention").val(); 
        if ( !retention || !parseInt(retention) ) {
            $("#retention-info-" + idx).fadeIn(); 
        } else {
            $("#retention-info-" + idx).fadeOut(); 
        }

        if (cb){
            cb( new_stream_tab_id );
        }
        // addStreamFieldOverlay( '#' + new_stream_tab_id );
    });
};


var removeStreamFromUI = function( stream ) {
    $('timeline-'+stream.id).remove();
};


var removeSpotMonitorStream = function( stream ) {

    bootbox.confirm('are you sure you want spot monitor stream <b>' + (stream.name || stream.url) + '</b> ?', function(ok) {

        if( !ok ) {
            return;
        }

        addOverlayToPage('removing spot monitor stream...');

        $.ajax({
            type: 'DELETE',
            url: '/cameras/' + stream.camId + '/spot_monitor_streams/' + stream.id,
            success: function(data) {
                if (data.error) {
                    removeOverlayFromPage( function() {
                        toastr.error(data.error);
                    });
                } else {
                    removeOverlayFromPage( function() {
                        location.reload();
                    });
                }
            },
            error: function(err) {
                removeOverlayFromPage( function() {
                    toastr.error( err.responseJSON.error );
                });
            }
        });
    });
};



var removeStream = function( stream ) {

    if (!stream.id) {
        console.log(stream);
        return;
    }

    if (stream.spotMonitor) {
        return removeSpotMonitorStream( stream );
    }

    bootbox.confirm('are you sure you want to remove stream <b>' + (stream.name || stream.url) + '</b> ?', function(ok) {

        if( ok ) {
            addOverlayToPage('removing stream...');

            $.ajax({
                type: 'DELETE',
                url: '/cameras/' + stream.camId + '/streams/' + stream.id,
                success: function(data) {
                    if (data.error) {
                        removeOverlayFromPage( function() {
                            toastr.error(data.error);
                        });
                    } else {
                        removeOverlayFromPage( function() {
                            location.reload();
                        });
                    }
                }
            });
        } else {
        }
    });
};


var checkH264 = function(new_stream_id ) {

    var button = $('#check-stream-button-'+new_stream_id);
    var spinner = $('#check-stream-spinner-'+new_stream_id);
    var stream_status = $('#check-stream-status-'+new_stream_id);

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
            if (data.success) {
                cameras[camId].updatedOn = Date.now();
                if (data.schedule_enabled == '1') {
                    $('#scheduler-notice').hide();
                } else {
                    $('#scheduler-notice').show();
                }
                $('#camera-schedule-enable').prop('checked', data.schedule_enabled == "1").change( function() {

                    if ( $(this).is(':checked') ) {
                        $('#scheduler-notice').fadeOut();
                        $('#camera-schedule-dialog .form-control').prop('disabled', false);
                    } else {
                        $('#scheduler-notice').fadeIn();
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

                    addOverlayToPage('updating schedule...');

                    updateSchedule( camId, function(data) {
                        console.log(data);
                        if (data.success) {
                            removeOverlayFromPage( function() {
                                toastr.success("Scheduled successfully updated");
                                $('#camera-schedule-dialog').modal('toggle');
                                var enabled = $("#camera-schedule-enable").is(':checked');
                                console.log(enabled);
                                var statusColor = enabled ? 'green' : 'red';
                                $("#camera-item-" + camId + " .schedule .status").removeClass("gray green red").addClass(statusColor);
                                // location.reload();
                                // toastr.success("Scheduled successfully updated");
                            });
                        } else {
                            removeOverlayFromPage( function() {
                                alert(data.error);
                            });
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

var getCameraById = function(id) {
    for (var i in cameras ) {
        if (i == id) return cameras[i];
    }
}

var cameraMotion = function(camId) {

    camMotion.launch( camId );

};


