const gulp = require('gulp');
const through2 = require('through2');

function buildModule() {
  return gulp
    .src('src/auth.js')
    .pipe(
      through2.obj(function(file, encoding, callback) {
        file.contents = Buffer.concat([
          new Buffer(
            `var firebase = require('@firebase/app').default; (function(){`
          ),
          file.contents,
          new Buffer(
            `}).call(typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : {});`
          )
        ]);

        return callback(null, file);
      })
    )
    .pipe(gulp.dest('dist'));
}

gulp.task('build', buildModule);
