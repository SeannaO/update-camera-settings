'use strict';

var calcRetention = function( chunks, startInterval, endInterval ) {

	var start = 0,
		end = 0,
		gaps = 0,
		nGaps = 0,
		nChunks = 0;


	if ( !chunks || !chunks.length) {
		return {
			start:                    startInterval,
			end:                      endInterval,
			nChunks:                  0,
			nGaps:                    0,
			earliestChunkInInterval:  0,
			totalRecordedLength_ms:   0,
			totalRetentionRatio:      0,
			partialRetentionRatio:    0
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
			if (gap >= 1000) { 
				gaps += gap; 
				nGaps++;
			}
		}
		end = parseInt( c.end );
	}

	startInterval = startInterval ? startInterval : start;
	endInterval   = endInterval ? endInterval : end;

	var startGap = start > startInterval ? (start - startInterval) : 0;
	var endGap   = end < endInterval ? (endInterval - end) : 0;

	gaps = gaps + startGap + endGap;

	var intervalLength        = endInterval - startInterval;
	var totalLength           = intervalLength - gaps;
	var partialIntervalLength = intervalLength - startGap;

	return {
		start:                    startInterval,
		end:                      endInterval,
		nChunks:                  nChunks,
		nGaps:                    nGaps,
		earliestChunkInInterval:  start,
		totalRecordedLength_ms:   totalLength,
		totalRetentionRatio:      intervalLength ? ( totalLength / intervalLength ).toFixed(2) : 0,
		partialRetentionRatio:    partialIntervalLength ? ( totalLength / partialIntervalLength ).toFixed(2) : 0
	};

};


exports.calcRetention = calcRetention;
