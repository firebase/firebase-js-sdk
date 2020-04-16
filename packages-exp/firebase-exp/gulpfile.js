var gulp = require('gulp');
var concat = require('gulp-concat');
var sourcemaps = require('gulp-sourcemaps');

const OUTPUT_FILE = 'firebase.js';
const pkgJson = require('./package.json');
const files = [
  ...pkgJson.components.map(component => `firebase-${component}.js`)
];

gulp.task('firebase-js', function() {
  return gulp
    .src(files)
    .pipe(sourcemaps.init({ loadMaps: true }))
    .pipe(concat(OUTPUT_FILE))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('.'));
});
