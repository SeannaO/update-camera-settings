var api_list = {
	'arecont':	'arecont.js',
	'axis':		'axis.js',
	'bosch':	'bosch.js'
};

exports.api_list = api_list;

exports.getApi = function( manufacturer ) {
	
	if (manufacturer) {
		manufacturer = manufacturer.toLowerCase();
	} else {
	//	manufacturer = 'generic';
		console.log("[api.getApi] ERROR - empty manufacturer");
	}
	
	var api;

	if ( api_list[ manufacturer ] ){
		api = require( './' + api_list[ manufacturer ] );
	} else {
		api = require( './axis.js' );
	}

	return ( new api() );

};




