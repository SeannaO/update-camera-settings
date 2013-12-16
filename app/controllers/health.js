// - - - - -
// health check modules
module.exports = function(io) {
	
	var Iostat = require('../helpers/iostat.js');
	var iostat = new Iostat();
	iostat.launch();

	var Smart = require('../helpers/smart.js');
	var smart = new Smart({development: true});
	smart.start();

	var Diskstat = require('../helpers/diskstat.js');
	var diskstat = new Diskstat({development: true});
	diskstat.launch();

	var SensorsInfo = require('../helpers/sensors.js');
	var sensorsInfo = new SensorsInfo({development: true});
	sensorsInfo.launch();

	// broadcasts
	iostat.on('cpu_load', function(data) {
		io.sockets.emit('cpu_load', data);
	});

	smart.on('smart', function(data) {
		io.sockets.emit('smart', data);
	});

	diskstat.on('hdd_throughput', function(data) {
		io.sockets.emit('hdd_throughput', data);
	});

	sensorsInfo.on('sensors_data', function(data) {
		io.sockets.emit('sensorsData', data);
	});
	//
};
// - - -
