function setup( app, camerasController, db, mp4Handler, hlsHandler ) {    

    // - - 
    // 
    app.post('/lifeline/cameras/:id/start_recording', function(req, res) {

        var cam = req.body;
        cam._id = camerasController.findCameraByLifelineId( req.params.id ).cam._id;

        camerasController.startRecording( cam._id, function(err) {
            if (err || cam.length === 0) {
                res.json({ success: false, error: err });
            } else {
                res.json({ success: true });
            }
        });
    });
    // - - -


    // - - 
    // 
    app.get('/lifeline/cameras/:id/video.hls', function(req, res) {
    
        var camId = req.params.id;
        var cam = camerasController.findCameraByLifelineId( req.params.id ).cam._id;

        var begin = parseInt( req.query.begin, 10 );
        var end = parseInt( req.query.end, 10 );
    
        hlsHandler.generateFinitePlaylist( db, cam._id, begin, end, function( playlist ) {
    
            res.writeHead(200, { 
                "Content-Type":"application/x-mpegURL",
                'content-length': playlist.length 
            });
    
            res.end(playlist);    
        });
    });
    // - - -



    // - - 
    // 
    app.post('/lifeline/cameras/:id/stop_recording', function(req, res) {

        var cam = req.body;
        cam._id = camerasController.findCameraByLifelineId( req.params.id ).cam._id;

        camerasController.stopRecording( cam._id, function(err) {
            if (err || cam.length === 0) {
                res.json({ success: false, error: err });
            } else {
                res.json({ success: true });
            }
        });
    });
    // - - -


    // - - 
    // 
    app.get('/lifeline/cameras.json', function(req, res) {

        camerasController.listCameras( function(err, list) {
            console.log(list);
            if (err) {
                res.end("{ 'error': '" + JSON.stringify(err) + "'}");
            } else {
                res.json(list);
            }
        });
    });
    // - - -

    // - -
    //
    app.put('/lifeline/cameras/:id', function(req, res) {

        var cam = req.body;
        cam._id = camerasController.findCameraByLifelineId( req.params.id ).cam._id;

        camerasController.updateCamera( cam, function(err) {
            if (err) {
                res.json({success: false, error: err});
            } else {
                res.json({success: true});
            }
        });
    });
    // - - -


    // - -
    //
    app.delete('/lifeline/cameras/:id', function(req, res) {

        var cam = camerasController.findCameraByLifelineId( req.params.id ).cam;

        camerasController.removeCamera( cam._id, function( err, numRemoved ) {
            if (err) {
                res.json({success: false, error: err});
            } else {
                res.json({success: true, _id: req.params.id});
            }
        });

    });
    // - - -


    // - -
    //
    app.post('/lifeline/cameras', function(req, res) {

        console.log("app: insert camera: ");
        console.log(req.body);

        camerasController.insertNewCamera( req.body, function( err, newDoc ) {
            if (err) {
                res.json({ sucess: false, error: err  });
            } else {
                res.json( newDoc );
            }
        });
    });
    // - -


    // - - 
    // 
    app.get('/lifeline/cameras/:id', function(req, res) {
        var cam = camerasController.findCameraByLifelineId( req.params.id ).cam;

        camerasController.getCamera( cam._id, function(err, cam) {
            if (err || cam.length === 0) {
                res.json({ success: false, error: err });
            } else {
                res.json({ success: true, camera: {_id: cam._id, name: cam.name, ip: cam.ip, rtsp: cam.rtsp, id: cam.id } });
            }
        });
    });
    // - - -


    // - - 
    // 
    app.get('/lifeline/cameras/:id/video', function(req, res) {
        var camId = req.params.id;
        var begin = req.query.begin;
        var end = req.query.end;

        var cam = camerasController.findCameraByLifelineId( camId ).cam;

        camerasController.getCamera( cam._id, function(err, cam) {
            if (err) {
                res.json( { error: err } );
            } else {
                mp4Handler.generateMp4Video( db, cam, begin, end, function( response ) {
                    if(response.success) {
                        mp4Handler.sendMp4Video( response.file, req, res );
                    } else {
                        res.end( response.error );
                    }
                });
            }
        });
    });
    // - - -


    // - - 
    // 
    app.get('/lifeline/cameras/:id/video/download', function(req, res) {
        var camId = req.params.id;
        var begin = req.query.begin;
        var end = req.query.end;

        var cam = camerasController.findCameraByLifelineId( camId ).cam;

        camerasController.getCamera( cam._id, function(err, cam) {
            if (err) {
                res.json( { error: err } );
            } else {
                mp4Handler.generateMp4Video( db, cam, begin, end, function( response ) {
                    if(response.success) {
                        mp4Handler.sendMp4VideoForDownload( response.file, req, res );
                    } else {
                        res.end( response.error );
                    }
                });
            }
        });
    });
    // - - -


    // - -
    //
    app.get('/lifeline/cameras/:id/video.json', function(req, res) {
        var camId = req.params.id;
        var begin = req.query.begin;
        var end = req.query.end;

        var cam = camerasController.findCameraByLifelineId( camId ).cam;

        camerasController.getCamera( cam._id, function(err, cam) {
            if (err) {
                res.json( { error: err } );
            } else {
                mp4Handler.generateMp4Video( db, cam, begin, end, function( response ) {
                    res.json( response );
                });
            }
        });
    });
    // - - -


    // - - 
    // 
    app.get('/lifeline/cameras/:id/snapshot', function(req, res) {

        var camId = req.params.id;
        var cam = camerasController.findCameraByLifelineId( camId ).cam;

        camerasController.getCamera( cam._id, function(err, cam) {

            if (err) {
                res.json( { error: err } );
            } else {
                mp4Handler.takeSnapshot( db, cam, req, res );
            }
        });
    });
    // - - -


    // - - 
    // 
    app.get('/lifeline', function(req, res) {
        res.sendfile(__dirname + '/views/lifeline.html');
    });
    // - - -

}

exports.setup = setup;
