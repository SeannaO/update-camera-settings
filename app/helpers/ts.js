var fs = require('fs');
var path = require('path');

function deliverTsFile( camId, streamId, file, res ) {

	var fileName = path.basename(file, '.ts');
	var date = new Date( parseInt(fileName, 10) );
	var dateFolder = date.getUTCFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();

    var fileUri =  process.env['BASE_FOLDER'] + '/' + camId + '/' + streamId + '/videos/' + fileName + '.ts';
	var fileUriWithDate =  process.env['BASE_FOLDER'] + '/' + camId + '/' + streamId + '/videos/' + dateFolder + '/' + fileName + '.ts';

    fs.exists(fileUriWithDate, function( exists ) {

        if (exists) {
            //res.writeHead(200, { "Content-Type": "video/MP2T" });
			res.sendfile(fileUriWithDate);
            //var fileStream = fs.createReadStream( fileUriWithDate,
			//	{ bufferSize: 64 * 1024 });
            //fileStream.pipe(res);
        } 
        else {
			fs.exists(fileUri, function( exists ) {
				if (exists) {
					res.writeHead(200, { "Content-Type": "video/MP2T" });
					var fileStream = fs.createReadStream( fileUri );
					fileStream.pipe(res);
				}
				else {
					res.writeHead(200, { "Content-Type": "text" });
					res.end("file not found: " + fileUriWithDate);
				}
			});	
        }
    });
}


exports.deliverTsFile = deliverTsFile;
