'use strict';

/**
 * Calculate retention stats given a list of chunks and a time interval
 *
 * @param { chunks } Array  list of chunks
 * 		- each element in the array must contain: 'start', 'end'
 * 		- if empty or undefined, zeroed stats will be returned
 *
 * @param { startInterval } Number  start time (unix ms)
 * 		- if zero or undefined, the start time of the first chunk in the interval will be used
 *
 * @param { endInterval } Number  end time (unix ms)
 * 		- if zero or undefined, the end time of the last chunk in the interval will be used
 *
 * @return{ Object } calculated stats (times in ms, unix)
 * 		- start, end: time interval (see notes above)
 * 		- nChunks: number of chunks in interval
 * 		- nGaps: number of gaps between chunks in interval
 * 		- earliestChunkInInterval: start time of the first chunk in the interval
 * 		- totalRecordedLength_ms: self explained
 * 		- totalRetentionRatio: ratio between recorded and interval lengths
 * 		- partialIntervalLength: ratio between recorded and partial interval lengths (interval starting on the first segment in interval)
 */
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
