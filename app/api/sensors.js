var SensorData = require('../models/sensor_model.js');

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


	var oneDay = 1000*60*60*24;

	if (endDate - startDate > 2*oneDay) {
		console.error('[SensorData]  ignoring request for more than 2 days of data');
		res.json(400, {error: 'requesting too much data: more than 2 days'});
		return;
	}

	var db_path = videosFolder + '/' + cameraId + '/sensor';

	var sensor_data = new SensorData(db_path, 10);


	sensor_data.find({start:startDate,  end:endDate, type:sensorType}, function(err, results){
		if (err){
			res.json(400, {error: err});
		}else{
			res.json(200, {cameraId:cameraId, start:startDate.getTime(), end: endDate.getTime(),  data: results});
		}
	});
};
