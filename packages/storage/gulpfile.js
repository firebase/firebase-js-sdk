const gulp = require('gulp');
const tools = require('../../tools/build');

gulp.task('build', gulp.parallel([
  tools.buildCjs(__dirname),
  tools.buildEsm(__dirname)
]));