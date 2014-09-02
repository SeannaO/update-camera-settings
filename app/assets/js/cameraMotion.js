var CameraMotion = function() {

	var self = this;

	this.camera = {};
	this.player = new Player('#video');
	this.setupGrid();

	$('#camera-motion-dialog').on('hidden.bs.modal', function() {
		self.close();
	});

	$('#camera-motion-threshold').slider({
		min: 1,
		max: 255,
		step: 1
	});

	$('#camera-motion-threshold').on('slide', function(d) {
		$('#threshold-value').html(d.value);
		self.camera.motionParams.threshold = d.value;
		self.flagChanges();
	});

	$('#camera-motion-enable').on('change', function() {
		self.flagChanges();	
	});

	self.socket = io.connect('/motion_grid');
};


CameraMotion.prototype.close = function() {
	this.socket.removeAllListeners();
};


CameraMotion.prototype.flagChanges = function() {
	
	this.changed = true;
	$('#changes-notification').fadeIn();
	$('#update-motion').fadeIn();
};

CameraMotion.prototype.unflagChanges = function() {
	
	$('#changes-notification').fadeOut();
	$('#update-motion').fadeOut();
	this.changed = false;
};


CameraMotion.prototype.launch = function( camId ) {

	var self = this;

	self.frames = [];
	self.index = 0;
	self.changed = false;


	self.loadCameraParams( camId, function(err) {
		if (err) {
			return;
		}
		self.unflagChanges();
		self.openWindow();
		self.setupSocket();
		self.unflagChanges();
	});
};


CameraMotion.prototype.updateMotion = function( cb ) {

	var self = this;

	var params = $('#camera-motion').serializeObject();
	params.camera.motion.roi = self.getROI();
	params.camera.motion.threshold = self.camera.motionParams.threshold;

    $.ajax({
        type: "PUT",
        url: "/cameras/" + self.camera._id + "/motion",
        data: JSON.stringify( params ),
		dataType: "json",
        contentType: 'application/json',
        success: function(data) {
			if (data && data.responseText) {
				// data = $.parseJSON(data.responseText);
			}
            cb( data );
        },
		error: function(data) {
			if (data && data.responseText) {
				// data = $.parseJSON(data.responseText);
			}
			cb( data );
		}
    });
}


CameraMotion.prototype.loadCameraParams = function( camId, cb ) {

	var self = this;

    $.ajax({
        type: "GET",
        url: "/cameras/" + camId + "/json",
        contentType: 'application/json',
        success: function(data) {
            if (data.success) {
				self.camera = data.camera;
				cb();
            } else {
				cb('could not load camera');
            }
		},
		error: function( data ) {
			cb( data );
		}
    });
};


CameraMotion.prototype.setupCell = function( cellId ) {

	var self = this;

	var cell = $('<div>', {
		id: 'cell-' + cellId
	});
	cell.attr('style', 
			'width: '+ self.cell_w + 'px; height: ' + self.cell_h + 'px; float:left');
	cell.attr('data-id', cellId);
	cell.attr('data-selected', 0);
	$("#grid").append(cell);
	cell.click( function(ev, el) {
		var cellId = $(this).attr('data-id');
		var selected = $(this).attr('data-selected');
		if (selected != 1) {
			self.selectCell( cellId );
		} else {
			self.unselectCell( cellId );
		}
		self.flagChanges();
	});
};


CameraMotion.prototype.clearGrid = function() {

	for (var i = 0; i < 10; i++) {
		for (var j = 0; j < 10; j++) {
			var cellId = i*10 + j;
			this.unselectCell( cellId );
		}
	}

	this.flagChanges();
};

CameraMotion.prototype.allGrid = function() {
	for (var i = 0; i < 10; i++) {
		for (var j = 0; j < 10; j++) {
			var cellId = i*10 + j;

			this.selectCell(cellId);
		}
	}

	this.flagChanges();
};

CameraMotion.prototype.selectCell = function( id ) {

	var cell = $('#cell-'+ id);

	$(cell).attr('data-selected', 1);
	$(cell).css('border','solid');
	$(cell).css('border-color','rgba(0,200,0,0.7)');
	$(cell).css('border-width','1px');
	$(cell).css('background', 'rgba(0,200,0,0.3)');
};

CameraMotion.prototype.unselectCell = function( id ) {

	var cell = $('#cell-'+ id);

	$(cell).attr('data-selected', 0);
	$(cell).css('border','solid');
	$(cell).css('border-color','rgba(200,200,200,0.2)');
	$(cell).css('border-width','1px');
	$(cell).css('background', 'rgba(0,0,0,0.3)');
};

