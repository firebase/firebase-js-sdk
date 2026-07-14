/**
 * @license
 * Copyright 2017 Google LLC
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

const fs = require('fs');
const { execSync } = require('child_process');
const karma = require('karma');
const path = require('path');
const webpackTestConfig = require('./webpack.test');
const { argv } = require('yargs');

function promptSync(question) {
  if (!process.stdout.isTTY || process.env.CI) return false;
  try {
    const ans = execSync(
      `node -e 'const rl = require("readline").createInterface({input: process.stdin, output: process.stderr}); rl.question(${JSON.stringify(question)}, a => { process.stdout.write(a); rl.close(); });'`,
      { stdio: ['inherit', 'pipe', 'inherit'] }
    ).toString().trim().toLowerCase();
    return ans === 'y' || ans === 'yes';
  } catch (e) {
    return false;
  }
}

function determineBrowsers() {
  const supportedBrowsers = ['ChromeHeadless', 'WebkitHeadless', 'Firefox'];

  if (process.env.BROWSERS) {
    const browsers = process.env.BROWSERS.split(',');

    const validBrowsers = browsers.filter(browser =>
      supportedBrowsers.includes(browser)
    );
    if (validBrowsers.length === 0) {
      console.error(
        `The \'BROWSERS\' environment variable was set, but no supported browsers were listed. The supported browsers are ${JSON.stringify(
          supportedBrowsers
        )}.`
      );
      return [];
    } else {
      if (validBrowsers.some(browser => browser.includes('Webkit'))) {
        try {
          const playwright = require('playwright');
          const webkitPath = playwright.webkit.executablePath();
          if (!fs.existsSync(webkitPath)) {
            console.log(
              `\n[Karma Config] Required Playwright WebKit binary not found at:\n  ${webkitPath}`
            );
            if (
              promptSync(
                "[Karma Config] Would you like to download and install Playwright WebKit (~70MB) now? (y/N) "
              )
            ) {
              console.log(
                `\n[Karma Config] Running 'npx playwright install webkit'...\n`
              );
              execSync('npx playwright install webkit', { stdio: 'inherit' });
              console.log(
                `[Karma Config] Playwright WebKit installation complete. Launching Karma...\n`
              );
            } else {
              console.log(
                `\n[Karma Config] Skipping Playwright WebKit installation. If tests fail to start, run 'npx playwright install webkit' manually.\n`
              );
            }
          }
        } catch (err) {
          console.warn(
            `\n[Karma Config] Warning: Could not verify or auto-install Playwright WebKit binary (${err.message}). If WebKit tests fail to start, try running 'npx playwright install webkit' manually.\n`
          );
        }
      }
      return validBrowsers;
    }
  } else {
    console.log(
      "The 'BROWSERS' environment variable is undefined. Defaulting to 'ChromeHeadless'."
    );
    return ['ChromeHeadless'];
  }
}

const config = {
  // disable watcher
  autoWatch: false,

  // Doing 65 seconds to allow for the 20 second firestore tests
  browserNoActivityTimeout: 65000,
  browserDisconnectTimeout: 65000,

  // Preprocess matching files before serving them to the browser.
  // Available preprocessors:
  // https://npmjs.org/browse/keyword/karma-preprocessor
  preprocessors: {
    'test/**/*.ts': ['webpack', 'sourcemap'],
    'src/**/*.test.ts': ['webpack', 'sourcemap']
  },

  mime: { 'text/x-typescript': ['ts', 'tsx'] },

  // test results reporter to use
  // possible values: 'dots', 'progress'
  // available reporters: https://npmjs.org/browse/keyword/karma-reporter
  reporters: ['coverage-istanbul', 'mocha'],

  // web server port
  port: 8089,

  // enable / disable colors in the output (reporters and logs)
  colors: true,

  // level of logging
  // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN
  // || config.LOG_INFO || config.LOG_DEBUG
  logLevel: karma.constants.LOG_INFO,

  // enable / disable watching file and executing tests whenever any file
  // changes
  autoWatch: false,

  // Browsers to launch for testing
  // To use a custom set of browsers, define the BROWSERS environment variable as a comma-seperated list.
  // Supported browsers are 'ChromeHeadless', 'WebkitHeadless', and 'Firefox'.
  // See: https://karma-runner.github.io/6.4/config/browsers.html
  browsers: determineBrowsers(),

  webpack: webpackTestConfig,

  webpackMiddleware: { quiet: true, stats: { colors: true } },

  // Exit with an exit code of 0 if any of the tests fail.
  singleRun: true,

  client: {
    mocha: {
      opts: `${__dirname}/mocha.browser.opts`
    },

    // Pass through --grep option to filter the tests that run.
    args: argv.grep ? ['--grep', argv.grep] : []
  },

  coverageIstanbulReporter: {
    dir: path.resolve(process.cwd(), 'coverage/browser/%browser%'),
    fixWebpackSourcePaths: true,
    reports: ['html', 'lcovonly']
  }
};

config.mochaReporter = {
  showDiff: true
};

module.exports = config;
