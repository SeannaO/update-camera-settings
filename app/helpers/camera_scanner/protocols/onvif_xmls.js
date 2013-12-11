var getRtspUrlXmlTemplate =  '<?xml version=\'1.0\' encoding=\'utf-8\'?>'
+ '<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:wsdl="http://www.onvif.org/ver10/media/wsdl" xmlns:sch="http://www.onvif.org/ver10/schema">\n'
+ '   <soap:Header/>\n'
+ '   <soap:Body>\n'
+ '      <wsdl:GetStreamUri>\n'
+ '         <wsdl:StreamSetup>\n'
+ '            <sch:Stream>RTP-Unicast</sch:Stream>\n'
+ '            <sch:Transport>\n'
+ '               <sch:Protocol>RTSP</sch:Protocol>\n'
+ '            </sch:Transport>\n'
+ '         </wsdl:StreamSetup>\n'
+ '         <wsdl:ProfileToken>{profile_token}</wsdl:ProfileToken>\n'
+ '      </wsdl:GetStreamUri>\n'
+ '   </soap:Body>\n'
+ '</soap:Envelope>\n';


var getProfileXmlTemplate = '<?xml version=\'1.0\' encoding=\'utf-8\'?>'
+ '<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:wsdl="http://www.onvif.org/ver10/media/wsdl">\n'
+ '   <soap:Header/>\n'
+ '   <soap:Body>\n'
+ '      <wsdl:GetProfile>\n'
+ '         <wsdl:ProfileToken>{profile_token}</wsdl:ProfileToken>\n'
+ '      </wsdl:GetProfile>\n'
+ '   </soap:Body>\n'
+ ' </soap:Envelope>\n';


var getProfilesListXmlTemplate = '<?xml version=\'1.0\' encoding=\'utf-8\'?>'
+ '<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:wsdl="http://www.onvif.org/ver10/media/wsdl">\n'
+ '   <soap:Header/>\n'
+ '   <soap:Body>\n'
+ '      <wsdl:GetProfiles/>\n'
+ '   </soap:Body>\n'
+ '</soap:Envelope>\n';


var getRtspUrlXml = function( profile_token ) {
	return getRtspUrlXmlTemplate.replace('{profile_token}', profile_token );
};

var getProfileXml = function( profile_token ) {
	return getProfileXmlTemplate.replace('{profile_token}', profile_token );
};

var getProfilesListXml = function() {
	return getProfilesListXmlTemplate;
};

exports.getRtspXml = getRtspUrlXml;
exports.getProfileXml = getProfileXml;
exports.getProfilesListXml = getProfilesListXml;


