var request = require('../../../node_modules/request');

var my_recipient_name = 'solink_123';
var my_rule_name = 'solink_123_motion';
var my_ip = process.env['IP'];

var default_sensitivity = 50;
var default_motion_history = 50;
var default_object_size = 15;

var setMotionWindowUrl = 'http://{username}:{password}@{cam_ip}/axis-cgi/param.cgi?action=add&template=motion&group=Motion&Motion.M.Name=Solink%20Window&Motion.M.ImageSource=0&Motion.M.Left=0&Motion.M.Right=9999&Motion.M.Top=0&Motion.M.Bottom=9999&Motion.M.WindowType=include&Motion.M.Sensitivity={sensitivity}&Motion.M.History={motion_history}&Motion.M.ObjectSize={object_size}';

var deleteWindowUrl = 'http://{username}:{password}@{cam_ip}/axis-cgi/param.cgi?action=remove&template=motion&group=Motion.M0';
var getWindowInfoUrl = 'http://{username}:{password}@{cam_ip}/axis-cgi/param.cgi?action=list&template=motion&group=Motion.M0';


// SOAPAction: http://www.axis.com/vapix/ws/action1/GetActionRules
var getActionRulesMsg = '<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:aa="http://www.axis.com/vapix/ws/action1" xmlns:wsnt="http://docs.oasis-open.org/wsn/b-2" xmlns:tns1="http://www.onvif.org/ver10/topics" xmlns:tnsaxis="http://www.axis.com/2009/event/topics" xmlns:soap="http://www.w3.org/2003/05/soap-envelope"><soap:Body><aa:GetActionRules xmlns="http://www.axis.com/vapix/ws/action1"></aa:GetActionRules></soap:Body></soap:Envelope>';


// SOAPAction: http://www.axis.com/vapix/ws/action1/AddRecipientConfiguration
var addRecipientConfigurationMsg = '<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:aa="http://www.axis.com/vapix/ws/action1" xmlns:wsnt="http://docs.oasis-open.org/wsn/b-2" xmlns:soap="http://www.w3.org/2003/05/soap-envelope"><soap:Body><aa:AddRecipientConfiguration xmlns="http://www.axis.com/vapix/ws/action1"><NewRecipientConfiguration><TemplateToken>com.axis.recipient.tcp</TemplateToken><Name>{recipient_name}</Name><Parameters><Parameter Name="host" Value="{ip}"></Parameter><Parameter Name="port" Value="{port}"></Parameter><Parameter Name="qos" Value="0"></Parameter></Parameters></NewRecipientConfiguration></aa:AddRecipientConfiguration></soap:Body></soap:Envelope>';

//http://192.168.215.66/axis-cgi/param.cgi?action=add&template=motion&group=Motion&Motion.M.Name=Solink%20Window
//

// SOAPAction:http://www.axis.com/vapix/ws/action1/RemoveActionRule
var removeActionRuleMsg = '<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:aa="http://www.axis.com/vapix/ws/action1" xmlns:wsnt="http://docs.oasis-open.org/wsn/b-2" xmlns:tns1="http://www.onvif.org/ver10/topics" xmlns:tnsaxis="http://www.axis.com/2009/event/topics" xmlns:soap="http://www.w3.org/2003/05/soap-envelope"><soap:Body><aa:RemoveActionRule xmlns="http://www.axis.com/vapix/ws/action1"><RuleID>{rule_id}</RuleID></aa:RemoveActionRule></soap:Body></soap:Envelope>';


// SOAPAction:http://www.axis.com/vapix/ws/action1/RemoveRecipientConfiguration
var removeRecipientConfigurationMsg = '<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:aa="http://www.axis.com/vapix/ws/action1" xmlns:wsnt="http://docs.oasis-open.org/wsn/b-2" xmlns:soap="http://www.w3.org/2003/05/soap-envelope"><soap:Body><aa:RemoveRecipientConfiguration xmlns="http://www.axis.com/vapix/ws/action1"><ConfigurationID>{configuration_id}</ConfigurationID></aa:RemoveRecipientConfiguration></soap:Body></soap:Envelope>';

// http://www.axis.com/vapix/ws/action1/RemoveActionConfiguration
var removeActionConfigurationMsg = '<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:aa="http://www.axis.com/vapix/ws/action1" xmlns:wsnt="http://docs.oasis-open.org/wsn/b-2" xmlns:tns1="http://www.onvif.org/ver10/topics" xmlns:tnsaxis="http://www.axis.com/2009/event/topics" xmlns:soap="http://www.w3.org/2003/05/soap-envelope"><soap:Body><aa:RemoveActionConfiguration xmlns="http://www.axis.com/vapix/ws/action1"><ConfigurationID>{configuration_id}</ConfigurationID></aa:RemoveActionConfiguration></soap:Body></soap:Envelope>';


