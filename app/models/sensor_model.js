var SensorDblite = require('../db_layers/sensor_dblite.js');

function SensorData(sensorFolder, cacheSize) {
	this.folder = sensorFolder;

	SensorData.maxSize = 20; // maybe 30?

	if (!SensorData.cache) {
		SensorData.cache = {};
	}
	if (!SensorData.checkCacheInterval) {
		SensorData.checkCacheInterval = setInterval( function() {
			SensorData.checkCache()
		}, 30*1000); // check every 30s
	}
};


SensorData.checkCache = function() {
	// console.log('checking cache');
	// console.log( "cache size: " + Object.keys( SensorData.cache ).length );
	var maxAge = 30*60*1000; // will close after 30 min
	for (var i in SensorData.cache) {
		if ( Date.now() - SensorData.cache[i].time > maxAge ) {
			(function(i){
				SensorData.cache[i].db.close( function() {
					delete SensorData.cache[i];
				});
			})(i); 
		}
	}
};

SensorData.prototype.find = function(options, cb) {

	this._aggregateShardedSensorData(options, null, [], function(err, results){
		cb(err, results);
	});
};

SensorData.prototype.insert = function(data, cb) {
	var self = this;
	var d = new Date(data.timestamp);
	var dbFile = self.folder + '/' + self._dbFileName(d);

	SensorData._getDbFile(dbFile, function(sdb){
		sdb.insert(data);
		if(cb) cb();
	});
};

SensorData.prototype._dbFileName = function(startTime) {
	return 'db_sensor_data_' + SensorData.dateFileName(startTime) + '.sqlite';
};


SensorData.prototype._aggregateShardedSensorData = function( options, currentDate, results, cb){

	var oneDay = 1000*60*60*24;

	if (options.end - options.start > 2*oneDay) {
		console.error('[SensorData]  ignoring request for more than 2 days of data');
		cb('requesting too much data: more than 2 days');
		return;
	}

	var self = this;
	if (!currentDate){
		currentDate = new Date(options.start.getTime());
	}

	if (!results){
		results = [];
	}	

	var dbFile = self.folder + '/' + self._dbFileName(currentDate);

	var params = {};

	if (SensorData.isSameDay(options.start, options.end)){
		params = {start:options.start.getTime(), end:options.end.getTime()};
	}else if (SensorData.isSameDay(options.start, currentDate)){
		// Just from the start time to the end of the day
		params = {start:options.start.getTime()};
	}else if (SensorData.isSameDay(options.end, currentDate)){
		// Just from the start of the day to the endtime
		params = {end:options.end.getTime()};
	}

	if (options.type){
		// for the whole day
		params.type = options.type;
	}
	SensorData._getDbFile( dbFile , function(db){
		db.find(params, function(err, data, offset){
			if (err){
				cb(err);
			}else{
				results = results.concat(data);
				if (SensorData.isSameDay(options.end, currentDate)){
					cb(null, results);
				}else{
					currentDate.setDate(currentDate.getDate() + 1);
					self._aggregateShardedSensorData(options, currentDate, results, cb);
				}
			}
		});
	});
};


SensorData.cache = null;

SensorData._getDbFile = function( dbFilename, cb ) {
	//check to see if it is in cache
	var sdb = SensorData.cache[dbFilename];

	if (!sdb){
		// add to the cache and then call callback
		if (Object.keys( SensorData.cache ).length > SensorData.maxSize) {
			// console.error('exceeded max number of objects in cache');
			var oldest;
			var oldest_i;
			for (var i in SensorData.cache) {

				if (!oldest) {
					oldest = SensorData.cache[i];
					oldest_i = i;
				} else if (SensorData.cache[i].time < oldest.time) {
					oldest = SensorData.cache[i];
					oldest_i = i;
				}
			}
			if ( SensorData.cache[oldest_i] && SensorData.cache[oldest_i].db ) {
				SensorData.cache[oldest_i].db.close( function() {
					delete SensorData.cache[oldest_i];
					// console.error( "deleting cache: " + Object.keys( SensorData.cache ).length );
				});
			}
		}

		var sdb = new SensorDblite( dbFilename , function(db){
			SensorData.cache[dbFilename] = {
				db: db,
				time: Date.now()
			}
			// console.error( "adding cache: " + dbFilename );
			cb(db);
		});
	}else{
		SensorData.cache[dbFilename].time = Date.now();
		cb(sdb.db);
	}
};


SensorData.isSameDay = function(startDate, endDate){
	//console.log(startDate.getUTCFullYear() + " === " + endDate.getUTCFullYear() + " && " + startDate.getMonth() + " === " + endDate.getMonth() + " && " + startDate.getDate() + " === " + endDate.getDate());
	//console.log(startDate.getUTCFullYear() === endDate.getUTCFullYear() && startDate.getMonth() === endDate.getMonth() && startDate.getDate() === endDate.getDate());
	return startDate.getUTCFullYear() === endDate.getUTCFullYear() && startDate.getMonth() === endDate.getMonth() && startDate.getDate() === endDate.getDate();
};

SensorData.dateFileName = function(dateObj){
	return dateObj.getUTCFullYear() + '-' + (dateObj.getMonth() + 1) + '-' + dateObj.getDate();
};


module.exports = SensorData;
