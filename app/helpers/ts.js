var fs = require('fs');
var path = require('path');

function deliverTsFile( camId, streamId, file, res ) {

//	var fileName = path.basename(file, '.ts');
//	var date = var dateString = date.getUTCFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();

    var fileUri =  __dirname + '/cameras/' + camId + '/' + streamId + '/videos/' + file;

    fs.exists(fileUri, function( exists ) {

        if (exists) {
            res.writeHead(200, { "Content-Type": "video/MP2T" });
            var fileStream = fs.createReadStream( fileUri );
            fileStream.pipe(res);
        } 
        else {
             res.writeHead(200, { "Content-Type": "text" });
             res.end("file not found: " + fileUri);
        }
    });
}


exports.deliverTsFile = deliverTsFile;
