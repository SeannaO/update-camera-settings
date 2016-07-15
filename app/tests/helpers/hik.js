var _      = require('lodash');
var fs     = require('fs-extra');
var path   = require('path');
var assert = require("assert");
var sinon  = require("sinon");

var Hik = require('../../helpers/camera_scanner/cam_api/hik.js');

// Some of these IPs and credsmay have to be changed occasionally 
//  if we want to test with real cameras
// TODO: have a better way to automate the IPs and credentials
var VALID_HIK_IP     = '10.126.141.252',
    INVALID_HIK_IP_1 = '127.0.0.1',
    INVALID_HIK_IP_2 = '10.126.140.10';

var USER = process.env['HIK_USER'],
    PASS = process.env['HIK_PASS'];

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

                assert.ok(bitrates.max);
                assert.ok(bitrates.min);

                done();
            });
        });
    });
});

Hik.getResolutions();
