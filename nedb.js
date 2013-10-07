//
// nedb.js
//
// queries the nedb datastore
//

var Datastore = require('nedb');
var path = require('path');
var fs = require('fs');

var  db = new Datastore({ filename: 'datastore', autoload: true });

/**
 * setup
 *
 */
var setup = function() {
    createVideosTable();
}
// - - end of setup
// - - - - - - - - - - - - - - - - - - - -


/**
 * testIpForOnvifCamera
 *
 */
var createVideosTable = function() {
    
}
// - - end of createVideosTable
// - - - - - - - - - - - - - - - - - - - -


/**
 * insertVideo
 *
 */
var insertVideo = function( data ) {
    db.insert(data, function(err, newDoc) {
        if (err) {
            console.log("error during db insert: ");
            console.log(err);
        }
    });
}
// - - end of insertVideo
// - - - - - - - - - - - - - - - - - - - -

var sortByStartTimeDesc = function(a, b) {
    if (a.start > b.start) {
        return -1;
    } else if (a.start < b.start) {
        return 1;
    } else {
        return 0;
    }
}


var sortByStartTimeAsc = function(a, b) {
    if (a.start < b.start) {
        return -1;
    } else if (a.start > b.start) {
        return 1;
    } else {
        return 0;
    }
}

/**
 * searchVideosByInterval
 *
 */
var searchVideosByInterval = function( start, end, cb ) {
    
    db.loadDatabase();

    db.find({ $and: [ {start: { $lte: end }}, {end: {$gte: start}} ] }, function(err, docs) {
        if (err) {
            console.log("error searching for videos by interval: " + err);
            cb (err, [], 0);
            return;
        }
        
        var fileList = [];

        var offset = {
            begin: 0,
            duration: 0
        }
        
        docs = docs.sort(sortByStartTimeAsc);

        console.log("found " + docs.length + " videos");

        for (var i = 0; i < docs.length; i++) {
            if (i == 0 && docs[i].start < start) {
                offset.begin = start - docs[i].start;                                 
            } 
            if (i == docs.length-1) {
                var endOffset = 0;
                if (docs[i].end > end) {
                    endOffset = docs[i].end - end;
                }
                offset.duration = docs[i].end - docs[0].start - offset.begin - endOffset;
            }
            fileList.push(docs[i]);
        }
        cb( err, fileList, offset );   
    });
}
// - - end of searchVideosByInterval
// - - - - - - - - - - - - - - - - - - - -



/**
 * searchVideoByTime
 *
 */
var searchVideoByTime = function( startTime, cb ) {

   db.loadDatabase();

   db.find({ $and: [ {start: { $lte: startTime }}, {end: {$gte: startTime}} ] }, function(err, docs) {
       if (err) {
           console.log("error while searching videos by time: ");
           console.log(err);
           return;
       }

       docs = docs.sort(sortByStartTimeDesc);
       
       var offset = 0;
       console.log("found " + docs.length + " videos");
       if (docs.length > 0 ) {
           doc = docs[0];
           console.log("found video: " + doc.file);
           offset = Math.round( (startTime - doc.start)/1000.0 );
           cb( doc.file, offset );
       } else {
           console.log("video not found");
           cb( "", offset );                
        }
   });
}
// - - end of searchVideoByTime
// - - - - - - - - - - - - - - - - - - - -



/**
 * listAll
 *
 */
var listAll = function( table ) {
    
    db.loadDatabase();

    db.find({}, function (err, docs) {
        if (err) {
            console.log(err);
            return;
        }
        console.log(docs);
    });    
}
// - - end of listAll
// - - - - - - - - - - - - - - - - - - - -


// exports
exports.setup = setup
exports.searchVideosByInterval = searchVideosByInterval
exports.listAll = listAll
exports.insertVideo = insertVideo
exports.searchVideoByTime = searchVideoByTime



