var addOverlayToPage = function( msg ) {
	
	msg = msg || '';

	var msgDiv = $('<div>', {
		id: 'overlay-message',
		class: 'spinner',
		html: msg + '<br><br><div class="bounce1"></div><div class="bounce2"></div><div class="bounce3"></div>',
		style: 'font-size: 20pt; color: rgba(100,100,100,0.8); width: 100%; margin-top:20%'
	});

	var overlay = $('<div>', {
		id: 'camera-window-overlay',
		style: 'position: fixed; width: 100%; height: 100%; background: rgba(220,220,220,0.8); z-index:10000; top:0px; left:0px; display:none'
	});

	msgDiv.appendTo(overlay);
	overlay.appendTo('body').fadeIn();
};


var setOverlayMessage = function(msg) {
	
	if (! $('#overlay-message') ) return;

	$('#overlay-message').html( msg + '<br><br><div class="bounce1"></div><div class="bounce2"></div><div class="bounce3"></div>' );
};


var removeOverlayFromPage = function( cb ) {
	var overlay = $('#camera-window-overlay');
	if (!overlay) return;

	overlay.fadeOut(function() {
		overlay.remove();
		if (cb) cb();
	});
};

