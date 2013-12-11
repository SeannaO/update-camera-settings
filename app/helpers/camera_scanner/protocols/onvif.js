//
// onvif.js
//
// talks to onvif cameras 
//

var request = require('request');
var onvif_xmls = require('./onvif_xmls.js');

var dummySoapMsg = '<?xml version=\'1.0\' encoding=\'utf-8\'?>' +
					'<soapenv:Envelope xmlns:soapenv=\"http://www.w3.org/2003/05/soap-envelope\">' +
					'  <soapenv:Body>' +
					'    <ns0:some_operation xmlns:ns0=\"http://some_ns_uri\"/>' +
					'  </soapenv:Body>' +
					'</soapenv:Envelope>';
/**
 * testIpForOnvifCamera
 *
 */
var testIpForOnvifCamera = function( ip, cb ) {
    request({ 
            method: 'POST', 
			body: onvif_xmls.getProfilesListXml(),
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



var soapRequest = function( ip, xml, cb ) {    
	request({ 
            method: 'POST', 
			body:  xml,
			headers: {
				'Content-Type': "text/soap+xml; charset=utf-8"
			},
            uri: 'http://' + ip + '/onvif/device_service',
            timeout: 5000
        }, function (error, response, body) {
            if ( !error &&  body.indexOf("www.onvif.org") != -1 ) {
                cb( error, body );
            } else {
				console.log("not onvif");
                cb( error );
            }
		}
	);
};


var getRtspUrl = function(ip, profile_token, cb) {

	//var xml = onvif_xmls.getRtspXml( profile_token );
	var xml = onvif_xmls.getProfilesListXml();
	soapRequest( ip, xml, function(err, data) {
		cb( err, data, ip );
	});
};


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
                if (total == 255) cb(ipList);
            }
        });
    }
};
// - - end of findOnvifCamera
// - - - - - - - - - - - - - - - - - - - -


var parseXml = function( xml, attr, begin, end, beginStr, endStr ) {
	
	beginStr = beginStr || ':'+attr+'>';
	endStr = endStr		|| '</';

	var json = [];

	var i = 0;
	var keepSearching = true;

	while ( keepSearching ) {
		var beginAttrIndex = xml.indexOf( beginStr, i ) + beginStr.length;	
		var endAttrIndex = xml.indexOf( endStr, beginAttrIndex );
		var nextAttrIndex = xml.indexOf( beginStr, endAttrIndex) + beginStr.length;	
		
		keepSearching = ( nextAttrIndex <= end )  && (nextAttrIndex > i ) && (nextAttrIndex > -1);
		i = nextAttrIndex;

		if (keepSearching) {
			var attrVal = xml.substring( beginAttrIndex, endAttrIndex );
			json.push({ val: attrVal, begin: beginAttrIndex });
		}
	}
	return json;
};


var xmlParser = function( xml ) {
	
	var names = parseXml( xml, "Name", 0, xml.length );
	var token = parseXml( xml, 'token', 0, xml.length, 'token="', '"');
		
	for (var i in names ) {
//		console.log(names[i].val);
	}
};


// exports
exports.scan = findOnvifCamera;
exports.getRtspUrl = getRtspUrl;

