const karma = require('karma');
const path = require('path');
const webpackTestConfig = require('./webpack.test');

module.exports = {
  // disable watcher
  autoWatch: false,

  // preprocess matching files before serving them to the browser
  // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
  preprocessors: {
    'test/**/*.ts': ['webpack', 'sourcemap']
  },

  mime: {
    'text/x-typescript': ['ts', 'tsx']
  },

  // test results reporter to use
  // possible values: 'dots', 'progress'
  // available reporters: https://npmjs.org/browse/keyword/karma-reporter
  reporters: ['spec'],

  // web server port
  port: 8080,

  // enable / disable colors in the output (reporters and logs)
  colors: true,

  // level of logging
  // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
  logLevel: karma.constants.LOG_INFO,

  // enable / disable watching file and executing tests whenever any file changes
  autoWatch: false,

  // start these browsers
  // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
  browsers: ['ChromeHeadless'],

  webpack: webpackTestConfig,

  webpackMiddleware: {
    quiet: true,
    stats: {
      colors: true
    }
  },

  singleRun: false
};
