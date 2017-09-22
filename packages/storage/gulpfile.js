const gulp = require('gulp');
const tools = require('../../tools/build');

const buildModule = gulp.parallel([
  tools.buildCjs(__dirname),
  tools.buildEsm(__dirname)
]);

const setupWatcher = () => {
  gulp.watch('src/**/*', buildModule);
};

gulp.task('build', buildModule);

gulp.task('dev', gulp.parallel([setupWatcher]));
