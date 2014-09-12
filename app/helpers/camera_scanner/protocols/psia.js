//
// onvif.js
//
// talks to psia cameras 
//

var request = require('request');

var testIpForPsiaCamera = function( ip, cb ) {
	// if (ip !== '192.168.215.102') {
	// 	cb( '', '', 0);
	// 	return;
	// }
    request({ 
            method: 'GET', 
            uri: 'http://' + ip + '/PSIA/index',
			timeout: 8000
			// pool: {maxSockets: 600}
        }, function (error, response, body) {
            if ( !error && body.length === 0 && response.statusCode !== 404 ) {
                // console.log(ip);
                // console.log('unauthorized');
                // console.log(body);
                cb( error, 'unauthorized', ip );
            } else if ( !error && body.indexOf("psialliance-org") > -1 ) {
                // console.log(ip);
                // console.log('missing camera stream(s)');
                // console.log(body);
				cb( error, 'missing camera stream(s)', ip );
			} else {
                cb( error, '', ip );
            }
    });
};
// - - end of testIpForPsiaCamera
// - - - - - - - - - - - - - - - - - - - -


/**
 * findPsiaCamera
 *
 */
var findPsiaCamera = function( ipPrefix, emitter, progress, cb ) {
    
    var total = 0;
    
    var ipList = [];

    for (var i = 1; i <= 254; i++) {
        
        var ip = ipPrefix + "." + i;
        testIpForPsiaCamera(ip, function( err, status, ip ) {

			emitter.emit('progress', {
				progress: 0.5 * progress++ / 254,
				protocol: 'psia'
			});

            if (err) {
            } 
            else if (status !== '') {
				emitter.emit('camera',{
					ip: ip,
					protocol: 'psia'
				});
                ipList.push({ip: ip, status: status});
            }
            
			total++;
            
            if (total >= 254) {
				console.log("done scanning psia cameras " + ipList.length);
				console.log(cb);
				cb(ipList);
			}
        });
    }
};
// - - end of findPsiaCamera
// - - - - - - - - - - - - - - - - - - - -

// exports
exports.scan = findPsiaCamera;

