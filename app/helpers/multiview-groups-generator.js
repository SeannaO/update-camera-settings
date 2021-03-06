'use strict';

/* * *
 * autogenerate multiview groups given a list of cameras
 */

var MAX_CAMERAS_PER_GROUP = 4,
	MAX_GROUPS = 5;


var MultiviewCameraGroups = function( cameras ) {

	this.groups = [];
	this.currentGroup = this.newEmptyGroup();
	this.groups.push( this.currentGroup );

	if (cameras) { 
		this.loadCameras( cameras ); 
	}

	return this.groups;
};


MultiviewCameraGroups.prototype.loadCameras = function( cameras ) {

    for (var i in cameras) {

        var done = false;

        var c = cameras[i];
        if (!c || !c.streams || !c.streams.length) { continue; }

        for (var k in c.spotMonitorStreams) {
            var s = c.spotMonitorStreams[k];
            if (s.url) {
                this.add( c._id, s.id );
                done = true;
                break;
            }
        }

        if (done) { continue; }

        for (var k in c.streams) {
            var s = c.streams[k];
            if (s.url) {
                this.add( c._id, s.id );
                break;
            }
        }
    }
};


MultiviewCameraGroups.prototype.add = function( cam_id, stream_id ) {

	if( this.currentGroup.cameras.length >= MAX_CAMERAS_PER_GROUP ) {
		if ( this.groups.length >= MAX_GROUPS ) { return; }

		this.currentGroup = this.newEmptyGroup();
		this.groups.push( this.currentGroup );
	}

	this.currentGroup.cameras.push({
		id:         cam_id,
		stream_id:  stream_id
	});
};


MultiviewCameraGroups.prototype.newEmptyGroup = function() {
		return {
			group:    this.groups.length,
			cameras:  [],
			autogenerated: true
		}
};


MultiviewCameraGroups.prototype.getGroups = function() {
	return this.groups;
};


module.exports = MultiviewCameraGroups;
