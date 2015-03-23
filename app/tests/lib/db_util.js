var dblite_driver = require('dblite');

var checkIfTableExists = function( db_file, table, cb ) {

	var query = "SELECT name FROM sqlite_master WHERE name='" + table + "'";
	
	dblite_driver(db_file).query(query, 
            ['name'], 
            function(err, data) {
				if (!err && data.length > 0) cb( true );
				else cb( false );
			}
	);
};


var insertData = function( db, data, cb ) {

	var dblite;

	if (typeof db === 'string') {
		dblite = dblite_driver(db);
	} else {
		dblite = db;
	}

	var query = "INSERT INTO videos(start, end, file) VALUES(?, ?, ?)";

	dblite.query(query, 
			[data.start, data.end, data.file],
			function(err, data) {
				if ( !err ) cb();
				else cb( err );
			}
	);
};


var getData = function(db, cb) {

	var dblite;

	if (typeof db === 'string') {
		dblite = dblite_driver(db);
	} else {
		dblite = db;
	}

	
	var query = 'SELECT file, start, end FROM videos';

    dblite.query(
        query, 
        ['file', 'start', 'end'], 
        function(err, data) {
            if (err){
            }
            if (!data || data.length === 0) {
                 cb( [] );
            } else {
                cb( data );
            }
        }
    );
};


exports.getData            = getData;
exports.insertData         = insertData;
exports.checkIfTableExists = checkIfTableExists;
