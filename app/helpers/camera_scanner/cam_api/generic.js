var Generic = function() {
};


Generic.prototype.checkForExistingProfile = function( profileName, cb ) {
};


Generic.prototype.isProfileH264 = function( profileId, cb ){

};


Generic.prototype.updateProfile = function(profileId, profile, cb) {

};


Generic.prototype.getRtspUrl = function ( profile ) {

	return profile.suggested_url;
};


Generic.prototype.getResolutionOptions = function() {

};

Generic.prototype.setCameraParams = function(params) {
	

};


Generic.prototype.setMotionParams = function(params){


};


Generic.prototype.setupMotionDetection = function(cam){
	// start tcp server if not already started
	// on camera
	// enable motion
	// create a recipient
	// create a notifier
};


Generic.prototype.startListeningForMotionDetection = function(cam, cb){
	//poll
	//emit motion
};


Generic.prototype.stopListeningForMotionDetection = function(){
	//poll
	//emit motion
};


module.exports = Generic;






