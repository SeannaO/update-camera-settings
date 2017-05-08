'use strict';

var dgram       = require('dgram');
var Promise     = require('bluebird');
var os          = require('os');
var _           = require('lodash');
var uuid        = require('uuid');
var xml2js      = require('xml2js');
var events      = require('events');
var util        = require('util');
var Swagger     = require('swagger-client');
var path        = require('path');
var fs          = require('fs-extra');
var inherits    = util.inherits;
var parseString = Promise.promisify(xml2js.parseString);
var xmlBuilder  = new xml2js.Builder({
    renderOpts: {pretty: false, indent: '', newline: '\n'}
});

var proto = function () {
    events.EventEmitter.call(this);
};
inherits(proto, events.EventEmitter);
var self           = new proto();
self.port          = 37020;
self.protocol      = 'udp4';
self.socket        = null;
self.uuid          = uuid.v1();
self.devices       = [];
// Default multicast address for IPv4
self.multicastAddr = '239.255.255.250';

// TODO up6 not implemented
//If IPv6, send to IPv6 multicast address
//if (self.protocol == 'udp6') {
//    // http://www.iana.org/assignments/ipv6-multicast-addresses/ipv6-multicast-addresses.xhtml
//    self.multicastAddr = 'ff05::';
//}

function indentObject(o) {
    var s = '';
    if (_.isString(o)) {
        s = o;
    } else {
        s = JSON.stringify(o, null, 2) || '' + o;
    }
    return '\t' + s.replace(/\n\r?/g, '\n\t')
}

self.contains = function (probeMatch) {
    return _.some(self.devices, function (o) {
        return o.DeviceSN[0] === probeMatch.DeviceSN[0]
    });
};

function updateDevice(probeMatch) {
    var index   = _.findIndex(self.devices, function (o) {
        return o.DeviceSN[0] === probeMatch.DeviceSN[0]
    });
    var updated = false;
    if (index > -1) {
        if (!_.isEqual(self.devices[index], probeMatch)) {
            self.devices[index] = probeMatch;
            updated             = true;
        }
    }
    return updated;
}

self.networkInterfaces = os.networkInterfaces();
console.log('[HikSdk]  networkInterfaces \n%s', indentObject(self.networkInterfaces));
self.networkAddresses = _.flatten(_.map(self.networkInterfaces, function (o) {
    return o;
}));

self.externalNetworkAddresses = _.filter(self.networkAddresses, function (o) {
    return !o.internal && o.family === 'IPv4';
});

var multicastSetup = function () {
    return _.map(self.externalNetworkAddresses, function (o) {
        return new Promise(function (resolve, reject) {
            var timeout = setTimeout(reject, 15 * 1000, '[HikSdk.socket]  binding timeout');
            var socket  = dgram.createSocket(self.protocol);

            socket.on('listening', function () {
                console.log('[HikSdk.socket.listening]  (%s:%s) adding membership to %s',
                    socket.address().address,
                    socket.address().port,
                    self.multicastAddr);
                socket.addMembership(self.multicastAddr);
            });

            socket.on('message', function (message, info) {
                if (_.some(self.networkAddresses, function (o) {
                        return o.address === info.address;
                    })) {
                    console.log('[HikSdk.socket.message]  (%s:%s) loopback',
                        socket.address().address,
                        socket.address().port);
                } else {
                    self.emit('all_replies', {info: info, message: message});
                    parseString(message).then(function (xmlDocument) {
                        console.log('[HikSdk.socket.message]  (%s:%s) response and sender info \n%s\n%s',
                            socket.address().address,
                            socket.address().port,
                            indentObject(xmlDocument),
                            indentObject(info));
                        var probeMatch = xmlDocument.ProbeMatch;
                        if (probeMatch.Uuid[0] === self.uuid) {
                            if (!self.contains(probeMatch)) {
                                self.devices.push(probeMatch);
                                self.emit(probeMatch.Types[0], probeMatch);
                            } else if (updateDevice(probeMatch)) {
                                self.emit('update', probeMatch);
                            }
                        }
                    }).catch(function (e) {
                        console.error('[HikSdk.socket.message]  (%s:%s) xml document parse error \n%s',
                            socket.address().address,
                            socket.address().port,
                            indentObject(e.stack));
                    });
                }
            });

            socket.on('error', function (err) {
                console.error('[HikSdk.socket.error]  (%s:%s) error: \n%s',
                    socket.address().address,
                    socket.address().port,
                    indentObject(err));
                socket.close();
            });

            console.log('[HikSdk.socket]  binding to %s:%s', o.address, self.port);
            socket.bind(self.port, o.address, function () {
                console.log('[HikSdk.socket]  bound to %s:%s', o.address, self.port);
                clearTimeout(timeout);
                socket.setBroadcast(true); // can only call after bind
                resolve(socket);
            });
        });
    });
};

