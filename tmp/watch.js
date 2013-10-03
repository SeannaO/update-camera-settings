  var watch = require('watch');

  /*
  watch.createMonitor(__dirname, function (monitor) {
    //monitor.files['/home/mikeal/.zshrc'] // Stat object for my zshrc.
    monitor.on("created", function (f, stat) {
        console.log("new file: ");
      console.log(f);
    })
    monitor.on("changed", function (f, curr, prev) {
      // Handle file changes
    })
    monitor.on("removed", function (f, stat) {
      // Handle removed files
    })
  })
  */

    watch.watchTree(__dirname, function (f, curr, prev) {
    if (typeof f == "object" && prev === null && curr === null) {
      // Finished walking the tree
    } else if (prev === null) {
        console.log(curr);
    } else if (curr.nlink === 0) {
      // f was removed
    } else {
      // f was changed
    }
  })
