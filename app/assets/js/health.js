// disk throughput attributes
var tpAttr = [
	{
		name: 'reads per second',
		label: 'r/s',
		id: 'rs'
	},
	{
		name: 'kb per second (read)',
		label: 'kr/s',
		id: 'krs'
	},
	{
		name: 'writes per second',
		label: 'w/s',
		id: 'ws'
	},
	{
		name: 'kb per second (write)',
		label: 'kw/s',
		id: 'kws'
	},
];


var cameras = {};
var camera_status_counts = {};

var $recordingCount = null;
var $idleCount = null;
var $disconnectedCount = null;
$(function(){
	$recordingCount = $("#recordingCount");
	$idleCount = $("#idleCount");
	$disconnectedCount = $("#disconnectedCount");
});
var setupHealth = function() {

	setupCameraStatus();

	var socket = io.connect();

	socket.on('cpu_load', function(data) {
		updateCpuLoad( data );
	});

	socket.on('smart', function(data) {
		updateSmartStatus( data );
	});

	socket.on('hdd_throughput', function(data) {
		updateHddThroughput( data );
	});	

	socket.on('sensorsData', function(data) {
		updateSensors( data );
	});

	socket.on('cameraStatus', function(data) {
		updateCameraStatus(data);
	});

	socket.on('newThumb', function(data) {
		var thumb = "/cameras/" + data.cam + "/streams/" + data.stream + "/thumb/"+data.start + "_" + (data.end-data.start);
		updateThumb(data.cam, thumb );
	});

	socket.on('newChunk', function(data) {
		updateRecordingStatus(data);
	});

	setupSensorsInfo();
};


var updateThumb = function(id, thumb ){
	
	var img = new Image();

	$(img).attr({
		src: thumb,
		style:"margin: 0 auto;",
		class:"img-responsive img-thumbnail"
	}).load(function(){
		$("#thumb-"+id).html( $(this) );
	}).error(function(){
		console.log("unable to load image")
	});
};

var updateCameraStatus = function(data){
	if (data.status === 'offline' || data.status === 'disconnected') {
		if (cameras[data.cam_id].status !== 'disconnected'){
			if (cameras[data.cam_id].status === 'idle'){
				// remove the count from idle
				camera_status_counts.idle -= 1;
			}else if (cameras[data.cam_id].status === 'recording'){
				// remove count from ok
				camera_status_counts.recording -= 1;
			}
			camera_status_counts.disconnected += 1;
			cameras[data.cam_id].status = 'disconnected';
			updateStatus(data.cam_id, "panel-danger");
		}
	} else if (data.status === 'online' || data.status === 'connected') {
		// if we are receiving a status of online or connected and the camera is disconnected
		if (cameras[data.cam_id].status === 'disconnected'){
			if (cameras[data.cam_id].recording == true){
				// remove the count from disconnected to ok
				camera_status_counts.recording += 1;
				cameras[data.cam_id].status = 'recording';
				updateStatus(data.cam_id, "panel-success");
			}else{
				// remove count from disconnected to idle
				camera_status_counts.idle += 1;
				cameras[data.cam_id].status = 'idle';
				updateStatus(data.cam_id, "panel-warning");
			}
			camera_status_counts.disconnected -= 1;
		}else if (cameras[data.cam_id].status === 'idle' && cameras[data.cam_id].recording == true){
			//then we need to move it to ok
			camera_status_counts.recording += 1;
			camera_status_counts.idle -= 1;
			cameras[data.cam_id].status = 'recording';
			updateStatus(data.cam_id, "panel-success");
		}
	}
	updateCounts();
}

var updateRecordingStatus = function(data){
	var cam_id = data.cam;
	if (cameras[cam_id].interval){
		clearInterval(cameras[cam_id].interval);
	}
	cameras[cam_id].recording = true;
	cameras[cam_id].interval = setTimeout(function(){
		cameras[cam_id].recording = false;
		camera_status_counts.recording -= 1;
		camera_status_counts.idle += 1;
		cameras[cam_id].status = 'idle';
		updateStatus(data.cam_id, "panel-warning");
		updateCounts();
	}, 20000);	
};

var updateSensors = function( data ) {

	var table = $('#sensors-table');
	table.html('');

	for (var sensor in data) {

		for (var type in data[sensor]) {
			if (!type || type === 'undefined') continue;
			var row = $('<tr>');
			var column = $('<td>', {
				id: sensor + "-" + type,
				class: "sensor-label",
				html: sensor + ' (' + type + ')'
			});

			row.append( column );

			column = $('<td>', {
				class: "sensor-value",
				html: data[sensor][type].value
			});

			row.append( column );

			table.append(row);
		}
	}
	
};


var updateCpuLoad = function( data ) {

	$("#cpu_load").html(data.usage);	
	var color = 120 - data.usage*1.2;
	$("#cpu_bar").stop().animate({
		backgroundColor: 'hsl('+color+',100%,50%)',
		width: data.usage*2
	}, 500);	
};


var updateHddThroughput = function( data ) {

	for (var hdd in data) {
		
		var tpinfo = $('#' +  hdd + '-tp-info');
		
		if (tpinfo.length > 0) {

			for (var i in tpAttr) {
				var bar =  $("#"+ hdd + "-" + tpAttr[i].id + "-bar");
				if ( isNaN(data[hdd][tpAttr[i].label]) ) continue;
				bar.stop().animate({
					width: 2*data[hdd][tpAttr[i].label],
				}, 500);
				var labelEl = $('#' + hdd + '-' + tpAttr[i].id + '-bar-label');
				labelEl.html( data[hdd][tpAttr[i].label] + " " + tpAttr[i].label );
			}
		}
	}
};