CameraMotion.prototype.setupSocket = function() { 

	var self = this;

	self.socketListenerId = self.socket.on('grid', function(data) {
		if (data.cam_id !== self.camera._id) {
			return;
		}

		var gridString = data.grid;

		self.frames.push({
			index: self.index++,
			time: Date.now(),
			grid: gridString
		});
		var dt = Date.now() - self.frames[0].time;

		// 3800ms for the flash player
		// 700 for the native player
		if ( dt > 3000 ) {

			var frame = self.frames.shift();

			for (var i in frame.grid) {
				var val = frame.grid.charCodeAt(i); 
				// var alpha = 0.5 - 0.3*val/255.0;
				var selected = $('#cell-'+i).attr('data-selected');
				if (val > 5) {
					val = 20*255 * val / 100.0;	
					$('#cell-'+i).css('background', 'rgba('+val+','+val+',0,0.3)');
				} else if (selected == '1'){
					$('#cell-'+i).css('background', 'rgba(0,200,0,0.2)');
				} else {

					$('#cell-'+i).css('background', 'rgba(0,0,0,0.3)');
				}
			}
		} 			
	});
};


CameraMotion.prototype.drawROI = function() {

	var self = this;
	var roi = self.camera.motionParams.roi;

	for (var i = 0; i < 10; i++) {
		for (var j = 0; j < 10; j++) {
			var cellId = i*10 + j;
			if (roi == 'all' || roi[cellId] == '1') { 
				self.selectCell(cellId);
			} else {
				self.unselectCell(cellId);
			}
		}
	}
};


CameraMotion.prototype.setupGrid = function() { 

	var self = this;

	var grid_x = $("#video").position().left;
	var grid_y = $("#video").position().top;
	var grid_w = $("#video").width();
	var grid_h = $("#video").height();

	self.cell_w = grid_w/10.0;
	self.cell_h = grid_h/10.0;

	grid_y = 121;

	$("#grid").css('position', 'absolute');
	$("#grid").css('left', 'auto');
	// $("#grid").css('left', grid_x + 'px');
	$("#grid").css('top', grid_y + 'px');
	$("#grid").css('width', grid_w + 'px');
	$("#grid").css('height', grid_h + 'px');
	$("#grid").css('margin', '20px');
	$("#grid").css('position', 'absolute');

	for (var i = 0; i < 10; i++) {
		for (var j = 0; j < 10; j++) {
			self.setupCell( i*10 + j );
		}
	}

};

CameraMotion.prototype.getROI = function() {

	var roiString = '';

	for (var i = 0; i < 10; i++) {
		for (var j = 0; j < 10; j++) {
			var cell = $('#cell-' + (i*10 + j));
			var selected = cell.attr('data-selected');
			roiString = roiString + selected; 	
		}
	}

	return roiString
};


CameraMotion.prototype.openWindow = function() {

	var self = this;

	$('#camera-motion-enable').prop('checked', self.camera.motionParams.enabled == "1").change( function() {

		if ( $(this).is(':checked') ) {
			$('#camera-motion-dialog .form-control').prop('disabled', false);
			self.camera.motionParams.enabled = 1;
		} else {
			$('#camera-motion-dialog .form-control').prop('disabled', true);
			self.camera.motionParams.enabled = 0;
		}
		
	});
	var val = self.camera.motionParams.threshold;
	val = isNaN(val) ? 0 : parseInt(val);

	$('#camera-motion-threshold').slider('setValue', val, false);
	$('#camera-motion-threshold').val(val);
	$('#camera-motion-sensitivity').val(self.camera.motionParams.sensitivity);

	$("#update-motion").unbind();
	$("#update-motion").click( function() {

		addOverlayToPage('updating motion...');

		self.updateMotion( function(data) {

			if (data.success) {
				self.unflagChanges();
				removeOverlayFromPage( function() {
					// location.reload();
					toastr.success("Motion configuration successfully updated");
					$('#motion-status-'+self.camera._id).removeClass('gray red green');
					var motionStatus = self.camera.motionParams.enabled ? 'green' : 'red';
					console.log(motionStatus);
					$('#motion-status-'+self.camera._id).addClass(motionStatus);
				});
			} else {
				removeOverlayFromPage( function() {
					$('#camera-motion-enable').prop('checked', false);
					toastr.error(data.error);
				});
			}
		});
	});
	$("#camera-motion-dialog").modal('show');



	self.drawROI();
	self.player.playVideo( self.camera._id, self.camera.streams[0].id );

};


