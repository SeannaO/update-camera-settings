var SensorDblite = require('../db_layers/sensor_dblite.js');


var isSameDay = function(startDate, endDate){
	console.log(startDate.getUTCFullYear() + " === " + endDate.getUTCFullYear() + " && " + startDate.getMonth() + " === " + endDate.getMonth() + " && " + startDate.getDate() + " === " + endDate.getDate());
	console.log(startDate.getUTCFullYear() === endDate.getUTCFullYear() && startDate.getMonth() === endDate.getMonth() && startDate.getDate() === endDate.getDate());
	return startDate.getUTCFullYear() === endDate.getUTCFullYear() && startDate.getMonth() === endDate.getMonth() && startDate.getDate() === endDate.getDate();
};

var dateFileName = function(dateObj){
	return dateObj.getUTCFullYear() + '-' + (dateObj.getMonth() + 1) + '-' + dateObj.getDate();
};

var aggregateShardedSensorData = function(videosFolder, startDate, endDate, currentDate, sensorType, results, cb){

	if (!currentDate){
		currentDate = startDate;
	}

	if (!results){
		results = [];
	}	

	var dbFile = videosFolder + '/db_sensor_data_' + dateFileName(startDate) + '.sqlite';
	var params = {};
	if (isSameDay(startDate, currentDate)){
		// Just from the start time to the end of the day
		params = {start:startDate.getTime(), type:sensorType};
	}else if (isSameDay(endDate, currentDate)){
		// Just from the start of the day to the endtime
		params = {end:endDate.getTime(), type:sensorType};
	}else{
		// for the whole day
		params = {type:sensorType};
	}

	var sdb = new SensorDblite( dbFile , function(db){
		db.find(params, function(err, data, offset){
			if (err){
				cb(err);
			}else{
				results.concat(data);
				currentDate.setDate(d.getDate() + 1);
				if (currentDate.getTime() > endDate.getTime()){
					cb(null, results);
				}else{
					aggregateShardedSensorData(videosFolder, startDate, endDate, currentDate, sensorType, results, cb);
				}
			}
			
		});
	});
};




module.exports.getSensorData = function(videosFolder, req, res){
	// get the request params
	var cameraId = req.params.camera_id; // camera_id
	// start time
	var startTime = parseInt(req.query.start);
	// end time
	var endTime = parseInt(req.query.end);
	// sensor type (motion)
	var sensorType = req.query.type;

	// A cameraId, startTime and endTime are required
	if (!cameraId || !startTime || !endTime){
		res.json(400, {error: "A valid cameraId as well as a start and end timestamp are required."});
	}

	var startDate = new Date(startTime);
	var endDate = new Date(endTime);

	if (isSameDay(startDate, endDate)){
		// Great, we only need to pull up one db file
		var dbFile = videosFolder + '/' + cameraId + '/sensor/db_sensor_data_' + dateFileName(startDate) + '.sqlite';
		console.log(dbFile);
		var sdb = new SensorDblite( dbFile , function(db){
			db.find({start:startTime,  end:endTime, type:sensorType}, function(err, data, offset){
				if (err){
					console.error(err);
					res.json(400, {error: err});
				}else{
					res.json(200, {cameraId:cameraId, start:startDate.getTime(), end: endDate.getTime(),  data: data});
				}
			});
		});
	}else{
		// Darn, we need to pull up multiple db files and join them together

		var all_data = [];
		
		aggregateShardedSensorData(videosFolder + '/' + cameraId + '/sensor', startDate, endDate, null, sensorType, [], function(err, results){
			if (err){
				res.json(400, {error: err, test: "multiple find"});
			}else{
				res.json(200, {cameraId:cameraId, start:startDate.getTime(), end: endDate.getTime(),  data: results});
			}
		});
	}
};
