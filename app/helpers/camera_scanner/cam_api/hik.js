var request = require('request');
var xml2js  = require('xml2js').parseString;
var async   = require('async');
var _       = require('lodash');


var requestXML = 
        '<?xml version:"1.0" encoding="UTF-8"?><StreamingChannel xmlns="urn:psialliance-org" version="1.0">'
        + '<id>{channel}</id>'
        + '<channelName>Solink 01</channelName>'   // TODO: test if ok to have empty name
        + '<enabled>true</enabled>'
        + ' <Video>'
        +   '<enabled>true</enabled>'
        +   '<videoInputChannelID>1</videoInputChannelID>'
        +   '<videoCodecType>H.264</videoCodecType>'
        +       '<videoResolutionWidth>{width}</videoResolutionWidth>'
        +       '<videoResolutionHeight>{height}</videoResolutionHeight>'
        +       '<videoQualityControlType>vbr</videoQualityControlType>'
        +       '<vbrUpperCap>{bitrate}</vbrUpperCap>'
        +       '<vbrLowerCap>32</vbrLowerCap>'
        +       '<fixedQuality>60</fixedQuality>'
        +       '<maxFrameRate>{fps}</maxFrameRate>'
        +   '</Video>'
        +   '</StreamingChannel>';

        //TODO: GOP Interval
        // <GovLength>12</GovLength>
        //
        // GOP capabilities:
        // <GovLength min="1" max="400">12</GovLength>

var configURL = 'http://{username}:{password}@{ip}/PSIA/Streaming/Channels/{channel}';
var rtsp_url = 'rtsp://{username}:{password}@{ip}/Streaming/Channels/{channel}';


/**
 * getResolutions
 *
 * get capabilities supported by a given channel:
 *      - resolutions
 *      - fps
 *      - bitrates
 *
 * @param { String } ip          ip of camera
 * @param { String } username    camera username
 * @param { String } password    camera password
 * @param { Number } channel     channel
 *
 * @param { function } cb(err, resolutions, fpsData, bitrates)  callback function, where:
 *          - { String } err      'null' if no errors
 *          - { Arrray } resolutions   array of resolution objects, containing:
 *                                      - { String } name    name of resolution (eg. "800x600 - ch 1")
 *                                      - { String } value   resolution in the format: width x height ("800x600")
 *          - { Array } fpsData   array of supported fps (HIK multiplies fps by 100, so 30fps = 3000)
 *          - { Object } bitrates   object containing max and min bitrates, eg.: { min: 5, max: 1000 }
 */
var getResolutions = function( ip, username, password, channel, cb ) {

    var url = 'http://' + username + ':' + password + '@' + ip + '/streaming/channels/' + channel + '/capabilities';

    request({
        url: url,
        headers: {
            'User-Agent': 'nodejs'
        },
        timeout: 10000
    }, function(err, res, body) {
        if(err) {
            if (cb) cb(err, []);
            return;
        }
        if(!body) {
            if(cb)	cb('empty response', []);
            return;
        }
        xml2js(body, function(err, data){
            if (body.indexOf('Invalid Operation') >= 0
                || body.indexOf('Unauthorized') >= 0) {
                    if(cb) cb('not authorized', []);
                    return;
                }
            var resolutions = [];
            var fpsData = [];
            var bitrates = {};

            if (!data) {
                if(cb) { cb('could not parse response from channel ' + channel, []); }
                return;
            }

            if (!data.StreamingChannel) {
                if(cb) cb('invalid response from channel ' + channel+ ': no StreamingChannel tag', []);
                return;
            }

            data = data.StreamingChannel;
            if (!data.Video) {
                if(cb) cb('invalid response from channel ' + channel + ': no Video tag', []);
                return;
            }

            // resolutions
            data = data.Video[0];
            if (!data.videoResolutionWidth || !data.videoResolutionWidth[0]) {
                if(cb) cb('invalid response from channel ' + channel + ': no videoResolutionWidth tag', []);
                return;
            }
            //TODO: check videoResolutionHeight

            // bitrate range
            if (!data.constantBitRate || !data.constantBitRate[0] || !data.constantBitRate[0]['$']) {
                console.error('[Hik]  no bitrate options found for channel ' + channel + ', using default 512');
                bitrates.min = '512';
                bitrates.max  = '512';
            } else {
                bitrates.min = data.constantBitRate[0]['$'].min || '512';
                bitrates.max = data.constantBitRate[0]['$'].max || '512';
            }

            // fps options
            if (!data.maxFrameRate || !data.maxFrameRate[0]) {
                fpsData.push( '1500' );
            }
            else {
                var fpsOpts = data.maxFrameRate[0]['$'];
                if(!fpsOpts || !fpsOpts.opt) {
                    fpsData.push('1500');
                } else {
                    fpsOpts = fpsOpts.opt;
                    fpsOpts = fpsOpts.split(',');
                    for(var i in fpsOpts) {
                        fpsData.push( parseInt( fpsOpts[i] ) );
                    }
                }
            }
            // --

            data = data.videoResolutionWidth[0]['$'];
            if (!data || !data.opt) {
                if(cb) cb('invalid response from channel ' + channel + ': no opt tag', []);
                return;
            }

            var values = data.opt;
            values = values.split(',');
            for(var i in values) {
                if (!values[i]) continue;
                values[i] = values[i].replace('*', 'x');
                values[i] = _.trim( values[i] );
                resolutions.push({
                    name:   values[i] + ' - ch ' + channel,
                    value:  values[i]
                });
            }
            if (cb) cb(null, resolutions, fpsData, bitrates);
        });
    }
    );
};


