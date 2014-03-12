function TimelineSelector( el ) {

	this.el = $('<div>', {
		class: 'timeline-selected-region'		
	}).appendTo(el);

	console.log(el);

	this.leftMarker = $('<div>', {
		class: 'timeline-marker'
	}).appendTo(el);

	this.rightMarker = $('<div>', {
		class: 'timeline-marker'
	}).appendTo(el);

	this.left = 0;
	this.right = 0;

	this.setRight( 0 );
	this.setLeft( 0 );	

	this.leadingMarker = 1;
};


TimelineSelector.prototype.setBounds = function( pos ) {
	if (pos > this.right) {
		this.leadingMarker = 1;
	} else if (pos < this.left) {
		this.leadingMarker = -1;
	}
	
	if (this.leadingMarker === 1) {
		this.setRight( pos );
	} else {
		this.setLeft( pos );
	}
};

TimelineSelector.prototype.setLeft = function(left) {
	this.left = left;
	this.leftMarker.css('left', left + 'px');
	this.el.css('left', left + 'px');
	this.el.css('width', (this.right - this.left) + 'px' );
};


TimelineSelector.prototype.setRight = function(right) {
	this.right = right;
	this.rightMarker.css('left', right + 'px');
	this.el.css('width', (this.right - this.left) + 'px' );
};


