var _      = require('lodash');
var fs     = require('fs-extra');
var path   = require('path');
var assert = require('assert');
var sinon  = require('sinon');
var http   = require('http');

var Hik = require('../../helpers/camera_scanner/cam_api/hik.js');

// Some of these IPs and credsmay have to be changed occasionally 
//  if we want to test with real cameras
// TODO: have a better way to automate the IPs and credentials
var VALID_HIK_IP     = '10.126.141.252',
    INVALID_HIK_IP_1 = '127.0.0.1',
    INVALID_HIK_IP_2 = '10.126.140.10';

var USER = process.env['HIK_USER'],
    PASS = process.env['HIK_PASS'];

var XML_TAG = '<?xml version="1.0" encoding="UTF-8"?>';

describe('Hik', function() {

    describe('getResolutions', function() {

        it('should callback with error when unable to connect to camera #1', function(done) {
            Hik.getResolutions(INVALID_HIK_IP_1, 'user', 'pass', 1, function(err) {
                assert.ok(err);
                done();
            });
        });

        it('should callback with error when unable to connect to camera #2', function(done) {
            this.timeout(12000);
            Hik.getResolutions(INVALID_HIK_IP_2, 'user', 'pass', 1, function(err) {
                assert.ok(err);
                done();
            });
        });

        it('should callback with error when credentials are wrong', function(done) {
            Hik.getResolutions(VALID_HIK_IP, 'invalid_user', 'invalid_pass', 1, function(err) {
                assert.equal(err, 'not authorized');
                done();
            });
        });

        it('should callback with camera options when connection successful', function(done) {
            Hik.getResolutions(VALID_HIK_IP, USER, PASS, 100, function(err, resolutions, fps, bitrates) {
                assert.ok(!err);

                assert.ok(Array.isArray(resolutions));
                assert.ok(resolutions.length > 0);

                assert.ok(Array.isArray(fps));
                assert.ok(fps.length > 0);

                assert.ok( parseInt(bitrates.max) > 512);
                assert.ok( parseInt(bitrates.min) < 512);

                done();
            });
        });
        
        it('should callback with error when camera returns empty response', function(done) {

            var server = new Server({
                response: null
            }, function(port) {
                Hik.getResolutions( 'localhost:' + port, USER, PASS, 1, function(err, resolutions, fps, bitrates) {
                    assert.equal(err, 'empty response');
                    server.close();
                    done();
                });
            });
        });

        it('should callback with error when camera returns broken response #1', function(done) {

            var server = new Server({
                response: '<broken-xml> badbs<asjlqb>alnasad </<>'
            }, function(port) {
                Hik.getResolutions( 'localhost:' + port, USER, PASS, 1, function(err, resolutions, fps, bitrates) {
                    assert.equal(err, 'could not parse response');
                    server.close();
                    done();
                });
            });
        });

        it('should callback with error when camera returns broken response #2', function(done) {

            var server = new Server({
                response: 'asdbalskhdweuoqwfliqh qwdibw:w'
            }, function(port) {
                Hik.getResolutions( 'localhost:' + port, USER, PASS, 1, function(err, resolutions, fps, bitrates) {
                    assert.equal(err, 'could not parse response');
                    server.close();
                    done();
                });
            });
        });

        it('should callback with error when camera returns broken response #3', function(done) {

            var server = new Server({
                response: XML_TAG + '<a><b></a></b>'
            }, function(port) {
                Hik.getResolutions( 'localhost:' + port, USER, PASS, 1, function(err, resolutions, fps, bitrates) {
                    assert.equal(err, 'could not parse response');
                    server.close();
                    done();
                });
            });
        });

        it('should callback with error when StreamingChannel is not present', function(done) {

            var server = new Server({
                response: '<?xml version="1.0" encoding="UTF-8"?><hello version="1.0" xmlns="http://www.hikvision.com/ver10/XMLSchema"></hello>'
            }, function(port) {
                Hik.getResolutions( 'localhost:' + port, USER, PASS, 1, function(err, resolutions, fps, bitrates) {
                    assert.equal(err, 'invalid response: no StreamingChannel tag');
                    server.close();
                    done();
                });
            });
        });

        it('should callback with error when Video tag is not present', function(done) {
            var server = new Server({
                response: '<?xml version="1.0" encoding="UTF-8"?><StreamingChannel version="1.0" xmlns="http://www.hikvision.com/ver10/XMLSchema"></StreamingChannel>'
            }, function(port) {
                Hik.getResolutions( 'localhost:' + port, USER, PASS, 1, function(err, resolutions, fps, bitrates) {
                    assert.equal(err, 'invalid response: no Video tag');
                    server.close();
                    done();
                });
            });
        });

        it('should callback with error when videoResolutionWidth tag is not present', function(done) {
            var response = '<?xml version="1.0" encoding="UTF-8"?>\
                <StreamingChannel version="2.0" xmlns="http://www.hikvision.com/ver20/XMLSchema">\
                <id opt="1,2,3">102</id>\
                <Video>\
                </Video>\
                </StreamingChannel>';

            var server = new Server({
                response: response
            }, function(port) {
                Hik.getResolutions( 'localhost:' + port, USER, PASS, 1, function(err, resolutions, fps, bitrates) {
                    assert.equal(err, 'invalid response: no videoResolutionWidth tag');
                    server.close();
                    done();
                });
            });
        });

        it('should callback with 512 bitrate if bitrate tag is not present', function(done) {
            var response = '<?xml version="1.0" encoding="UTF-8"?>\
                <StreamingChannel version="2.0" xmlns="http://www.hikvision.com/ver20/XMLSchema">\
                <id opt="1,2,3">102</id>\
                <Video>\
                    <videoResolutionWidth opt="352*240,640*480,704*480">640</videoResolutionWidth>\
                    <maxFrameRate opt="3000,2500,2200,2000,1800,1600,1500,1200,1000,800,600,400,200,100,50,25,12,6">3000</maxFrameRate>\
                </Video>\
                </StreamingChannel>';

            var server = new Server({
                response: response
            }, function(port) {
                Hik.getResolutions( 'localhost:' + port, USER, PASS, 1, function(err, resolutions, fps, bitrates) {
                    assert.ok(!err);
                    assert.equal(bitrates.min, 512);
                    assert.equal(bitrates.max, 512);

                    server.close();
                    done();
                });
            });
        });

        it('should callback with 1500 fps if maxFrameRate tag is not present', function(done) {
            var response = '<?xml version="1.0" encoding="UTF-8"?>\
                <StreamingChannel version="2.0" xmlns="http://www.hikvision.com/ver20/XMLSchema">\
                <id opt="1,2,3">102</id>\
                <Video>\
                    <videoResolutionWidth opt="352*240,640*480,704*480">640</videoResolutionWidth>\
                </Video>\
                </StreamingChannel>';

            var server = new Server({
                response: response
            }, function(port) {
                Hik.getResolutions( 'localhost:' + port, USER, PASS, 1, function(err, resolutions, fps, bitrates) {
                    assert.ok(!err);
                    assert.equal(fps.length, 1);
                    assert.equal(fps[0], '1500');
                    server.close();
                    done();
                });
            });
        });

        it('should callback with 1500 fps if opts is not present in maxFrameRate tag', function(done) {
            var response = '<?xml version="1.0" encoding="UTF-8"?>\
                <StreamingChannel version="2.0" xmlns="http://www.hikvision.com/ver20/XMLSchema">\
                <id opt="1,2,3">102</id>\
                <Video>\
                    <videoResolutionWidth opt="352*240,640*480,704*480">640</videoResolutionWidth>\
                    <maxFrameRate>3000</maxFrameRate>\
                </Video>\
                </StreamingChannel>';

            var server = new Server({
                response: response
            }, function(port) {
                Hik.getResolutions( 'localhost:' + port, USER, PASS, 1, function(err, resolutions, fps, bitrates) {
                    assert.ok(!err);
                    assert.equal(fps.length, 1);
                    assert.equal(fps[0], '1500');
                    server.close();
                    done();
                });
            });
        });

        it('should callback with error if opts is not present in videoResolutionWidth tag', function(done) {
            var response = '<?xml version="1.0" encoding="UTF-8"?>\
                <StreamingChannel version="2.0" xmlns="http://www.hikvision.com/ver20/XMLSchema">\
                <id opt="1,2,3">102</id>\
                <Video>\
                    <videoResolutionWidth>640</videoResolutionWidth>\
                    <maxFrameRate>3000</maxFrameRate>\
                </Video>\
                </StreamingChannel>';

            var server = new Server({
                response: response
            }, function(port) {
                Hik.getResolutions( 'localhost:' + port, USER, PASS, 1, function(err, resolutions, fps, bitrates) {
                    assert.equal(err, 'invalid response: no opt tag');
                    server.close();
                    done();
                });
            });
        });
    });

    describe('template functions', function() {
        it('should be defined', function() {
            var hik = new Hik();
            
            assert.equal(hik.apiName(), 'hik');

            hik.checkForExistingProfile();
            hik.isProfileH264();
            hik.updateProfile();
            hik.getFrameRateRange();
            hik.getVideoQualityRange();
            hik.setMotionParams();
            hik.setupMotionDetection();
            hik.startListeningForMotionDetection();
            hik.stopListeningForMotionDetection();
        });
    });

    describe('getNumberOfChannels', function(err, nChannels) {
        
        // TODO: do this timeout test with other requests as well
        it('should timeout in up to 10s #1', function(done) {

            this.timeout( 12000 );
            var hik = new Hik();

            var server = new Server({
                timeout: 60*60*1000
            }, function(port) {
                hik.setCameraParams({
                    username: USER,
                    password: PASS,
                    ip: 'localhost:' + port
                });

                hik.getNumberOfChannels(function(err, nChannels) {
                    assert.equal(err.code, 'ETIMEDOUT');
                    done();
                });
            });
        });

        it('should timeout in up to 10s #2', function(done) {

            this.timeout( 12000 );
            var hik = new Hik();

            var server = new Server({
                timeout: 60*60*1000
            }, function(port) {
                hik.setCameraParams({
                    username: USER,
                    password: PASS,
                    ip: INVALID_HIK_IP_2
                });

                hik.getNumberOfChannels(function(err, nChannels) {
                    assert.equal(err.code, 'ENETUNREACH');
                    done();
                });
            });
        });

        it('should callback with error if response is empty', function(done) {

            var hik = new Hik();

            var server = new Server({
                response: null
            }, function(port) {
                hik.setCameraParams({
                    username: USER,
                    password: PASS,
                    ip: 'localhost:' + port
                });

                hik.getNumberOfChannels(function(err, nChannels) {
                    assert.equal(err, 'empty response');
                    done();
                });
            });
        });

        it('should callback with error if creds are invalid', function(done) {

            var hik = new Hik();

            var server = new Server({
                response: null
            }, function(port) {
                hik.setCameraParams({
                    username: 'invalid_user',
                    password: 'invalid_pass',
                    ip: VALID_HIK_IP
                });

                hik.getNumberOfChannels(function(err, nChannels) {
                    assert.equal(err, 'not authorized');
                    done();
                });
            });
        });
    });
});


var Server = function( opts, cb ) {

    if (!Server._ports) { 
        Server._ports = {};
    }

    var port = 8000;
    while( Server._ports[ port ] ) {
        port++
    }

    this.port = port;

    this.server = http.createServer( function(req, res) {
        // console.log( opts.response );
        setTimeout( function() {
            res.end( opts.response );
        }, opts.timeout );
    });

    Server._ports[port] = this.server;

    this.server.listen( port );
    if (cb) cb( port );
};

Server.prototype.close = function() {
    this.server.close();
    delete Server._ports[ this.port ];
};
