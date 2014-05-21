var SensorDblite = require('../db_layers/sensor_dblite.js');
var SimpleCache  = require("simple-lru-cache")


function SensorData(sensorFolder, cacheSize) {
	this.folder = sensorFolder;
	if (!SensorData.cache){
		SensorData.cache = new SimpleCache({"maxSize":cacheSize || 10})
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
	var sdb = SensorData.cache.get(dbFilename);
	
	if (!sdb){
		// add to the cache and then call callback
		var sdb = new SensorDblite( dbFilename , function(db){
			SensorData.cache.set(dbFilename, db);
			cb(db);
		});
	}else{
		cb(sdb);
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