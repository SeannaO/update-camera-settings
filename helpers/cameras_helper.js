var CamerasHelper = function( camerasController ) {
    this.camerasController = camerasController;
    console.log("---");
    console.log(this.camerasController);
    console.log("---");
};

CamerasHelper.prototype.startRecording = function(req, res) {
    var camId = req.params.id;
    
    this.camerasController.startRecording( camId, function(err) {
        if ( err ) {
            res.json({ success: false, error: err });
        } else {
            res.json({ success: true });
        }
    });
};

CamerasHelper.prototype.stopRecording = function( req, res ) {
    var camId = req.params.id;

    this.camerasController.stopRecording( camId, function(err) {
        if (err || cam.length === 0) {
            res.json({ success: false, error: err });
        } else {
            res.json({ success: true });
        }
    });
};

module.exports = CamerasHelper;


