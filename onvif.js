var request = require('request');


//
var testIpForOnvifCamera = function( ip, cb ) {
    request({ 
            method: 'GET', 
            uri: 'http://' + ip + '/onvif/device_service',
            timeout: 5000
        }, function (error, response, body) {
            if ( !error ) {
                if ( body.indexOf("SOAP-ENV") != -1) {
                    cb( error, true, ip );
                } else {
                    cb( error, false, ip );
                }
            } else {
                cb( error, false, ip );
            }
    });
}

//
var findOnvifCamera = function( ipPrefix, cb ) {
    
    var total = 0;
    
    var ipList = [];

    for (var i = 1; i <= 254; i++) {
        
        var ip = ipPrefix + "." + i;
        testIpForOnvifCamera(ip, function( err, found, ip ) {
            total++;
            if (total == 254) cb(ipList);
            
            if (err) {
                // console.log("sorry, there was an error: " + err);
            } 
            else if (found) {
                ipList.push(ip);
            }
            else {
                total++;   
                if (total == 254) cb(ipList);
            }
        });
    }
}

exports.scan = findOnvifCamera