// SOAPAction: http://www.axis.com/vapix/ws/action1/AddActionConfiguration
var addActionConfigurationMsg = '<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:aa="http://www.axis.com/vapix/ws/action1" xmlns:wsnt="http://docs.oasis-open.org/wsn/b-2" xmlns:tns1="http://www.onvif.org/ver10/topics" xmlns:tnsaxis="http://www.axis.com/2009/event/topics" xmlns:soap="http://www.w3.org/2003/05/soap-envelope"><soap:Body><aa:AddActionConfiguration xmlns="http://www.axis.com/vapix/ws/action1"><NewActionConfiguration><TemplateToken>com.axis.action.notification.tcp</TemplateToken><Name>Send Notification</Name><Parameters><Parameter Name="message" Value=""></Parameter><Parameter Name="period" Value="1"></Parameter><Parameter Name="qos" Value="0"></Parameter><Parameter Name="port" Value="{port}"></Parameter><Parameter Name="host" Value="{ip}"></Parameter></Parameters></NewActionConfiguration></aa:AddActionConfiguration></soap:Body></soap:Envelope>';

// SOAPAction: http://www.axis.com/vapix/ws/action1/GetRecipientConfigurations
var getRecipientConfigurationsMsg = '<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:aa="http://www.axis.com/vapix/ws/action1" xmlns:wsnt="http://docs.oasis-open.org/wsn/b-2" xmlns:soap="http://www.w3.org/2003/05/soap-envelope"><soap:Body><aa:GetRecipientConfigurations xmlns="http://www.axis.com/vapix/ws/action1"></aa:GetRecipientConfigurations></soap:Body></soap:Envelope>';

// SOAPAction:http://www.axis.com/vapix/ws/action1/GetActionConfigurations
var getActionConfigurationsMsg = '<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:aa="http://www.axis.com/vapix/ws/action1" xmlns:wsnt="http://docs.oasis-open.org/wsn/b-2" xmlns:tns1="http://www.onvif.org/ver10/topics" xmlns:tnsaxis="http://www.axis.com/2009/event/topics" xmlns:soap="http://www.w3.org/2003/05/soap-envelope"><soap:Body><aa:GetActionConfigurations xmlns="http://www.axis.com/vapix/ws/action1"></aa:GetActionConfigurations></soap:Body></soap:Envelope>';

/*
 * addActionConfiguration gets the following response:
 *
<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://www.w3.org/2003/05/soap-envelope" xmlns:SOAP-ENC="http://www.w3.org/2003/05/soap-encoding" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:c14n="http://www.w3.org/2001/10/xml-exc-c14n#" xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" xmlns:wsa5="http://www.w3.org/2005/08/addressing" xmlns:xmime="http://tempuri.org/xmime.xsd" xmlns:xop="http://www.w3.org/2004/08/xop/include" xmlns:wsrfbf="http://docs.oasis-open.org/wsrf/bf-2" xmlns:wstop="http://docs.oasis-open.org/wsn/t-1" xmlns:tt="http://www.onvif.org/ver10/schema" xmlns:wsrfr="http://docs.oasis-open.org/wsrf/r-2" xmlns:aa="http://www.axis.com/vapix/ws/action1" xmlns:aev="http://www.axis.com/vapix/ws/event1" xmlns:ali1="http://www.axis.com/vapix/ws/light/CommonBinding" xmlns:ali2="http://www.axis.com/vapix/ws/light/IntensityBinding" xmlns:ali3="http://www.axis.com/vapix/ws/light/AngleOfIlluminationBinding" xmlns:ali4="http://www.axis.com/vapix/ws/light/DayNightSynchronizeBinding" xmlns:ali="http://www.axis.com/vapix/ws/light" xmlns:tan1="http://www.onvif.org/ver20/analytics/wsdl/RuleEngineBinding" xmlns:tan2="http://www.onvif.org/ver20/analytics/wsdl/AnalyticsEngineBinding" xmlns:tan="http://www.onvif.org/ver20/analytics/wsdl" xmlns:tds="http://www.onvif.org/ver10/device/wsdl" xmlns:tev1="http://www.onvif.org/ver10/events/wsdl/NotificationProducerBinding" xmlns:tev2="http://www.onvif.org/ver10/events/wsdl/EventBinding" xmlns:tev3="http://www.onvif.org/ver10/events/wsdl/SubscriptionManagerBinding" xmlns:wsnt="http://docs.oasis-open.org/wsn/b-2" xmlns:tev4="http://www.onvif.org/ver10/events/wsdl/PullPointSubscriptionBinding" xmlns:tev="http://www.onvif.org/ver10/events/wsdl" xmlns:timg="http://www.onvif.org/ver20/imaging/wsdl" xmlns:tptz="http://www.onvif.org/ver20/ptz/wsdl" xmlns:trt="http://www.onvif.org/ver10/media/wsdl" xmlns:ter="http://www.onvif.org/ver10/error" xmlns:tns1="http://www.onvif.org/ver10/topics" xmlns:tnsaxis="http://www.axis.com/2009/event/topics"><SOAP-ENV:Body><aa:AddActionConfigurationResponse><aa:ConfigurationID>17</aa:ConfigurationID></aa:AddActionConfigurationResponse></SOAP-ENV:Body></SOAP-ENV:Envelope>

* then get <aa:ConfigurationID>17</aa:ConfigurationID> for use on next request (addActionRule)
*/