var Hik = function() {
    this.password;
    this.username;
    this.ip;

    this.resolution2channel          = {};
    this.fpsOptionsPerChannel        = {};
    this.bitrateOptionsPerChannel    = {};
    this.resolutionOptionsPerChannel = {};
};


Hik.prototype.apiName = function() {
    return 'hik';
};


Hik.prototype.checkForExistingProfile = function( profileName, cb ) {
};


Hik.prototype.isProfileH264 = function( profileId, cb ){

};


Hik.prototype.updateProfile = function(profileId, profile, cb) {

};


/**
 * getNumberOfChannels
 *
 * return number of channels supported by camera
 * determined by counting number of <StreamingChannel> tags
 *
 * @param { function } cb(err, nChannels)  callback function, where:
 *          - { String } err          'null' if no errors
 *          - { Number } nChannels    number if supported channels
 */
Hik.prototype.getNumberOfChannels = function( cb ) {

    if (!cb || typeof(cb) !== 'function') { cb = function() {}; }

    var url = 'http://' + this.username + ':' + this.password + '@' + this.ip + '/streaming/channels';

    request({
        url: url,
        headers: {
            'User-Agent': 'nodejs'
        },
        timeout: 10000
    }, function(err, res, body) {

        if ( err ) {
            return cb(err);
        } else if ( !body ) {
            return cb('empty response');
        } else if ( 
            body.indexOf('Invalid Operation') >= 0 ||
            body.indexOf('Unauthorized') >= 0 
        ) {
            return cb('not authorized');
        }

        var nChannels = (body.match(/<StreamingChannel /g) || []).length;

        if (!nChannels) {
            console.error('[HIK : getNumberOfChannels]  could not parse number of channels');
            return cb('could not parse number of channels');
        }
        
        cb( null, nChannels );
    });
};


/**
 * getRtspUrl
 *
 * return rtsp url and channel corresponding to desired settings, 
 * configuring camera as necessary
 *
 * @param { Object } profile    object containing stream settings:
 *                              - { String } resolution ("800x600")
 *                              - { Number } channel
 *                              - { Number } fps
 *                              - { Number } bitrate
 *
 * @param { function } cb(url, channel)  callback function
 *
 */
