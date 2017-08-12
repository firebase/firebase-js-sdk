/**
* Copyright 2017 Google Inc.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
const path = require('path');
const cwd = process.cwd();
const karma = require('karma');

const configObj = {
  root: path.resolve(cwd),
  pkg: require(path.resolve(cwd, 'package.json')),
  testConfig: {
    timeout: 5000,
    retries: 5
  },
  tsconfig:  require(path.resolve(cwd, 'tsconfig.json')),
  tsconfigTest:  require(path.resolve(cwd, 'tsconfig.test.json')),
  paths: {
    outDir: path.resolve(cwd, 'dist'),
    tempDir: path.resolve(cwd, 'temp'),
    test: {
      unit: [
        'tests/**/*.test.ts',
        '!tests/**/browser/**/*.test.ts',
        '!tests/**/binary/**/*.test.ts',
        '!src/firebase-*.ts',
      ],
      binary: [
        'tests/**/binary/**/*.test.ts',
        '!tests/**/binary/**/browser/**/*.test.ts',    
      ],
      integration: [
        'temp/**/*.test.js',
        '!temp/**/browser/**/*',
        '!temp/**/react-native/**/*',
      ]
    }
  },
  babel: {
    plugins: [
      'add-module-exports',
    ],
    presets: [
      ['env', {
        "targets": {
          "browsers": [
            "ie >= 9"
          ]
        },
      }]
    ]
  },
  babelWebpack: {
    presets: [
      ["env", {
        "modules": false,
        "targets": {
          "browsers": [
            "ie >= 9"
          ]
        },
      }]
    ]
  },
  karma: {
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
    browsers: ['ChromeHeadless', 'Firefox'],
    
    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true,
    
    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: 1,
    
    // karma-typescript config
    karmaTypescriptConfig: {
      tsconfig: `./tsconfig.test.json`
    },

    // Stub for client config
    client: {
      mocha: {}
    }
  }
};

configObj.karma.client.mocha.timeout = configObj.testConfig.timeout;
configObj.karma.client.mocha.retries = configObj.testConfig.retries;

if (process.env.TRAVIS && process.env.SAUCE_USERNAME && process.env.SAUCE_ACCESS_KEY) {
  const customLaunchers = {
    sl_chrome: {
      base: 'SauceLabs',
      browserName: 'chrome',
      version: 'latest'
    },
    sl_firefox: {
      base: 'SauceLabs',
      browserName: 'firefox',
      version: 'latest'
    },
    sl_safari: {
      base: 'SauceLabs',
      browserName: 'Safari',
      version: '10.0'
    },
    sl_iphone_safari: {
      base: 'SauceLabs',
      browserName: 'Safari',
      deviceName: 'iPhone Simulator',
      platformVersion: 'latest',
      platformName: 'iOS'
    },
    sl_edge: {
      base: 'SauceLabs',
      browserName: 'MicrosoftEdge',
      version: 'latest'
    },
    // sl_ie_11: {
    //   base: 'SauceLabs',
    //   browserName: 'internet explorer',
    //   version: '11'
    // },
    // sl_ie_10: {
    //   base: 'SauceLabs',
    //   browserName: 'internet explorer',
    //   version: '10'
    // }
  }
  Object.assign(configObj.karma, {
    browserNoActivityTimeout: 30000,
    sauceLabs: {
      testName: 'Firebase JS SDK Tests',
      startConnect: false,
      tunnelIdentifier: process.env.TRAVIS_JOB_NUMBER,
      connectOptions: {
        logger: console.log.bind(console)
      }
    },
    customLaunchers,
    browsers: Object.keys(customLaunchers),
    reporters: [...configObj.karma.reporters, 'saucelabs'],
    concurrency: 2
  });
}

module.exports = configObj;