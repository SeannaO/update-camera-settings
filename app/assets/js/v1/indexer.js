function Indexer() {

	this.elements = [];
};


Indexer.prototype.push = function( data ) {

	var self = this;
	var i = self.elements.length;
	var totalTime = 0;

	var mostRecent = i > 0 ? self.elements[ i - 1 ] : {start: -1, totalTime: 0, duration: 0}; 	

	while( data.start < mostRecent.start ) {
		i--;
		mostRecent = self.elements[i];	
	}

	var duration = parseInt( mostRecent.end ) - parseInt(mostRecent.start);
	var totalTime = mostRecent.totalTime + duration/1000.0 || 0;
	data.totalTime = totalTime;	

	self.elements.splice(i, 0, data);
};


Indexer.prototype.agglutinate = function( size ) {
	
	var self = this;
	var agglutinated = [];		
	
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
		agglutinated.push( agg_el );
	}

	return agglutinated;
}

Indexer.prototype.getAbsoluteTime = function( relative_time, begin, end ) {
	
	var self = this;
	if ( isNaN(begin) || isNaN(end) ) {
		begin = 0;
		end = self.elements.length-1;
		return self.getAbsoluteTime( relative_time, begin, end );
	} else if (end - begin <= 1) {
		var el = self.elements[begin];
		var offset = parseInt(relative_time) - parseInt(el.totalTime);
		return parseInt(el.start) + offset;
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

Indexer.prototype.clear = function() {
	this.elements = [];
}
