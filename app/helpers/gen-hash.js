var bcrypt = require('bcrypt');
var fs     = require('fs');
var path   = require('path');


var printUsage = function() {
	console.error('\tusage: ', process.argv[0], path.basename(process.argv[1]), '<username>', '<password>', '<output_file>\n');
};


var main = function() {

	console.log('\033[0m================\033[0m');
	console.log('\033[0m hash generator\033[0m');
	console.log('\033[0m================\033[0m');

	var user   = process.argv[2],
		pass   = process.argv[3],
		output = process.argv[4];

	if (!user || !pass || !output) {
		printUsage();
		return;
	}

	if (fs.existsSync(output)) {
		console.error('\t\033[031mfile ' + output + ' already exists; please choose a new file\033[0m\n');
		return;
	}

	console.log('\t\033[033mgenerating hash...\033[0m');
	var hash = bcrypt.hashSync(pass, 10);

	try {
		fs.writeFileSync(output, user + ' ' + hash);
	} catch( err ){
		console.error('\t\033[031m', err,'\033[0m\n');
		return;
	}

	console.log('\t\033[32mhashed credentials successfully written to ', output,'\033[0m\n');
};

	
main( process.argv[2], process.argv[3], process.argv[4] );
