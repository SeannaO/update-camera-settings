//
// onvif.js
//
// talks to onvif cameras 
//

var request = require('request');

var dummySoapMsg = "<?xml version='1.0' encoding='utf-8'?>" +
					"<soapenv:Envelope xmlns:soapenv=\"http://www.w3.org/2003/05/soap-envelope\">" +
					"  <soapenv:Body>" +
					"    <ns0:some_operation xmlns:ns0=\"http://some_ns_uri\"/>" +
					"  </soapenv:Body>" +
					"</soapenv:Envelope>";
/**
 * testIpForOnvifCamera
 *
 */
var testIpForOnvifCamera = function( ip, cb ) {
    var post = request({ 
            method: 'POST', 
			body: dummySoapMsg,
			headers: {
				'Content-Type': "text/soap+xml; charset=utf-8"
			},
            uri: 'http://' + ip + '/onvif/device_service',
            timeout: 5000
        }, function (error, response, body) {
            if ( !error &&  body.indexOf("www.onvif.org") != -1 ) {
                cb( error, true, ip );
            } else {
                cb( error, false, ip );
            }
    });
};
// - - end of testIpForOnvifCamera
// - - - - - - - - - - - - - - - - - - - -


/**
 * findOnvifCamera
 *
 */
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
};
// - - end of findOnvifCamera
// - - - - - - - - - - - - - - - - - - - -

// exports
exports.scan = findOnvifCamera;