var sendMulticast = function (socket) {

    var discovery_xml = xmlBuilder.buildObject({
        Probe: {
            Uuid : self.uuid,
            Types: 'inquiry'
        }
    });
    var sendData      = new Buffer(discovery_xml);
    return new Promise(function (resolve, reject) {
        socket.send(sendData, 0, sendData.length, self.port, self.multicastAddr, function (err) {
            console.log('[HikSdk.socket.send]  (%s:%s) data \n%s',
                socket.address().address,
                socket.address().port,
                indentObject(sendData.toString('utf8')));
            if (err) {
                reject(err);
            }
            resolve();
        });
    });
};

self.sendInquiry = function () {
    if (self.inquiryInProgress) {
        console.warn('[HikSdk]  sendInquiry ignored, already in progress');
        return Promise.resolve([]);
    }
    self.inquiryInProgress = true;
    var socketsPromise     = Promise.all(multicastSetup());
    socketsPromise.delay(15 * 1000).then(function (sockets) {
        console.log('[HikSdk]  closing sockets');
        _.each(sockets, function (socket) {
            socket.close();
        })
    }).catch(function (err) {
        console.error('[HikSdk]  closing sockets \n%s', indentObject(err.stack));
    }).finally(function () {
        self.inquiryInProgress = false;
    });
    return socketsPromise.then(function (sockets) {
        console.log('[HikSdk]  multicastSetup complete');
        return Promise.all(_.map(sockets, function (socket) {
            return sendMulticast(socket);
        }));
    }).then(function () {
        console.log('[HikSdk]  Multicast sent');
    });
};


var psiaClient = function (username, password) {
    var auth = undefined;
    if (username && password) {
        auth = {
            psia_auth: new Swagger.PasswordAuthorization(username, password)
        };
    }

    return new Swagger({
        spec          : JSON.parse(fs.readFileSync(path.join(__dirname, 'swagger.json').toString())),
        usePromise    : true,
        authorizations: auth
    });
};

self.getDeviceInfo = function (opts) {
    opts = opts || {};
    return psiaClient(opts.username, opts.password).then(function (client) {
        client.setHost(opts.host);
        return client
        .system
        .getDeviceInfo()
        .then(function (res) {
            console.log('[HikSdk.getDeviceInfo]  %s\n%s', opts.host, indentObject(res));
            return parseString(res.data);
        })
        .catch(function (e) {
            if (e.statusText) {
                e = e.statusText;
            }
            console.log('[HikSdk.getDeviceInfo]  request failed: %s\n%s', opts.host, indentObject(e));
        });
    }).catch(function (e) {
        if (e && e.stack) {
            e = e.stack;
        }
        console.error('[HikSdk.getDeviceInfo]  %s\n%s', opts.host, indentObject(e));
    });
};

self.getIpAddressByNetworkInterfaceId = function (opts) {
    opts = opts || {};
    return psiaClient(opts.username, opts.password).then(function (client) {
        client.setHost(opts.host);
        return client
        .system
        .getIpAddressByNetworkInterfaceId({ID: opts.id})
        .then(function (res) {
            console.log('[HikSdk.getIpAddressByNetworkInterfaceId]  %s\n%s', opts.host, indentObject(res));
            return parseString(res.data);
        })
        .catch(function (e) {
            if (e.statusText) {
                e = e.statusText;
            }
            console.log('[HikSdk.getIpAddressByNetworkInterfaceId]  request failed: %s\n%s',
                opts.host,
                indentObject(e));
        });
    }).catch(function (e) {
        if (e && e.stack) {
            e = e.stack;
        }
        console.error('[HikSdk.getIpAddressByNetworkInterfaceId]  %s\n%s', opts.host, indentObject(e));
    });
};

