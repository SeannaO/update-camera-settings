'use strict';

var calcRetention = function( chunks, startInterval, endInterval ) {

	var start,
		end,
		gaps = 0,
		nChunks = 0;


	if ( !chunks || !chunks.length) {
		return {
			start:                   new Date(startInterval),
			end:                     new Date(endInterval),
			nChunks:                 0,
			totalGapsLength_ms:      0,
			intervalLength_ms: 		 endInterval - startInterval,
			totalRecordedLength_ms:  0,
			retention:               0
		}
	}

	for (var i in chunks) {

		var c = chunks[i];

		nChunks++;

		if (!start) {
			start = parseInt(c.start);
		}
		else {
			var gap = c.start - end;
			gap = gap < 0 ? 0 : gap;
			if (gap >= 1000) { gaps += gap; }
		}
		end = parseInt( c.end );
	}

	startInterval = startInterval ? startInterval : start;
	endInterval   = endInterval ? endInterval : end;

	var startGap = start > startInterval ? (start - startInterval) : 0;
	var endGap =  end < endInterval ? (endInterval - end) : 0;

	gaps = gaps + startGap + endGap;

	var intervalLength = endInterval - startInterval;
	var totalLength = intervalLength - gaps;

	var report = {
		start:                   new Date(startInterval),
		end:                     new Date(endInterval),
		nChunks:                 nChunks,
		totalGapsLength_ms:      gaps,
		intervalLength_ms:       intervalLength,
		totalRecordedLength_ms:  totalLength,
		retention:               totalLength / intervalLength
	};

	return report;
};


exports.calcRetention = calcRetention;
