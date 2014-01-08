var getStreamsInfo = function(camId) {

	console.log('get streams');

	$.ajax({
		url: '/cameras/' + camId + '/json',
		success: function(data) {
			console.log(data.camera);
			if (!data.camera.streams) {
				return;
			} else {
				populateStreamSelector( data.camera.streams );	
			}
		},
		error: function(err) {
			console.log( err );
		}
	});
};


var populateStreamSelector = function(streams) {
	
	
	for (var s in streams) {
		var text = ( streams[s].name || '' ) + ' - ' + streams[s].resolution;
		$('#stream-selector')
          .append($('<option>', { value: streams[s].id })
          .text( text ));		
	}
};

var getRtsp = function() {
	return('#stream-selector').val();	
};
