  var soap = require('soap');
  var url = 'http://www.onvif.org/onvif/ver10/media/wsdl/media.wsdl';
  var args = {name: 'value'};
  soap.createClient(url, function(err, client) {
      if ( err ) {
          console.log( "error: " + err.message );
      }
      console.log( client.describe() );
  });
