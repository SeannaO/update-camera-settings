'use strict';

var CachedDownloads = require('./cached-downloads');

var N_DOWNLOAD_SERVICES = 4;
var downloadServices = [];

var _init = function() {
    
    for (var i = 0; i < N_DOWNLOAD_SERVICES; i++) {
        downloadServices[i] = new CachedDownloads();
    }
};


var getVideo = function( fileList, filename, format, res ) {

    var statesCount= {},
        availableService = null;

    for (var i in downloadServices) {

        var service  = downloadServices[i];
        var state    = service.getState(),
            isCached = service.isCached( fileList, format );

        if ( state == CachedDownloads.States.READY) {

            // keep track of available services
            availableService = service;

        } else if ( isCached && state == CachedDownloads.States.BUSY ) {

            // video is cached, return it right away
            return service.getVideo( fileList, filename, format, res );
        }

        if ( !statesCount[ state ] ) {
            statesCount[ state ] = 1;
        } else {
            statesCount[ state ]++;
        }
    }

    // video is not cached, but there is a service available
    if ( availableService && availableService.getVideo ) {
        return availableService.getVideo( fileList, filename, format, res );
    }

    // no services available; return appropriate error message
    // depending on the state of all services
    if ( statesCount[ CachedDownloads.States.ERROR ] == N_DOWNLOAD_SERVICES ) {

        res.status(500).end('cached downloads service could not be launched');
        return;

    } else if ( statesCount[ CachedDownloads.States.LOADING ] == N_DOWNLOAD_SERVICES ) {

        res.status(423).end('cached downloads service is not ready yet');
        return;

    } else if ( statesCount[ CachedDownloads.States.BUSY ] == N_DOWNLOAD_SERVICES ) {

        res.status(429).end('cached downloads service is busy');
        return;

    } else {

        // services in different states, none available;
        // return busy message and the count of the states
        var error = {
            message:        'cached downloads service is busy',
            servicesCount:  downloadServices.length,
            states:         statesCount
        }

        res.status(429).json( error );

        return;
    }
};


_init();

exports.getVideo = getVideo;
