/**
 * @license
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

var allTests = require('./generated/all_tests');

var TEST_SERVER = 'http://localhost:4000';

var FLAKY_TEST_RETRIAL = 3;

describe('Run all Closure unit tests', function() {
  /**
   * Waits for current tests to be executed.
   * @param {!Object} done The function called when the test is finished.
   * @param {!Error} fail The function called when an unrecoverable error
   *     happened during the test.
   * @param {?number=} tries The number of trials so far for the current test.
   *     This is used to retry flaky tests.
   */
  var waitForTest = function(done, fail, tries) {
    // The default retrial policy.
    if (typeof tries === 'undefined') {
      tries = FLAKY_TEST_RETRIAL;
    }
    // executeScript runs the passed method in the "window" context of
    // the current test. JSUnit exposes hooks into the test's status through
    // the "G_testRunner" global object.
    browser.executeScript(function() {
      if (window['G_testRunner'] && window['G_testRunner']['isFinished']()) {
        return {
          isFinished: true,
          isSuccess: window['G_testRunner']['isSuccess'](),
          report: window['G_testRunner']['getReport']()
        };
      } else {
        return {'isFinished': false};
      }
    }).then(function(status) {
      // Tests completed on the page but something failed. Retry a certain
      // number of times in case of flakiness.
      if (status && status.isFinished && !status.isSuccess && tries > 1) {
        // Try again in a few ms.
        setTimeout(waitForTest.bind(undefined, done, fail, tries - 1), 300);
      } else if (status && status.isFinished) {
        done(status);
      } else {
        // Try again in a few ms.
        setTimeout(waitForTest.bind(undefined, done, fail, tries), 300);
      }
    }, function(err) {
      // This can happen if the webdriver had an issue executing the script.
      fail(err);
    });
  };

  /**
   * Executes the test cases for the file at the given testPath.
   * @param {!string} testPath The path of the current test suite to execute.
   */
  var executeTest = function(testPath) {
    it('runs ' + testPath + ' with success', function(done) {
      /**
       * Runs the test routines for a given test path and retries up to a
       * certain number of times on timeout.
       * @param {number} tries The number of times to retry on timeout.
       * @param {function()} done The function to run on completion.
       */
      var runRoutine = function(tries, done) {
        browser.navigate()
            .to(TEST_SERVER + '/' + testPath)
            .then(function() {
              waitForTest(function(status) {
                expect(status).toBeSuccess();
                done();
              }, function(err) {
                // If browser test execution times out try up to trial times.
                if (err.message &&
                    err.message.indexOf('ETIMEDOUT') != -1 &&
                    tries > 0) {
                  runRoutine(tries - 1, done);
                } else {
                  done.fail(err);
                }
              });
            }, function(err) {
              // If browser test execution times out try up to trial times.
              if (err.message &&
                  err.message.indexOf('ETIMEOUT') != -1 &&
                  trial > 0) {
                runRoutine(tries - 1, done);
              } else {
                done.fail(err);
              }
            });
      };
      // Run test routine. Set timeout retrial to 2 times, eg. test will try
      // 2 more times before giving up.
      runRoutine(2, done);
    });
  };

  beforeEach(function() {
    jasmine.addMatchers({
      // This custom matcher allows for cleaner reports.
      toBeSuccess: function() {
        return {
          // Checks that the status report is successful, otherwise displays
          // the report as error message.
          compare: function(status) {
            return {
              pass: status.isSuccess,
              message: 'Some test cases failed!\n\n' + status.report
            };
          }
        };
      }
    });
  });

  // Run all tests.
  for (var i = 0; i < allTests.length; i++) {
    var testPath = allTests[i];
    executeTest(testPath);
  }
});
