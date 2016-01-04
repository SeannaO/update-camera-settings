
var createGroups = function( n ) {
	for (var i = 0; i < n; i++) {
		groupsManager.addNewGroup();
	}
};


var createGroupsMenu = function() {

	for(var i in groupsManager.groups) {
		var el = $('<a>', {
			id: 'link-to-group-' + i,
			html: parseInt(i) + 1,
			style: 'margin-right: 5px'
		});
		el.attr('href', 'javascript:groupsManager.goToGroup('+i+')');
		el.appendTo('#groups-menu');
	}
};


var populateCamerasList = function() {

	$.getJSON( "/cameras.json", function( data ) {
		for (var i = 0; i < data.length; i++) {
			if (data[i] && data[i].streams && data[i].streams.length > 0) {
				cameras[data[i]._id] = data[i];

				//------
				// cameras list
				appendToCamerasList( data[i] );
				//------
			}
		}
		groupsManager.loadGroups();
	});
};


var setupEvents = function() {

		//---------
		// cameras list

		$('#toggle-cameras-list').click( function() {
			$('#cameras-list').toggle();
			$('#pos-list').hide();
		});

		//---------


		$('#toggle-pos-list').click(function() {
			togglePOSList();
		});


		$(window).on('resize', function() {
			groupsManager.resize();
		});

		$('#cameras-list').droppable({
			greedy: true, 
			drop: function(e) {
			}
		});

		$('#groups-play-pause').click(function() {
			if( groupsManager.rotating ) groupsManager.stopRotate();
			else groupsManager.rotate();
		});
};


var appendToCamerasList = function(cam) {
	var el = $('<div>', {
		id: 'mini-cam-'+cam._id,
		data_id: cam._id,
		class: 'mini-cam mini-cam-active'
	});

	el.html(cam.name || cam.ip);

	el.appendTo('#cameras-list');
	el.draggable({
		helper: 'clone'
	});
};


var posMonitor = new POSMonitor( function(err, instancesArray) {
	if (err || !instancesArray) {
		console.log('could not connect to posmonitor');
		return;
	}

	$('#toggle-pos-list').fadeIn();

	for (var i in instancesArray) {
		var instance = instancesArray[i];
		instance.cameras = [];
		instances[ instance.id ] = instance;
		addPOSToList( instance );
	}

	// TODO: retrieve tcpdump url from API endpoint (to be implemented)
	var socket_1_2 = io_1_2.connect('https://solink:_tcpdump_wrapper_@' + location.hostname + ':3000');


	setTimeout( function() {
		loadState();
	}, 1000);

	socket_1_2.on('data', function(d) {
		if ( !instances[d.id] ) return;
		groupsManager.appendTextToCamera( d.id, d.data );
	});
});