Hik.prototype.getRtspUrl = function ( profile, cb ) {

	var self = this;

    // insert dummy resolution to handle empty resolution response during camera setup
    profile.resolution = profile.resolution || '800x600';
    profile.resolution = _.trim( profile.resolution );

    var resolution = profile.resolution.split('x');

    self.getResolutionOptions( function(err) {

        if (err) { 
            console.error('[HIK.getRtspUrl]  error when getting resolutions from camera: ' + err);
        }

        var channel = profile.channel || self.resolution2channel[ profile.resolution ];

        if (
            !self.resolutionOptionsPerChannel[ channel ] ||
            !Hik.hasResolution( self.resolutionOptionsPerChannel[ channel ], profile.resolution )
        ) {

            channel = self.resolution2channel[ profile.resolution ] || 1;
            console.error('[HIK.getRtspUrl]  channel x resolution mismatch; switching channel to ' + channel);
        }

        if ( isNaN(channel) ) {
            console.error('[HIK.getRtspUrl]  could not determine a channel, using default 1');
            channel = 1; // default channel
        }

        if (channel < 1 || channel > self.nChannels) {
            console.error('[HIK.getRtspUrl]  invalid channel: ' + channel + '; using default 1');
            channel = 1;
        }

        var width   = resolution[0];
        var height  = resolution[1];
        var fps     = profile.framerate || 15;
        var bitrate = profile.bitrate || 512;

        fps *= 100;

        var minDiff,
            minFps;

        var fpsOpts = self.fpsOptionsPerChannel[channel];

        for (var i in fpsOpts) {
            var diff = Math.abs( fps - fpsOpts[i] );

            if (isNaN(minDiff) || diff < minDiff) {
                minFps  = fpsOpts[i];
                minDiff = diff;
            }
        }

        if (minFps) { 
            fps = minFps; 
        } else { 
            console.error('[HIK.getRtspUrl]  could not resolve fps, using ' + fps); 
        }

        var url = rtsp_url
            .replace('{ip}', self.ip)
            .replace('{channel}', channel)
            .replace('{username}', self.username)
            .replace('{password}', self.password);

        self.configCamera({
            channel:  channel,
            width:    width,
            height:   height,
            bitrate:  bitrate,
            fps:      fps
        }, function(err, body) {
            if(cb) cb(url, channel);
        });
    });
};


/**
 * configCamera
 *
 * configure camera through its API,
 * using desired settings
 *
 * @param { Object } params    object containing desired settings:
 *                              - { String } channel
 *                              - { Number } width
 *                              - { Number } height
 *                              - { Number } bitrate
 *                              - { Number } fps
 *
 * @param { function } cb(err, body)  callback function
 *
 */
Hik.prototype.configCamera = function(params, cb) {

    var xml = requestXML
        .replace('{channel}',   params.channel)
        .replace('{width}',     params.width)
        .replace('{height}',    params.height)
        .replace(/{bitrate}/g,  params.bitrate)
        .replace('{fps}',       params.fps);

    var url = configURL
        .replace('{username}',  this.username)
        .replace('{password}',  this.password)
        .replace('{ip}',        this.ip)
        .replace('{channel}',   params.channel);

    request({ 
        method: 'PUT', 
        body: xml,
        headers: {
            'Content-Type': "text/xml; charset=utf-8",
        },
        uri: url,
        timeout: 5000
    }, function (error, response, body) {
        if(cb) cb( error, body );
    });
};


/**
 * getResolutionAsyncHelper
 *
 * auxiliary function to get resolution from multiple channels using async
 * @param { Hik object }  hik
 * @param { Number }  channel
 * @param { Object }  d    auxiliary object containing:
 *                          - { Array } resolutions
 *                          - { Array } bitrates
 *                          
 * @return { Function } async function
 *
 */
var getResolutionAsyncHelper = function( hik, channel, d ) {
                
    var r = function(callback) {

        getResolutions(hik.ip, hik.username, hik.password, channel, function(err, res, fpsData, bps) {

            for (var i in res) {
                if ( !d.currentResolutions[ res[i].name ] ) {
                    d.currentResolutions[ res[i].name ] = true;
                    if (
                        !hik.resolution2channel[ res[i].value ] ||
                        channel == 2
                    ) {
                        // this makes it consistent with the previous vms versions,
                        // where higher channels (ie, channel 2) would overwrite the resolution mapping
                        hik.resolution2channel[ res[i].value ] = channel;
                    }
                    d.resolutions.push( res[i] );
                }
            }

            hik.addFpsOptions( channel, fpsData );
            hik.addBitrateOptions( channel, bps );
            hik.addResolutionOptions( channel, res );

            d.bitrates = bps; // TODO: merge
            callback(err);
        });
    };

    return r;
};