// SOAPAction: http://www.axis.com/vapix/ws/action1/AddActionRule
var addActionRuleMsg = '<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:aa="http://www.axis.com/vapix/ws/action1" xmlns:wsnt="http://docs.oasis-open.org/wsn/b-2" xmlns:tns1="http://www.onvif.org/ver10/topics" xmlns:tnsaxis="http://www.axis.com/2009/event/topics" xmlns:soap="http://www.w3.org/2003/05/soap-envelope"><soap:Body><aa:AddActionRule xmlns="http://www.axis.com/vapix/ws/action1"><NewActionRule><Name>{rule_name}</Name><Enabled>true</Enabled><Conditions><Condition><wsnt:TopicExpression Dialect="http://www.onvif.org/ver10/tev/topicExpression/ConcreteSet">tns1:VideoAnalytics/tnsaxis:MotionDetection</wsnt:TopicExpression><wsnt:MessageContent Dialect="http://www.onvif.org/ver10/tev/messageContentFilter/ItemFilter">boolean(//SimpleItem[@Name="window" and @Value="0"]) and boolean(//SimpleItem[@Name="motion" and @Value="1"])</wsnt:MessageContent></Condition></Conditions><PrimaryAction>{primary_action_id}</PrimaryAction></NewActionRule></aa:AddActionRule></soap:Body></soap:Envelope>';

// post to:
// /vapix/services?timestamp=1389871957192
//
// headers:
// SOAPAction: http://www.axis.com/vapix/ws/action1/AddRecipientConfiguration
// Authorization:Digest username="root", realm="AXIS_00408CE8314F", nonce="000768b2Y5798222dfb9c0651d64b73edae7037f150898", uri="/vapix/services?timestamp=1389871957192", response="2e6f5ca055b72e1a0c6d5b0b9eececa7", qop=auth, nc=00000001, cnonce="6320fc1746f2f3d7"
//

/**
 * sendSoapMessage
 *
 */
var sendSoapMessage = function( ip, username, password, soap_action, msg, cb ) {
    request({ 
            method: 'POST', 
			body: msg,
			headers: {
				'Content-Type': "text/soap+xml; charset=utf-8",
				'SOAPAction': 'http://www.axis.com/vapix/ws/action1/AddRecipientConfiguration'	
			},
			uri: 'http://' + username + ':' + password + '@' + ip + '/vapix/services?timestamp='+Date.now(),
            timeout: 5000
        }, function (error, response, body) {
			cb( error, false, body );
		});
};
// - - end of sendSoapMessage
// - - - - - - - - - - - - - - - - - - - -
//

var deleteWindow = function( cam_ip, cb ) {
	var url = deleteWindowUrl
		.replace('{username}', 'root')
		.replace('{password}', 'admin')
		.replace('{cam_ip}', cam_ip);

    request({ 
            method: 'GET',
			headers: {
				'Content-Type': "text/soap+xml; charset=utf-8",
			},
			uri: url,
            timeout: 5000
        }, function (error, response, body) {
			cb( error, response, body );
		});
};


