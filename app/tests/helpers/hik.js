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
                    assert.equal(err, 'could not parse response from channel 1');
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
                    assert.equal(err, 'could not parse response from channel 1');
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
                    assert.equal(err, 'could not parse response from channel 1');
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
                    assert.equal(err, 'invalid response from channel 1: no StreamingChannel tag');
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
                    assert.equal(err, 'invalid response from channel 1: no Video tag');
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
                    assert.equal(err, 'invalid response from channel 1: no videoResolutionWidth tag');
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

        it('should callback with 512 bitrate if bitrate tag is present but attributes are not', function(done) {
            var response = '<?xml version="1.0" encoding="UTF-8"?>\
                <StreamingChannel version="2.0" xmlns="http://www.hikvision.com/ver20/XMLSchema">\
                <id opt="1,2,3">102</id>\
                <Video>\
                    <constantBitRate x="0">512</constantBitRate>\
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
                    assert.equal(err, 'invalid response from channel 1: no opt tag');
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
                    assert.ok(err.code.indexOf('TIMEDOUT') >= 0);
                    server.close();
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
                    assert.ok(
                        err.code.indexOf('ENETUNREACH') >= 0 || 
                        err.code.indexOf('TIMEDOUT') >= 0
                    );
                    server.close();
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
                    server.close();
                    done();
                });
            });
        });

        it('should callback with error if creds are invalid', function(done) {

            var hik = new Hik();

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

        it('should callback with error if unable to parse number of channels', function(done) {

            var hik = new Hik();

            var server = new Server({
                response: 'broken_response'
            }, function(port) {
                hik.setCameraParams({
                    ip: 'localhost:' + port
                });

                hik.getNumberOfChannels(function(err, nChannels) {
                    assert.equal(err, 'could not parse number of channels');
                    server.close();
                    done();
                });
            });
        });

        it('should successfully parse number of channels', function(done) {

            var hik = new Hik();

            hik.setCameraParams({
                username: USER,
                password: PASS,
                ip: VALID_HIK_IP
            });

            hik.getNumberOfChannels(function(err, nChannels) {

                assert.ok(!err);
                assert.equal(nChannels, 3);

                done();
            });
        });

        it('should handle empty callback', function() {

            var hik = new Hik();

            hik.setCameraParams({
                username: USER,
                password: PASS,
                ip: VALID_HIK_IP
            });

            hik.getNumberOfChannels();
        });
    });

    
    describe('configCamera', function() {

        it('should send a PUT request with the correct params', function(done) {

            var xml = '<?xml version:"1.0" encoding="UTF-8"?><StreamingChannel xmlns="urn:psialliance-org" version="1.0"><id>1</id><channelName>Solink 01</channelName><enabled>true</enabled> <Video><enabled>true</enabled><videoInputChannelID>1</videoInputChannelID><videoCodecType>H.264</videoCodecType><videoResolutionWidth>800</videoResolutionWidth><videoResolutionHeight>600</videoResolutionHeight><videoQualityControlType>vbr</videoQualityControlType><vbrUpperCap>1024</vbrUpperCap><vbrLowerCap>32</vbrLowerCap><fixedQuality>60</fixedQuality><maxFrameRate>30</maxFrameRate></Video></StreamingChannel>';

            var done_counter = 0;

            var hik = new Hik();

            var server = new Server({
                response: null,
                onData: function(d) {
                    assert.equal( d.body, xml );
                    assert.equal( d.method, 'PUT' );
                    done_counter++;
                    if (done_counter == 2) { 
                        server.close();
                        done(); 
                    }
                }
            }, function(port) {
                hik.setCameraParams({
                    username: USER,
                    password: PASS,
                    ip: 'localhost:' + port
                });

                hik.configCamera({
                    channel:  1,
                    width:    800,
                    height:   600,
                    fps:      30,
                    bitrate:  1024,
                }, function(err, body) {
                    assert.ok(!err);
                    done_counter++;
                    if (done_counter == 2) { 
                        server.close();
                        done(); 
                    }
                });
            });
        });

        //TODO: test configuring actual camera
    });

    describe('getResolutionOptions', function() {
        
        var channelsResponseXML = 
            '<StreamingChannel ></StreamingChannel>' +
            '<StreamingChannel ></StreamingChannel>' +
            '<StreamingChannel ></StreamingChannel>';

        var capabilitiesResponseXML = '<?xml version="1.0" encoding="UTF-8"?>\
            <StreamingChannel version="2.0" xmlns="http://www.hikvision.com/ver20/XMLSchema">\
            <id opt="1,2,3">102</id>\
            <Video>\
                <videoResolutionWidth opt="352*240,640*480,704*480">640</videoResolutionWidth>\
                <maxFrameRate>3000</maxFrameRate>\
            </Video>\
            </StreamingChannel>';

        it('should cb with error when IP has not been set yet', function(done) {
           var hik = new Hik();

           hik.getResolutionOptions( function(err) {
               assert.equal(err, 'no ip');
               done();
           });
        });

        it('should cb with error when unable to connect to camera', function(done) {

           var hik = new Hik();

           hik.setCameraParams({
               username:  USER,
               password:  PASS,
               ip:        'localhost:1000'
           });

           hik.getResolutionOptions( function(err) {
               assert.equal(err.code, 'ECONNREFUSED');
               done();
           });
        });
        // TODO: test other scenarios of camera connection issues

        it('should callback with error when failed querying one of the channels', function(done) {

            var channelRequests = {};

            var hik = new Hik();
            var server = new Server({
                responseFunction: function(req, cb) {

                    if (req.url == '/streaming/channels') {
                        return cb( channelsResponseXML );
                    } 

                    if ( req.url.indexOf('channels/1') >= 0 ) {
                        channelRequests[1] = true;
                        return cb(capabilitiesResponseXML);
                    } else if ( req.url.indexOf('channels/2') >= 0) {
                        channelRequests[2] = true;
                        return cb('_broken_response_');
                    } else if ( req.url.indexOf('channels/3') >= 0) {
                        channelRequests[3] = true;
                        return cb(capabilitiesResponseXML);
                    }                
                }
            }, function(port) {
                hik.setCameraParams({
                    ip: 'localhost:' + port
                });

                hik.getResolutionOptions( function(err) {
                    assert.ok( channelRequests[1] );
                    assert.ok( channelRequests[2] );
                    assert.ok( channelRequests[3] );
                    assert.equal(err, 'could not parse response from channel 2');

                    server.close();
                    done();
                });
            });
        });

        it('should callback with correct params when querying an actual camera', function(done) {
            var hik = new Hik();

            hik.setCameraParams({
                username:  USER,
                password:  PASS,
                ip:        VALID_HIK_IP
            });

            hik.getResolutionOptions(function(err, resolutions, bitrates, configsPerChannel) {

                // assert.ok(!err);
                assert.equal(configsPerChannel.nChannels, 3);

                done();
            });
        });
    });

    describe('getRtspUrl', function() {

        var channelsResponseXML = '<StreamingChannel ></StreamingChannel>',
            channelsResponseXML_3 = '<StreamingChannel ></StreamingChannel>'
                                + '<StreamingChannel ></StreamingChannel>'
                                + '<StreamingChannel ></StreamingChannel>';


        var capabilitiesResponseTemplate = '<?xml version="1.0" encoding="UTF-8"?>\
            <StreamingChannel version="2.0" xmlns="http://www.hikvision.com/ver20/XMLSchema">\
            <id opt="1">102</id>\
            <Video>\
                <videoResolutionWidth opt="{resolutions}">640</videoResolutionWidth>\
                <maxFrameRate opt="{framerates}">1500</maxFrameRate>\
            </Video>\
            </StreamingChannel>';

        var capabilitiesResponseXML = capabilitiesResponseTemplate
            .replace('{resolutions}', '352*240,640*480,800*600')
            .replace('{framerates}', '3000,2500,2200,2000,1800,1600,1500,1200,1000,800,600,400,200,100,50,25,12,6');

        // including duplicate and empty resolution values to increase coverage
        var capabilitiesResponseXML_1 = capabilitiesResponseTemplate
            .replace('{resolutions}', '1280*1024, 1280*720, 1280*720,,800*600')  
            .replace('{framerates}', '3000,2500,2200,2000,1800,1600,1500,1200,1000,800,600,400,200,100,50,25,12,6');
        var capabilitiesResponseXML_2 = capabilitiesResponseTemplate
            .replace('{resolutions}', '800*600, 640*480')
            .replace('{framerates}', '3000,2500,2400,2000,1800,1600,1500,1200,1000,800,600,400,200,100,50,25,12,6');
        var capabilitiesResponseXML_3 = capabilitiesResponseTemplate
            .replace('{resolutions}', '320*240, 160*120')
            .replace('{framerates}', '3000,2500,2200,2000,1800,1600,1500,1200,1000,800,600,400,200,100,50,25,12,6');

        it('should handle mising data in profile', function(done) {

            var hik = new Hik();

            var server = new Server({
                responseFunction: function(req, cb) {

                    if (req.url == '/streaming/channels') {
                        return cb( channelsResponseXML );
                    } else if ( req.url.indexOf('channels/1') >= 0 ) {
                        return cb(capabilitiesResponseXML);
                    } else {
                        assert.equal(req.method, 'PUT');
                        assert.ok(req.url.indexOf('Channels/1') >= 0);
                        return cb('');
                    }
                },
                onData: function(d) {
                    // assert.equal( d.method, 'PUT' );
                    if (d.method !== 'PUT') { return; }
                    assert.ok(
                        d.body.indexOf('<videoResolutionWidth>800</videoResolutionWidth><videoResolutionHeight>600</videoResolutionHeight>') >= 0
                    );
                }
            }, function(port) {
                hik.setCameraParams({
                    username: 'user',
                    password: 'pass',
                    ip: 'localhost:' + port
                });

                hik.getRtspUrl({
                }, function(url) {
                    assert.equal(url, 'rtsp://user:pass@localhost:' + port + '/Streaming/Channels/1');
                    server.close();
                    done();
                });
            });
        });


        it('should handle invalid responses from camera', function(done) {

            var hik = new Hik();

            var server = new Server({
                responseFunction: function(req, cb) {

                    if (req.url == '/streaming/channels') {
                        return cb( channelsResponseXML );
                    } else if ( req.url.indexOf('channels/1') >= 0 ) {
                        return cb( 'broken_response' );
                    } else {
                        assert.equal(req.method, 'PUT');
                        assert.ok(req.url.indexOf('Channels/1') >= 0);
                        return cb('');
                    }
                },
                onData: function(d) {
                    // assert.equal( d.method, 'PUT' );
                    if (d.method !== 'PUT') { return; }
                    assert.ok(
                        d.body.indexOf('<videoResolutionWidth>800</videoResolutionWidth><videoResolutionHeight>600</videoResolutionHeight>') >= 0
                    );
                }
            }, function(port) {
                hik.setCameraParams({
                    username: 'user',
                    password: 'pass',
                    ip: 'localhost:' + port
                });

                hik.getRtspUrl({
                }, function(url) {
                    assert.equal(url, 'rtsp://user:pass@localhost:' + port + '/Streaming/Channels/1');
                    server.close();
                    done();
                });
            });
        });

        it('should handle invalid channel in profile and approximate fps to the nearest supported value', function(done) {

            var hik = new Hik();

            var server = new Server({
                responseFunction: function(req, cb) {

                    if (req.url == '/streaming/channels') {
                        return cb( channelsResponseXML );
                    } else if ( req.url.indexOf('channels/1') >= 0 ) {
                        return cb(capabilitiesResponseXML);
                    } else {
                        assert.equal(req.method, 'PUT');
                        assert.ok(req.url.indexOf('Channels/1') >= 0);
                        return cb('');
                    }
                },
                onData: function(d) {
                    if (d.method !== 'PUT') { return; }
                    console.log(d);
                    assert.ok(
                        d.body.indexOf('<videoResolutionWidth>800</videoResolutionWidth><videoResolutionHeight>600</videoResolutionHeight>') >= 0
                    );
                    assert.ok(
                        d.body.indexOf('<maxFrameRate>2200</maxFrameRate>') >= 0
                    );
                }
            }, function(port) {
                hik.setCameraParams({
                    username: 'user',
                    password: 'pass',
                    ip: 'localhost:' + port
                });

                hik.getRtspUrl({
                    channel:    2,
                    framerate:  23
                }, function(url) {
                    assert.equal(url, 'rtsp://user:pass@localhost:' + port + '/Streaming/Channels/1');
                    server.close();
                    done();
                });
            });
        });


        // TODO: finish this test
        it('should correctly map resolution to channel', function(done) {

            var hik = new Hik();

            var server = new Server({
                responseFunction: function(req, cb) {
                    if (req.url == '/streaming/channels') {
                        return cb( channelsResponseXML_3 );
                    } else if ( req.url.indexOf('channels/1') >= 0 ) {
                        return cb(capabilitiesResponseXML_1);
                    } else if ( req.url.indexOf('channels/2') >= 0 ) {
                        return cb(capabilitiesResponseXML_2);
                    } else if ( req.url.indexOf('channels/3') >= 0 ) {
                        return cb(capabilitiesResponseXML_3);
                    } else {
                        assert.equal(req.method, 'PUT');
                        assert.ok(req.url.indexOf('Channels/2') >= 0);
                        return cb('');
                    }
                },
                onData: function(d) {
                    if (d.method !== 'PUT') { return; }
                    assert.ok(
                        d.body.indexOf('<videoResolutionWidth>640</videoResolutionWidth><videoResolutionHeight>480</videoResolutionHeight>') >= 0
                    );
                    assert.ok(
                        d.body.indexOf('<maxFrameRate>2400</maxFrameRate>') >= 0
                    );
                }
            }, function(port) {
                hik.setCameraParams({
                    username: 'user',
                    password: 'pass',
                    ip: 'localhost:' + port
                });

                hik.getRtspUrl({
                    resolution: '640x480',
                    framerate:  23
                }, function(url) {
                    assert.equal(url, 'rtsp://user:pass@localhost:' + port + '/Streaming/Channels/2');
                    server.close();
                    done();
                });
            });
        });
    });


    describe('setCameraParams', function() {

        it('should not override current settings if attributes being passed are undefined', function() {
            
            var hik = new Hik();

            hik.setCameraParams({
                password: 'pass',
                username: 'user',
                ip: 'my-ip'
            });

            assert.equal( hik.password, 'pass' );
            assert.equal( hik.username , 'user' );
            assert.equal( hik.ip, 'my-ip' );

            hik.setCameraParams({
                password: null,
                ip: ''
            });

            assert.equal( hik.password, 'pass' );
            assert.equal( hik.username, 'user' );
            assert.equal( hik.ip, 'my-ip' );
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

        var buffer = '';
        req.on('data', function(d) {
            buffer += d.toString();
        });
        req.on('end', function() {
            if (!opts.onData) { return; }
            opts.onData( {
                method:  req.method,
                body:    buffer
            });
        });

        setTimeout( function() {
            if (opts.responseFunction) {
                opts.responseFunction( req, function( d ) {
                    res.end( d );
                });
            } else {
                res.end( opts.response );
            }
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
