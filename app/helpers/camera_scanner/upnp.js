var dgram = require('dgram'); // dgram is UDP

// Listen for responses
function listen(port) {
 console.log("port : " + port);
 var server = dgram.createSocket("udp4");

 server.on("message", function (msg, rinfo) {
  console.log("server got: " + msg + " from " + rinfo.address + ":" + rinfo.port);
 });

 server.bind(port); // Bind to the random port we were given when sending the message, not 1900

 // Give it a while for responses to come in
 setTimeout(function(){
  console.log("Finished waiting");
  server.close();
 },6000);
}

function search() {
  var message = new Buffer(
  "M-SEARCH * HTTP/1.1\r\n" +
  "HOST:239.255.255.250:1900\r\n" +
  "ST:ssdp:all\r\n" + // Essential, used by the client to specify what they want to discover, eg 'ST:ge:fridge'
  "MAN:\"ssdp:discover\"\r\n" +
  "MX:1\r\n" + // 1 second to respond (but they all respond immediately?)
  "\r\n"
 );

 var client = dgram.createSocket("udp4");

 client.bind(8091); // So that we get a port so we can listen before sending
 listen(8091);
 client.send(message, 0, message.length, 1900, "192.168.215.153", function(err, bytes) {
  console.log("ERR: " + err);
  client.close();}
 );
}
search();