var getWindowInfo = function( cam_ip, username, password, cb ) {
	var url = getWindowInfoUrl
		.replace('{username}', username)
		.replace('{password}', password)
		.replace('{cam_ip}', cam_ip);

    request({ 
            method: 'GET',
			headers: {
				'Content-Type': "text/soap+xml; charset=utf-8",
			},
			uri: url,
            timeout: 5000
        }, function (error, response, body) {
			if (error) {
				cb (error);
			} else {
				
				var info = {};

				var sensitivity_regex = /Sensitivity=(\d+)/;
				var history_regex = /History=(\d+)/;
				var object_size_regex = /ObjectSize=(\d+)/;
				
				var sensitivity_match = sensitivity_regex.exec(body);
				var history_match = history_regex.exec(body);
				var object_size_match = object_size_regex.exec(body);
				
				info.sensitivity = sensitivity_match ? sensitivity_match[1] : default_sensitivity;
				info.history = history_match ? history_match[1] : default_motion_history;
				info.object_size = object_size_match ? object_size_match[1] : default_object_size;

				cb( null, info );

			}
		});
};


var setMotion = function( cam_ip, username, password, params, cb ) {

	deleteWindow( cam_ip, function( error, response, body ) {
		
		if (error ) {
			cb( error, response, body );
			return;
		}

		var url = setMotionWindowUrl
		.replace('{username}', username)
		.replace('{password}', password)
		.replace('{cam_ip}', cam_ip)
		.replace('{sensitivity}',  params.sensitivity || default_sensitivity )
		.replace('{motion_history}', params.motion_history || default_motion_history )
		.replace('{object_size}', params.object_size || default_object_size);

		request({ 
			method: 'GET',
			headers: {
				'Content-Type': "text/soap+xml; charset=utf-8",
			},
			uri: url,
			timeout: 5000
		}, function (error, response, body) {
			cb( error, response, body );
		});
	});
};


var getActionRules = function( cam_ip, username, password, cb ) {
	var msg = getActionRulesMsg;

	sendSoapMessage(
		cam_ip, 
		username,
		password,
		'http://www.axis.com/vapix/ws/action1/GetActionRules', 
		msg, 
		function( err, response, body) {
			cb( err, response, body );
		}
	);
};


var getActionConfigurations = function( cam_ip, username, password, cb ) {

	var msg = getActionConfigurationsMsg;

	sendSoapMessage(
		cam_ip, 
		username, 
		password,
		'http://www.axis.com/vapix/ws/action1/GetActionConfigurations', 
		msg, 
		function( err, response, body) {
			cb( err, response, body );
		}
	);
};


var getRecipientConfigurations = function( cam_ip, username, password, cb ) {

	var msg = getRecipientConfigurationsMsg;

	sendSoapMessage(
		cam_ip, 
		username, 
		password,
		'http://www.axis.com/vapix/ws/action1/GetRecipientConfigurations', 
		msg, 
		function( err, response, body) {
			cb( err, response, body );
		}
	);
};


var addRecipient = function( cam_ip, username, password, cb ) {
	
	var msg = addRecipientConfigurationMsg
		.replace('{port}', '8001')
		.replace('{ip}', my_ip)
		.replace('{recipient_name}', my_recipient_name);

	sendSoapMessage(
		cam_ip, 
		username, 
		password,
		'http://www.axis.com/vapix/ws/action1/AddRecipientConfiguration', 
		msg, 
		function( err, response, body) {
			cb( err, response, body );
		}
	);
};


var removeRecipient = function( cam_ip, username, password, configuration_id, cb ) {
	
	var msg = removeRecipientConfigurationMsg
		.replace('{configuration_id}', configuration_id);

	sendSoapMessage(
		cam_ip, 
		username, 
		password,
		'http://www.axis.com/vapix/ws/action1/RemoveRecipientConfiguration', 
		msg, 
		function( err, response, body) {
			cb( err, response, body );
		}
	);
};


var removeActionRule = function( cam_ip, username, password, rule_id, cb ) {
	
	var msg = removeActionRuleMsg
		.replace('{rule_id}', rule_id);

	sendSoapMessage(
		cam_ip, 
		username, 
		password,
		'http://www.axis.com/vapix/ws/action1/RemoveActionRule', 
		msg, 
		function( err, response, body) {
			cb( err, response, body );
		}
	);
};


var removeActionConfiguration = function( cam_ip, username, password, configuration_id, cb ) {
	
	var msg = removeActionConfigurationMsg
		.replace('{configuration_id}', configuration_id);

	sendSoapMessage(
		cam_ip, 
		username, 
		password,
		'http://www.axis.com/vapix/ws/action1/RemoveActionConfiguration', 
		msg, 
		function( err, response, body) {
			cb( err, response, body );
		}
	);
};