/**
 * getResolutionOptions
 *
 * get capabilities supported by all channels:
 *      - resolutions
 *      - fps
 *      - bitrates
 *
 * updates number of channels and capabilities per channel attributes
 *
 * @param { function } cb(err, resolutions, bitrates, dataPerChannel)  callback function, where:
 *          - { String } err      'null' if no errors
 *          - { Arrray } resolutions   array of resolution objects, containing:
 *                                      - { String } name    name of resolution (eg. "800x600 - ch 1")
 *                                      - { String } value   resolution in the format: width x height ("800x600")
 *          - { Object } bitrates   object containing max and min bitrates, eg.: { min: 5, max: 1000 }
 *          - { Object } dataPerChannel   onbject containing capabilities per channel data:
 *                                      - { Number } nChannels
 *                                      - { Object } resolutionsPerChannel
 *                                      - { Object } fpsOptionsPerChannel
 *                                      - { Object } bitrateOptionsPerChannel
 *
 */
Hik.prototype.getResolutionOptions = function(cb) {

    var self = this;

    if (!this.ip) {
        if(cb) cb('no ip');
        return;
    }
    
    var currentResolutions = {};

    var resolutions = [],
        bitrates;

    var error; 

    this.getNumberOfChannels( function( err, nChannels ) {

        if (err) {
            return cb(err, []);
        }

        if (nChannels == 0) {
            return cb('0 channels');
        }

        self.nChannels = nChannels;

        var tasks = [];
        for (var ch = 1; ch <= nChannels; ch++) {
            tasks.push(
                getResolutionAsyncHelper( self, ch, {
                    currentResolutions:  currentResolutions,
                    resolutions:         resolutions,
                    bitrates:            bitrates
                })
            );
        }

        async.parallel( 
            tasks, 
            function( err ) {

                if( err ) {
                    cb(err, []);
                } else {
                    cb( null, resolutions, bitrates, {
                        nChannels:              self.nChannels,
                        resolutionsPerChannel:  self.resolutionOptionsPerChannel,
                        frameratePerChannel:    self.fpsOptionsPerChannel,
                        bitratesPerChannel:     self.bitrateOptionsPerChannel
                    });
                }
            }
        );
    });
};


Hik.prototype.addResolutionOptions = function( channel, resolutionData ) {
    var self = this;

    self.resolutionOptionsPerChannel[channel] = [];
    for(var i in resolutionData) {
        self.resolutionOptionsPerChannel[channel].push( resolutionData[i] );
    }
};


Hik.prototype.addFpsOptions = function( channel, fpsData ) {
    var self = this;

    self.fpsOptionsPerChannel[channel] = [];
    for(var i in fpsData) {
        self.fpsOptionsPerChannel[channel].push( fpsData[i] );
    }
};


Hik.prototype.addBitrateOptions = function( channel, bitrateData ) {
    if (!bitrateData) { return; }

    this.bitrateOptionsPerChannel[channel] = {
        min:  bitrateData.min,
        max:  bitrateData.max
    };
};


Hik.prototype.setCameraParams = function(params) {

    this.password = params.password || this.password;
    this.username = params.username || this.username;
    this.ip       = params.ip || this.ip;
};


Hik.prototype.getFrameRateRange = function() {
    return 0;
};


Hik.prototype.getVideoQualityRange = function() {
    return 0;
};


Hik.prototype.setMotionParams = function(params){

};


Hik.prototype.setupMotionDetection = function(cam){
};


Hik.prototype.startListeningForMotionDetection = function(cam, cb){
};


Hik.prototype.stopListeningForMotionDetection = function(){
};


Hik.getResolutions = getResolutions;

Hik.hasResolution = function( resOptions, res ) {

    for (var i in resOptions) {
        if (resOptions[i].value == res) { return true; }
    }

    return false;
};


module.exports = Hik;
