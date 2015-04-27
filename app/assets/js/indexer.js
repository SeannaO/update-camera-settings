function Indexer() {

	this.elements = [];
	this.agglutinated = null;
	this.agglutinatedBy;

	this.groups = [];
};

Indexer.prototype.includesInterval = function( begin, end ) {
	
}

Indexer.prototype.push = function( data ) {

	var self = this;
	var i = self.elements.length;
	var totalTime = 0;

	var mostRecent = i > 0 ? self.elements[ i - 1 ] : {start: -1, end: 1, totalTime: 0, duration: 0}; 	

	while( data.start < mostRecent.start ) {
		i--;
		mostRecent = self.elements[i];	
	}

	var duration = parseInt( mostRecent.end ) - parseInt(mostRecent.start);
	var totalTime = mostRecent.totalTime + duration/1000.0 || 0;
	data.totalTime = totalTime;	

	self.elements.splice(i, 0, data);

	this.addToGroups( data );
};


Indexer.prototype.addToGroups = function(d) {

	d.start = parseInt( d.start );
	d.end = parseInt( d.end );

	for (var i in this.groups) {

		var g = this.groups[i];

		if (d.start >= g.start 
			&& d.start <= g.end + 1000
			&& d.end > g.end ) {
				this.groups[i].end = d.end;
				return;
			}
	}

	this.groups.push({
		start:  d.start,
		end:    d.end
	});
};


Indexer.prototype.agglutinate = function( size ) {
	
	var self = this;
	
	if (self.agglutinated && self.agglutinatedBy == size) {
		console.log('returning cached agglutination');
		return self.agglutinated;
	}

	self.agglutinated = [];

	for( var i = 0; i < self.elements.length; ) { //in self.elements ) {
		var el = self.elements[i];
		var agg_el = {};
		var k = 0;

		agg_el.start     = self.elements[i].start;
		agg_el.end       = self.elements[i].end;
		agg_el.totalTime = self.elements[i].totalTime;
		agg_el.thumb     = self.elements[i].start + '_' + ( self.elements[i].end - self.elements[i].start );

		done = false;

		while( i + k < self.elements.length && k < size && !done) {
			done = (self.elements[i].start - agg_el.end > 5000); 
			if( done ) break;
			agg_el.end = self.elements[i].end;
			k++;
			i++;

		}
		self.agglutinated.push( agg_el );
	}

	self.agglutinatedBy = size;
	return self.agglutinated;
};
////


////
// convert player time to unix time in millis
Indexer.prototype.getAbsoluteTime = function( relative_time, begin, end ) {
	
	var self = this;

	if (self.elements.length == 0) return;

	if ( isNaN(begin) || isNaN(end) ) {
		begin = 0;
		end = self.elements.length-1;
		return self.getAbsoluteTime( relative_time, begin, end );
	} else if (end - begin <= 1) {
		var el = self.elements[begin];
		var offset = parseInt(relative_time) - parseInt(el.totalTime);
		return parseInt(el.start) + offset*1000;
	} else {
		var middle = Math.floor( (end + begin)/2 );
		if ( relative_time > self.elements[middle].totalTime ) {
			begin = middle;
		} else {
			end = middle;	
		}
		return self.getAbsoluteTime( relative_time, begin, end );
	}
}
////

////
// convert unix time in millis to player time
Indexer.prototype.getRelativeTime = function( absoluteTime, options ) {

	var a = 0,
		b = this.elements.length-1;

	var el,
		i;

	while( a <= b ) {
		i = Math.floor( (a + b)/2 )
		el = this.elements[ i ];
		if (!el) return;
		if (el.end >= absoluteTime - 500 && el.start <= absoluteTime + 500) {
			if (options.returnElement) return el;
			return (absoluteTime - el.start)/1000.0 + el.totalTime;
		}
		else if (el.end < absoluteTime) {
			a = i+1;
		} else {
			b = i-1;
		}
	}

	if (!el) return;

	if ( absoluteTime > el.end || absoluteTime < el.start) {
		return;
	}

	if (options.returnElement) return el;
	return( (absoluteTime - el.start)/1000.0 + el.totalTime )
};
////
//

Indexer.prototype.clear = function() {
	this.groups         = [];
	this.elements       = [];
	this.agglutinated   = null;
};
