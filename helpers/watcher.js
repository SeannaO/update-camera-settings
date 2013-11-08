var fs = require('fs');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

function Watcher( dir, ext ) {

    this.dir = dir;
    this.files = [];

    this.ext = ext;

    this.setupWatcher();
}

util.inherits(Watcher, EventEmitter);

Watcher.prototype.setupWatcher = function() {

    var self = this;
    
    self.checkNewFile();

    setInterval( function() {
        self.checkNewFile();
    }, 500 );
};


Watcher.prototype.exists = function( fileName ) {
    return fs.existsSync( fileName );
};


Watcher.prototype.isValidExtension = function( file ) {
    
    var self = this;

    if ( !file ) return false;
    if ( !self.ext ) return true;

    return( file.lastIndexOf('.' + self.ext) === file.length - self.ext.length - 1 );
};

Watcher.prototype.checkNewFile = function() {
    
    var self = this;
    
    var added = [];
    var removed = [];

    var files = fs.readdirSync( self.dir );
    for (var i in files) {
        var f = files[i];
        if ( self.files.indexOf(f) == -1 && self.isValidExtension(f) ) {
            added.push( f );
        } 
    }

    self.files = files;

    if (added.length > 0) {
        self.emit('new_files', added);
    }
};

module.exports = Watcher;


