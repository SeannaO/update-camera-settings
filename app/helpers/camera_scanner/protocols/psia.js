//
// onvif.js
//
// talks to psia cameras 
//

var request = require('request');

var testIpForPsiaCamera = function( ip, cb ) {
    request({ 
            method: 'GET', 
            uri: 'http://' + ip + '/PSIA/index',
            timeout: 5000
        }, function (error, response, body) {
            if ( !error && body.length === 0 && response.statusCode !== 404 ) {
                console.log(ip);
                console.log('unauthorized');
                console.log(body);
                cb( error, 'unauthorized', ip );
            } else if ( !error && body.indexOf("psialliance-org") > -1 ) {
                console.log(ip);
                console.log('psia');
                console.log(body);
				cb( error, 'psia', ip );
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
var findPsiaCamera = function( ipPrefix, cb ) {
    
    var total = 0;
    
    var ipList = [];

    for (var i = 1; i <= 254; i++) {
        
        var ip = ipPrefix + "." + i;
        testIpForPsiaCamera(ip, function( err, status, ip ) {
            total++;
            if (total == 254) cb(ipList);
            
            if (err) {
            } 
            else if (status !== '') {
                ipList.push({ip: ip, status: status});
            }
            else {
                total++;   
                if (total == 255) cb(ipList);
            }
        });
    }
};
// - - end of findPsiaCamera
// - - - - - - - - - - - - - - - - - - - -

// exports
exports.scan = findPsiaCamera;

