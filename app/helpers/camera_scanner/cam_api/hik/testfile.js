'use strict';

var hiksdk            = require('./hik_sdk').hiksdk;
var Promise           = require('bluebird');
var spawn             = require('child_process').spawn;
var _                 = require('lodash');
var xml2js            = require('xml2js');
var path              = require('path');
var streamingChannels = require('./streaming_channel').StreamingChannels;
var SSDPClient        = require('node-ssdp').Client;

function indentObject(o) {
    var s = '';
    if (_.isString(o)) {
        s = o;
    } else {
        s = JSON.stringify(o, null, 2) || '' + o;
    }
    return '\t' + s.replace(/\n\r?/g, '\n\t')
}
var setupInquiryAndGetDeviceInfo = function () {
    hiksdk.on('inquiry', function (document) {
        console.log('[HikIot.inquiry]  with doc');
        if (document.Activated) {
            console.log('[HikIot]  yeay activated device ');
            //hiksdk.getDeviceInfo({
            //    username: 'admin',
            //    password: 'S0l1nk!!',
            //    host    : document.IPv4Address
            //}).then(function (data) {
            //    console.log('[HikIot.getDeviceInfo]  ');
            //}).catch(function (err) {
            //    console.error('[HikIot]  error \n%s', indentObject(err));
            //});
        } else {
            console.log('skip not activated %s', document.IPv4Address);
        }
    });

    hiksdk.sendInquiry().then(function () {
        return Promise.resolve('[HikIot] started');
    });
};
//setupInquiryAndGetDeviceInfo();


var runActivate = function (code) {
    return new Promise(function (resolve, reject) {
        if (code == 1) {
            console.log('no interface update skipping scan and activate');
            resolve([]);
            return;
        }
        var activateProcess = spawn(__dirname + '/run_sadp_tool.sh', ['"S0l1nk!!"', '"10.126.141.1"', '"10.126.141"', 254]);

        var devices = [];
        activateProcess.stdout.setEncoding('utf8');

        var activateProcess_buffer = '';
        activateProcess.stdout.on('data', function (data) {
            activateProcess_buffer += data.toString();
            var lines = activateProcess_buffer.split('\n');
            for (var i = 0; i < lines.length - 1; i++) {
                var line = lines[i];
                if (_.isEmpty(line)) {
                    return;
                }
                console.log(line);
                try {
                    devices.push(JSON.parse(line));
                    console.log('got json');
                } catch (e) {
                    //ignored
                }
            }
            activateProcess_buffer = lines[i];
        });

        activateProcess.on('close', function (code) {
            if (activateProcess_buffer) {
                console.log(activateProcess_buffer);
                try {
                    devices.push(JSON.parse(activateProcess_buffer));
                    console.log('got json');
                } catch (e) {
                    //ignored
                }
            }
            console.log('activate process exit code ' + code);
            if (code == 0) {
                resolve(devices);
            } else {
                reject(code);
            }
        });
    });
};

var scanAndActivate = function () {

    var interfaces = ['eth0', 'eth1', 'eth2', 'eth3', 'eth0'];
    Promise.reduce(interfaces, function (accumulator, eth) {
        return new Promise(function (resolve, reject) {
            console.log('swap_gateway for to: ', eth);
            var prc = spawn(__dirname + '/swap_gateway.sh', [eth]);
            prc.stdout.setEncoding('utf8');
            var swap_gateway_buffer = '';
            prc.stdout.on('data', function (data) {
                swap_gateway_buffer += data.toString();
            });
            prc.on('close', function (code) {
                console.log(swap_gateway_buffer);
                console.log('swap gateway exit code ' + code);
                if (code == 0 || code == 1) {
                    resolve(code);
                } else {
                    reject(code);
                }
            });
        })
        .then(runActivate)
        //.then(function (results) {
        //    console.log('Results: \n%s', indentObject(results));
        //    if (results && results.length <= 0) {
        //        console.log('Skipping getStreamingChannels');
        //        return Promise.resolve({});
        //    }
        //    results.unshift({});
        //    return Promise.reduce(results, function (accumulator, device) {
        //        console.log('getStreamingChannels, for ip: %s', device.ipv4);
        //        return hiksdk
        //        .getStreamingChannels({
        //            username: 'admin',
        //            password: 'S0l1nk!!',
        //            host    : device.ipv4
        //        })
        //        .then(function (data) {
        //                console.log('getStreamingChannels skipping indent'/*indentObject(data)*/);
        //            }
        //        )
        //        .catch(function (err) {
        //            console.error('getStreamingChannels error ', err);
        //        });
        //    })
        //});
        //.then(function (results) {
        //    console.log('Results: \n%s', indentObject(results));
        //    if (results && results.length <= 0) {
        //        console.log('Skipping putStreamingChannels');
        //        return Promise.resolve({});
        //    }
        //    results.unshift({});
        //    return Promise.reduce(results, function (accumulator, device) {
        //        return hiksdk.putStreamingChannels({
        //            username: 'admin',
        //            password: 'S0l1nk!!',
        //            host    : device.ipv4,
        //            body    : streamingChannels.channelListXML
        //        });
        //    });
        //})
        .catch(function (err) {
            console.error('some uncaught error ', err);
        });
    });
};
scanAndActivate();

function ssdp() {
    var ssdpClient = new SSDPClient();
    ssdpClient.on('response', function (headers, statusCode, rinfo) {
        console.log('m-search response ', rinfo);
    });
    ssdpClient.search('ssdp:all');
}
//ssdp();
