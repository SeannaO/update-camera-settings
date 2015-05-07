var React = require('react/addons');

var GridEventsMixin = {

	handleDownload: function(d) {

		if (!this.state.begin || !this.state.end ) {
			return;
		}

		var url = window.location.protocol + "//" + window.location.host
			+ "/cameras/" + d.id
			+ "/download?begin=" + parseInt( this.state.begin )
			+ "&end=" + parseInt( this.state.end );

		var begin = new Date(this.state.begin),
			end   = new Date(this.state.end);

		bootbox.confirm('Download video<br><br> <b>FROM</b>: ' + begin + '<br> <b>TO</b>: ' + end  + '<br><br> Confirm? ', function(ok) {
			if(!ok) {
				return;	
			} else {
				var w = window.open( url );
				window.focus();
				w.onload = function() {
					if (w.document.body.innerHTML.length > 0) {
						w.close();
						if (w.document.body.innerHTML.indexOf('long') >= 0) {
							toastr.error('requested video is too long, please select a shorter interval');
						} else {
							toastr.error('couldn\'t find the requested video');
						}
					}
				};
			}
		});
	},

};


module.exports = GridEventsMixin;
