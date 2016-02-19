'use strict';

var vms_launch_time = Date.now(),
	rtsp_launch_time;

exports.setVMSLaunchTime = function( t ) {
	vms_launch_time = t;
};

exports.setRtspLaunchTime = function( t ) {
	rtsp_launch_time = t;
};

exports.getLaunchTime = function() {
	return  {
		vms:           vms_launch_time,
		rtsp_grabber:  rtsp_launch_time
	}
};

exports.getUptime = function() {

	var d = Date.now();

	var rtsp_grabber_uptime = rtsp_launch_time ? ( d - rtsp_launch_time ) : 0;

	return {
		vms:           d - vms_launch_time,
		rtsp_grabber:  rtsp_grabber_uptime
	}
};
