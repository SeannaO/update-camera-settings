var source     = require('vinyl-source-stream'),
    gulp       = require('gulp'),
    browserify = require('browserify'),
    reactify   = require('reactify'),
    notify     = require('gulp-notify');
 
var sourcesDir    = './src',
    appEntryPoint = "investigator.js",
    targetDir     = './build';
 
 
gulp.task('default', function() {
  var b = browserify({entries: [sourcesDir + '/' + appEntryPoint], debug: true})
    .transform(reactify)
    .bundle()
	.on('error', function(err) {
		console.log(err);
		console.log('file: ' + err.fileName);
		console.log('line: ' + err.lineNumber);
		console.log('msg: ' + err.description);
		// notify.onError('file: ' + err.fileName + '\nmsg: ' + err.description);
		b.end();
	})
    .pipe(source(appEntryPoint))
    .pipe(gulp.dest(targetDir))
    .pipe(notify("Bundling done."));

	return b;
});
 
gulp.task('watch', function() {
  gulp.watch(sourcesDir + '/**/*.js', ['default']);
});


gulp.on('error', function(err) {
});
