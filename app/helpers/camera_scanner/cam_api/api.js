var api_list = {
	'arecont':	'arecont.js',
	'axis':		'axis.js'
};

// The bosch api is not ready yet once it works it can be added to the list
//	'bosch':	'bosch.js'

exports.api_list = api_list;

exports.getApi = function( manufacturer ) {
	
	if (manufacturer) {
		manufacturer = manufacturer.toLowerCase();
	} else {
	//	manufacturer = 'generic';
		console.log("[api.getApi] ERROR - empty manufacturer");
	}
	
	var api;

	console.log(api_list[ manufacturer ]);
	if ( api_list[ manufacturer ] ){
		api = require( './' + api_list[ manufacturer ] );
	} else {
		api = require( './generic.js' );
	}

	return ( new api() );

};




