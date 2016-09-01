var Promise = require('bluebird');
var streamingChannels = require('../helpers/camera_scanner/cam_api/hik/streaming_channel');
var ctrl    = {};


ctrl.applyStreamSettings =
function (hikDevices) {
    console.log('Results: \n%s', indentObject(hikDevices));
    if (hikDevices && hikDevices.length <= 0) {
        console.log('Skipping putStreamingChannels');
        return Promise.resolve({});
    }
    // first item is the initial value of the accumulator.
    hikDevices.unshift({});
    return Promise.reduce(hikDevices, function (accumulator, device) {
        return hiksdk.putStreamingChannels({
            username: 'admin',
            password: 'S0l1nk!!',
            host    : device.ipv4,
            body    : streamingChannels.channelListXML
        });
    });
};


module.exports = ctrl;