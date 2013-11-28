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


var setupHealth = function() {

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
				bar.stop().animate({
					width: 2*data[hdd][tpAttr[i].label],
				}, 500);
				var labelEl = $('#' + hdd + '-' + tpAttr[i].id + '-bar-label');
				labelEl.html( data[hdd][tpAttr[i].label] + " " + tpAttr[i].label );
			}
		}
	}
};


var setupTpInfo = function( hdd ) {
	
	var hddinfo =  $('#' +  hdd + '-info');

	var tpinfo = $('<div>', {
		id: hdd + '-tp-info',
		class: 'tp-info'
	}).appendTo(hddinfo);

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

	var hdd = data.hdd.replace("/dev/", "");

	var hddinfo =  $('#' +  hdd + '-info');
	var smartinfo = $('#' +  hdd + '-smart-info');
	var tpinfo = $('#' +  hdd + '-tp-info');

	if ( hddinfo.length === 0 ) {

		hddinfo = $('<div>', {
			id: hdd + '-info'
		}).appendTo("#smart-status");

		smartinfo = $('<div>', {
			id: hdd + '-smart-info',
			class: 'smart-info'
		}).appendTo(hddinfo);
		
		setupTpInfo( hdd );

		$("#smart-status").append("<br><br>");
	} else {
		smartinfo.html("");
	}

	smartinfo.append('<h4><a data-toggle="collapse" href="#'+ hdd + '-smart-table">' + hdd + ' SMART status</a></h4>');
	
	var smartTable = $("<table>", {
		id:  hdd + '-smart-table',
		class: 'table table-striped table-hover table-condensed collapse in'
	}).appendTo( smartinfo );

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





