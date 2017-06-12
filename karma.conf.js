const karma = require('karma');

module.exports = {
  // base path that will be used to resolve all patterns (eg. files, exclude)
  basePath: '',
  
  customHeaders: [{
    match: '.*',
    name: 'Service-Worker-Allowed',
    value: '/'
  }],
  
  // frameworks to use
  // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
  frameworks: [
  'mocha',
  'karma-typescript'
  ],
  
  // preprocess matching files before serving them to the browser
  // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
  preprocessors: {
    '**/*.ts': ['karma-typescript']
  },
  
  // test results reporter to use
  // possible values: 'dots', 'progress'
  // available reporters: https://npmjs.org/browse/keyword/karma-reporter
  reporters: ['spec'],
  
  // enable / disable colors in the output (reporters and logs)
  colors: true,
  
  
  // level of logging
  // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
  logLevel: karma.constants.LOG_INFO,
  
  
  // enable / disable watching file and executing tests whenever any file changes
  autoWatch: false,
  
  // start these browsers
  // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
  browsers: ['ChromeHeadless', 'Firefox'],
  
  // Continuous Integration mode
  // if true, Karma captures browsers, runs the tests and exits
  singleRun: true,
  
  // Concurrency level
  // how many browser should be started simultaneous
  concurrency: 2,
  
  // karma-typescript config
  karmaTypescriptConfig: {
    tsconfig: `./tsconfig.test.json`
  }
}