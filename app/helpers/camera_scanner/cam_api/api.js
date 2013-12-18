var api_list = {
	'arecont':	'arecont.js',
	'axis':		'axis.js',
	'bosch':	'bosch.js'
};

exports.api_list = api_list;

exports.getApi = function( manufacturer ) {
	
	manufacturer = manufacturer.toLowerCase();
	
	var api;

	if ( api_list[ manufacturer ] ){
		api = require( './' + api_list[ manufacturer ] );
	} else {
		api = require( './generic.js' );
	}

	return ( new api() );

};




