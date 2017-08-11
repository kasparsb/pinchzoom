var gulp = require('gulp');
var rename = require('gulp-rename');
var watch = require('gulp-watch');
var browserify = require('browserify');
var watchify = require('watchify');
var source = require('vinyl-source-stream')
var less = require('gulp-less');
var uglify = require('gulp-uglify');
var buffer = require('vinyl-buffer');

// Read package info
var pkg = require('./package.json');

var files = {
    js: './pinchzoom.js',
    dest: './build'
}

/**
 * Configure browserify
 */
function getBrowserify(entry) { 
    console.log('Browserify entry', entry);
    return browserify({
        entries: [entry],
        // These params are for watchify
        cache: {}, 
        packageCache: {},

        standalone: 'webit.pinchzoom'
    })
}

/**
 * Bundel js from browserify
 * If compress is true, then uglify js
 */
function bundleJs(browserify, compress) {
    if (typeof compress == 'undefined') {
        compress = true;
    }

    var handleError = function(er){
        console.log(er.message+' on line '+er.line+':'+er.column);
        console.log(er.annotated);
    }

    var destFileName = 'pinchzoom.min.js';

    if (compress) {
        console.log('Uglify js');
        browserify
            .bundle()
            .on('error', handleError)
            .pipe(source('pinchzoom.js'))
            .pipe(buffer())
            .pipe(uglify())
            .pipe(rename(destFileName))
            .pipe(gulp.dest(files.dest));
    }
    else {
        browserify
            .bundle()
            .on('error', handleError)
            .pipe(source('app.js'))
            .pipe(rename(destFileName))
            .pipe(gulp.dest(files.dest));    
    }
    
}

gulp.task('js', function(){
    bundleJs(getBrowserify(files.js));
});

gulp.task('watchjs', function(){
    var w = watchify(
        getBrowserify(files.js, false)
    );
    
    w.on('update', function(){
        // bundle without compression for faster response
        bundleJs(w, false);
        console.log('js files updated');
    });

    w.bundle().on('data', function() {});
});


gulp.task('default', ['watchjs']);
gulp.task('dist', ['js']);