var Preview = function( el ) {

	this.el = el;
	this.cancelled = false;
	
	$(this.el).empty();

	this.id = Math.random()*10;
};


Preview.prototype.showMarker = function() {
	$('#preview-marker').show();
	$('#preview-marker').css('left', 0);
};


Preview.prototype.cancel = function() {
	this.cancelled = true;
};

Preview.prototype.displayFrame = function( url ) {
	
	$('img', '#preview-frame' ).attr('src', url);

};


Preview.prototype.isCancelled = function() {
	return this.cancelled;
};


Preview.prototype.loadImage = function( d, cb ) {

	var self = this;

	var img = new Image();

	img.src = d.url;

	var px;

	img.onload = function() {

		px = 100.0 * d.offset / self.totalTime;

		var seg = $('<div>', {
			class: 'prev-segment',
		});
		seg.css('left', px + '%');
		seg.css('width', self.segmentWidth + '%');

		// seg.appendTo('#preview');

		seg.on('mouseenter', function() {
			// self.displayFrame( d.url );
			// $(img).css('width', '30px');
			// $(img).css('opacity', 0.9);
		});
		seg.on('mouseover', function() {
			// self.displayFrame( d.url );
			// $(img).css('width', '30px');
			// $(img).css('opacity', 0.9);
		});
		seg.on('mouseleave', function() {
			// $(img).css('width', '2px');
			// $(img).css('opacity', 0.1);
		});

		seg.on('click', function() {
			$('#preview-frame').stop().fadeOut();
			camPage.player.play();
			$(window).trigger('jumpTo', {
				time: d.relative_time
			});
		});

		$(img).attr('data-url', d.url);
		$(img).attr('data-relative-time', d.relative_time);

		$(img).attr('data-start', d.start);

		$(img).addClass('mini-prev');
		$('#preview').append(img);
		// $(img).css('left', px + '%');
		// $(img).css('width', self.segmentWidth + '%');
		$(img).css('height', '10px');
		// $(img).css('height', 15px);
		$(img).css('opacity', 0.5);
		$(img).attr('data-order', d.order);

		$(img).attr('data-px', px);

		if (cb) cb();
	};

	img.onerror = function() {
		if (cb) cb();
	};

	$(img).on('mouseover', function(ev, el) {
		// self.displayFrame( d.url );
		$('#ghost-cursor').css('left', px + '%');
		var time = d.start;
		if (!!time) {
			time = parseInt( time );
			time = moment( time ).format( 'HH:MM:ss' );
			$('#ghost-cursor-time').html(time);
		}
	});

	$(img).on('mouseleave', function(ev, el) {
		// self.displayFrame( d.url );
		// $('#ghost-cursor').css('left', px + '%');
	});

	$(img).on('click', function() {
		$('#preview-frame').stop().fadeOut();
		camPage.player.play();
		$(window).trigger('jumpTo', {
			time: d.relative_time
		});
		var x = $(this).position().left;
		$('#preview-marker').css('left', x);
	});
};


Preview.prototype.loadImages = function( images ) {


	var self = this;

	if ( this.isCancelled() ) {
		return;
	}

	if (!images || !images.length) return;

	var img = images.shift();

	if (!img) return;

	this.loadImage(img, function() {
		self.loadImages( images );
	});
};


Preview.prototype.listImages = function( data, camId, streamId, k0, k1 ) {

	if (!data || !data.length) return;

	var images = [];

	var step = Math.ceil( (k1-k0) / 30 ) || 1;
	var order = 0;

	for( var i = k0; i <= k1; i+=step ) {

		if (!data[i]) continue;

		var thumb_name = data[i].start + '_' + (data[i].end -data[i].start);
		var thumb = "/cameras/" + camId + "/streams/" + streamId + "/thumb/" + thumb_name;
		images.push({
			url:            thumb,
			offset:         data[i].start - this.begin,
			relative_time:  data[i].totalTime,
			order:          order++,
			start: 			data[i].start,
			end: 			data[i].end
		});
	}

	return images;
};


Preview.prototype.load = function( segments, begin, end ) {

	if (!segments || !segments.length) return;

	var interval = this.trimData( segments, begin, end );
	this.begin = begin;

	var images = this.listImages( 
			camPage.timeline.indexer.elements,
			camPage.camId,
			camPage.streamId,
			interval[0],
			interval[1]
	);

	// var w = 100 / images.length;
	this.amplitude = segments[interval[1]].end - segments[interval[0]].start;
	this.offset = segments[ interval[0] ].start - begin;
	this.totalTime = end - begin;
	this.segmentWidth = 100 * ( 1 / images.length ) * ( this.amplitude / this.totalTime );
	this.loadImages( images );
};


Preview.prototype.trimData = function(data, begin, end) {

	if(!data) return;
	var a = 0;
	var b = data.length - 1;

	while(a < b) {

		var k = Math.floor( (a + b)/2 );
		if (data[k].start < begin) {
			a = k+1;
		} else {
			b = k;
		}
	}

	var k0 = a;

	a = 0;
	b = data.length - 1;
	while (a < b) {
		var k = Math.ceil( (a + b)/2 );
		if (data[k].start > end) {
			b = k-1;
		} else {
			a = k;
		}
	}

	var k1 = b;

	var interval = [0,0];

	interval[0] = k0 < k1 ? k0 : k1;
	interval[1] = k0 > k1 ? k0 : k1;

	return interval;
};

Preview.prototype.toggleGhost = function() {
	
	if (!this.ghostMode) {
		$('#preview-frame').css('opacity', 0.6);
		$('#ghost-button').css('background', 'rgba(66, 139, 202, 0.8)');
		this.ghostMode = true;
	} else {
		$('#preview-frame').css('opacity', 1.0);
		$('#ghost-button').css('background', 'none');
		this.ghostMode = false;
	}
};