var addActionConfig = function( cam_ip, username, password, cb ) {
	
	var msg = addActionConfigurationMsg
		.replace('{port}', '8001')
		.replace('{ip}', my_ip)
		.replace('{recipient_name}', my_recipient_name);

	sendSoapMessage(
		cam_ip, 
		username, 
		password,
		'http://www.axis.com/vapix/ws/action1/AddActionConfiguration', 
		msg, 
		function( err, response, body) {
			cb( err, response, body );
		}
	);

};

var addActionRule = function( cam_ip, username, password, primary_action_id, cb ) {
	
	var msg = addActionRuleMsg
		.replace('{primary_action_id}', primary_action_id)
		.replace('{rule_name}', my_rule_name);
		
	sendSoapMessage(
		cam_ip, 
		username, 
		password,
		'http://www.axis.com/vapix/ws/action1/AddActionRule', 
		msg, 
		function( err, response, body) {
			cb( err, response, body );
		}
	);
};

var addActionConfigAndRule = function( cam_ip, username, password, cb) {
	
	addActionConfig( cam_ip, username, password, function( err, res, body ) {
		if (err) {
			cb(err);
			return;
		}
		var id_regex = /ConfigurationID>(\d+)</;
		var match = id_regex.exec( body );
		if (!match) {
			cb ('could not find a configuration id on the camera');
		} else {
			addActionRule( cam_ip, username, password, match[1], function( err, res, body ) {
				cb( err );
			});
		}
	});
};


var configureMotion = function(cam_ip, username, password, name, params, cb) {

	my_recipient_name = name;
	my_rule_name = name;
	my_ip = process.env['IP'];

	setMotion( cam_ip, username, password, params, function( err, res, body ) {					// motion window
		if (err) {
			cb (err);
			return;
		}
		recreateRecipient( cam_ip, username, password, function( err, res, body ) {
			if (err) {
				cb(err);
				return;
			}
			recreateActionConfigandRule( cam_ip, username, password, function( err, res, body ) {
				cb(err);
			});
		});
	});
};

/*
configureMotion('192.168.215.66', 
		{
			motion_history: 1,
			object_size: 2,
			sensitivity: 3
		}, 
		function( err ) {
		});
*/


var recreateRecipient = function( cam_ip, username, password, cb ) {

	getRecipientConfigurations(cam_ip, username, password, function( err, response, body ) {

		if (err || !body) {
			console.error('[axis_motion.js / recreateRecipient] : empty body | ' + err);
			cb(err + ' | empty body', res, null);
		}

		var names = parseXml(body, 'Name', 0, body.length);
		var ids = parseXml(body, 'ConfigurationID', 0, body.length);
		
		for (var i in names) {
			if (names[i].val === my_recipient_name && ids[i]) {
				console.log('id: ' + ids[i].val);
				console.log('found recipient; removing...');
				removeRecipient( cam_ip, username, password, ids[i].val, function( err, response, body ) {

					addRecipient( cam_ip, username, password, function( err, res, body ) {
						if (err) console.log(err);
						console.log('done');
						cb (err, res, body);
					});
				});
				return;
			}
		}

		addRecipient( cam_ip, username, password, function( err, res, body ) {
			if (err) console.log(err);
			console.log('done');
			cb( err, res, body );
		});

		console.log('could not find any recipient matching ' + my_recipient_name);
	});
};


var recreateActionConfigandRule = function( cam_ip, username, password, cb ) {

	getActionRules(cam_ip, username, password, function( err, response, body ) {

		if (err || !body) {
			console.error('[axis_motion.js / recreateActionConfigandRule] : empty body | ' + err);
			cb(err + ' | empty body');
			return;
		}

		var names = parseXml(body, 'Name', 0, body.length);
		var ids = parseXml(body, 'RuleID', 0, body.length);
		var primaryActionIds = parseXml(body, 'PrimaryAction', 0, body.length);

		for (var i in names) {
			if (names[i].val === my_rule_name && ids[i] && primaryActionIds[i]) {
				console.log('id: ' + ids[i].val);
				console.log('found rule; removing...');
				removeActionRule( cam_ip, username, password, ids[i].val, function( err, response, body ) {
					removeActionConfiguration( cam_ip, username, password, primaryActionIds[i].val, function(err, res, body) {
						
						addActionConfigAndRule( cam_ip, username, password, function( err ) {
							cb ( err );
						});
					});
				});
				return;
			}
		}

		addActionConfigAndRule( cam_ip, username, password, function( err ) {
			cb ( err );
		});
		
		// console.log('could not find any recipient matching ' + my_recipient_name);
	});
};


//http://192.168.215.66/operator/basic.shtml?id=128
//
//
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



exports.getMotionInfo = getWindowInfo;
exports.configureMotion = configureMotion;