var updateStatus = function(cam_id, klass){
	$("#status_" + cam_id + " .panel").removeClass("panel-danger panel-warning panel-success").addClass(klass);
}

var updateCounts = function(){
	if ($recordingCount && $idleCount && $disconnectedCount){
		$recordingCount.html(camera_status_counts["recording"]);
		$idleCount.html(camera_status_counts["idle"]);
		$disconnectedCount.html(camera_status_counts["disconnected"]);
	}
};

var setupCameraStatus = function(){
	// Query the camera list and add the elements to the DOM
$.ajax({ 
		url: "/cameras.json", 
		dataType: "json",
		success: function( data ) 
{			if (data){
				camera_status_counts['recording'] = 0;
				camera_status_counts['idle'] = data.length;
				camera_status_counts['disconnected'] = 0;
				updateCounts();
				var class_name = "col-sm-3";
				var $cameras = $("#cameras");

		
				for (var i = 0; i < data.length; i++) {

					var cam_name = data[i].name || data[i].ip + " | " + data[i].manufacturer;
					cameras[data[i]._id] = {recording: false, status:'idle', interval: null};
					var html = $("<div id=\"status_" + data[i]._id + "\" class=\"" + class_name + "\"><div id=\"camStatus\" class=\"panel panel-warning\"><div class=\"panel-heading\"><div id=\"thumb-" + data[i]._id +"\"></div><div>" + cam_name + "</div></div></div></div>");
					$cameras.append(html);

					if (typeof data[i].streams !== 'undefined' && data[i].streams.length > 0 && typeof data[i].streams[0].latestThumb !== 'undefined'){
						var thumb = "/cameras/" + data[i]._id + "/streams/" + data[i].streams[0].id + "/thumb/" + data[i].streams[0].latestThumb;
						updateThumb(data[i]._id, thumb );						
					}else{
						var thumb = "/img/no-image.png";
						updateThumb(data[i]._id, thumb );	
					}				
				}	
				for (var i = 0; i < data.length; i++) {
					var d = data[i];
					d.cam_id = d._id;
					cameras[d._id].recording = true;
					updateCameraStatus( d );
				}
			}

		}
	});
};


var setupSensorsInfo = function() {

	var table = $("<table>", {
		id: 'sensors-table',
		class: 'table table-striped table-hover table-condensed'
	}).appendTo('#sensors-info');

};


var setupTpInfo = function( hdd ) {
	
	var hddinfo =  $('#' +  hdd + '-info');

	var tpinfo = $('<div>', {
		id: hdd + '-tp-info',
		class: 'tp-info',
		html: '<b>'+hdd+' throughput</b>'
	}).appendTo("#tp-status");

	for (var i in tpAttr) {

		var barContainer = $('<div>', {
			id: hdd + '-' + tpAttr[i].id + '-bar-container',
			class: 'tp-bar-container'
		}).appendTo(tpinfo);

		var barLabel = $('<div>', {
			id: hdd + '-' + tpAttr[i].id + '-bar-label',
			class: 'tp-bar-label'
		}).appendTo(barContainer);

		var bar = $('<div>', {
			id: hdd + '-' + tpAttr[i].id + '-bar',
			class: tpAttr[i].id + '-bar tp-bar'
		}).appendTo(barContainer);
	}
};


var updateSmartStatus = function( data ) {

	var validData = ['sda', 'sdb', 'sdc', 'sdd', 'sde'];

	var hdd = data.hdd.replace("/dev/", "");
	if ( validData.indexOf(hdd) < 0 ) return;
	

	var hddinfo =  $('#' +  hdd + '-info');
	var smartinfo = $('#' +  hdd + '-smart-info');
	var tpinfo = $('#' +  hdd + '-tp-info');

	var smartTable = "";

	if ( hddinfo.length === 0 ) {

		hddinfo = $('<div>', {
			id: hdd + '-info'
		}).appendTo("#smart-status");

		smartinfo = $('<div>', {
			id: hdd + '-smart-info',
			class: 'smart-info'
		}).appendTo(hddinfo);
		
		setupTpInfo( hdd );

		$("#smart-status").append("<br>");

		smartinfo.append('<br><h4><a data-toggle="collapse" href="#'+ hdd + '-smart-table">' + hdd + ' SMART status</a></h4>');

		smartTable = $("<table>", {
			id:  hdd + '-smart-table',
			class: 'table table-striped table-hover table-condensed collapse in'
		}).appendTo( smartinfo );

	} else {
		smartTable = $('#' + hdd + '-smart-table');
		smartTable.html("");
	}
	
	var tHead = $("<thead>").appendTo( smartTable );
	var headerRow = $("<tr>").appendTo( tHead ).html("<td></td>");

	var attrRow = $("<tr>").appendTo( smartTable );
	
	var isHeaderPopulated = false;

	for (var attribute in data.status) {
		attrRow = $("<tr>").appendTo( smartTable );
		
		for (var type in data.status[0]) {
			$("<td>").appendTo( attrRow )
				.html( type );
		}
		
		$("<td>").appendTo( attrRow ).html(attribute);
		
		for (var type in data.status[attribute]) {

			if (!isHeaderPopulated) {
				$("<td>").appendTo( headerRow )
					.html( type );
			}
			$("<td>").appendTo( attrRow )
				.html( data.status[attribute][type] );
		}
		isHeaderPopulated = true;
	}
};
