var fs = require('fs');
var path = require('path');

function deliverTsFile( req, res ) {
    var fileUri =  __dirname + '/videos/' + path.basename(req.params.file, '.ts') + '.ts';

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