self.putIpAddressByNetworkInterfaceId = function (opts) {
    opts = opts || {};
    return psiaClient(opts.username, opts.password).then(function (client) {
        client.setHost(opts.host);
        return client
        .system
        .putIpAddressByNetworkInterfaceId({ID: opts.id, body: xmlBuilder.buildObject(opts.body)})
        .then(function (res) {
            console.log('[HikSdk.putIpAddressByNetworkInterfaceId]  %s\n%s', opts.host, indentObject(res));
            return res;
        })
        .catch(function (e) {
            if (e.statusText) {
                e = e.statusText;
            }
            console.log('[HikSdk.putIpAddressByNetworkInterfaceId]  request failed: %s\n%s',
                opts.host,
                indentObject(e));
        });
    }).catch(function (e) {
        if (e && e.stack) {
            e = e.stack;
        }
        console.error('[HikSdk.putIpAddressByNetworkInterfaceId]  %s\n%s', opts.host, indentObject(e));
    });
};


self.getStreamingChannels = function (opts) {
    opts = opts || {};
    return psiaClient(opts.username, opts.password).then(function (client) {
        client.setHost(opts.host);
        return client
        .streaming
        .getStreamingChannels()
        .then(function (res) {
            console.log('[HikSdk.getStreamingChannels]  %s\n%s', opts.host, indentObject(res));
            return parseString(res.data);
        })
        .catch(function (e) {
            if (e.statusText) {
                e = e.statusText;
            }
            console.log('[HikSdk.getStreamingChannels]  request failed: \n%s', opts.host, indentObject(e));
        });
    }).catch(function (e) {
        if (e && e.stack) {
            e = e.stack;
        }
        console.error('[HikSdk.getStreamingChannels]  %s\n%s', opts.host, indentObject(e));
    });
};


self.putStreamingChannels = function (opts) {
    opts = opts || {};
    return psiaClient(opts.username, opts.password).then(function (client) {
        client.setHost(opts.host);
        return client
        .streaming
        .putStreamingChannels({body: opts.body})
        .then(function (res) {
            console.log('[HikSdk.putStreamingChannels]  %s\n%s', opts.host, indentObject(res));
            return res;
        })
        .catch(function (e) {
            if (e.statusText) {
                e = e.statusText;
            }
            console.log('[HikSdk.putStreamingChannels]  request failed: %s\n%s', opts.host, indentObject(e));
        });
    }).catch(function (e) {
        if (e && e.stack) {
            e = e.stack;
        }
        console.error('[HikSdk.putStreamingChannelById]  %s\n%s', opts.host, indentObject(e));
    });
};


self.getStreamingChannelById = function (opts) {
    opts = opts || {};
    return psiaClient(opts.username, opts.password).then(function (client) {
        client.setHost(opts.host);
        return client
        .streaming
        .getStreamingChannelById({ID: opts.id})
        .then(function (res) {
            console.log('[HikSdk.getStreamingChannelById]  %s\n%s', opts.host, indentObject(res));
            return parseString(res.data);
        })
        .catch(function (e) {
            if (e.statusText) {
                e = e.statusText;
            }
            console.log('[HikSdk.getStreamingChannelById]  request failed: %s\n%s', opts.host, indentObject(e));
        });
    }).catch(function (e) {
        if (e && e.stack) {
            e = e.stack;
        }
        console.error('[HikSdk.getStreamingChannelById]  %s\n%s', opts.host, indentObject(e));
    });
};


self.putStreamingChannelById = function (opts) {
    opts = opts || {};
    return psiaClient(opts.username, opts.password).then(function (client) {
        client.setHost(opts.host);
        return client
        .streaming
        .putStreamingChannelById({ID: opts.id, body: opts.body})
        .then(function (res) {
            console.log('[HikSdk.putStreamingChannelById]  %s\n%s', opts.host, indentObject(res));
            return res;
        })
        .catch(function (e) {
            if (e.statusText) {
                e = e.statusText;
            }
            console.log('[HikSdk.putStreamingChannelById]  request failed: %s\n%s', opts.host, indentObject(e));
        });
    }).catch(function (e) {
        if (e && e.stack) {
            e = e.stack;
        }
        console.error('[HikSdk.putStreamingChannelById]  %s\n%s', opts.host, indentObject(e));
    });
};


exports.hiksdk = self;
