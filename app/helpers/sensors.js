var request = require('request');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var SensorsInfo = function( options ) {

	options = options || {};

	if (options.development) this.developmentMode = true;

	console.log("sensorsInfo module");
	console.log(options);

	this.sensors = {};
};

util.inherits(SensorsInfo, EventEmitter);

SensorsInfo.prototype.launch = function() {
	
	var self = this;
	this.process = setInterval( function() {
		self.requestNewData();
	}, 2000 );

};


SensorsInfo.prototype.stop = function() {

	clearInterval( this.process );
};


SensorsInfo.prototype.requestNewData = function() {
	
	var self = this;

	var password = process.env['PASSWORD'];
	var user = process.env['USER'];

	var url = 'https://' + user + ':' + password + '@localhost/cp/Sensors?v=2';

	if (self.developmentMode) {
		url = 'https://Administrator:password@192.168.215.108/cp/Sensors?v=2';
	}

	request( url, {
				strictSSL: false,
				timeout:  5000
			}, 
			function (error, response, body) {
				if (!error && response.statusCode == 200) {
					var data = JSON.parse( body );

					self.update( data );
				}
			}
	);
};


SensorsInfo.prototype.update = function( data ) {

	var self = this;

	for ( var i in data ) {	
		var sensorData = data[i];
		this.sensors[sensorData.name] = this.sensors[sensorData.name] || {};
		this.sensors[sensorData.name][sensorData.type] = this.sensors[sensorData.name][sensorData.type] || {};
		this.sensors[sensorData.name][sensorData.type].value = sensorData.value;
	}

	self.emit( 'sensors_data', this.sensors );
};


module.exports = SensorsInfo;


