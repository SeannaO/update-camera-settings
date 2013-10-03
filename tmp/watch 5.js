  var watch = require('watch')
  watch.createMonitor(__dirname, function (monitor) {
    //monitor.files['/home/mikeal/.zshrc'] // Stat object for my zshrc.
    monitor.on("created", function (f, stat) {
      console.log(f);
    })
    monitor.on("changed", function (f, curr, prev) {
      // Handle file changes
    })
    monitor.on("removed", function (f, stat) {
      // Handle removed files
    })
  })
