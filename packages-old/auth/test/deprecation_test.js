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

goog.provide('fireauth.deprecationTest');

goog.require('fireauth.deprecation');
goog.require('fireauth.deprecation.Deprecations');
goog.require('fireauth.util');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.jsunit');

goog.setTestOnly('fireauth.deprecationTest');


var mockControl;
var mockLogger;

// Add fake deprecation notices to the list of possible notices.
fireauth.deprecation.Deprecations.TEST_MESSAGE = 'This is a test.';
fireauth.deprecation.Deprecations.TEST_MESSAGE_2 = 'This is another test.';


function setUp() {
  mockControl = new goog.testing.MockControl();
  mockWarning = mockControl.createMethodMock(fireauth.util, 'consoleWarn');
}


function tearDown() {
  mockControl.$verifyAll();
  mockControl.$tearDown();
  fireauth.deprecation.resetForTesting();
}


function testLog() {
  mockWarning(fireauth.deprecation.Deprecations.TEST_MESSAGE).$once();

  mockControl.$replayAll();

  fireauth.deprecation.log(fireauth.deprecation.Deprecations.TEST_MESSAGE);
}


function testLogMultiple() {
  mockWarning(fireauth.deprecation.Deprecations.TEST_MESSAGE).$once();
  mockWarning(fireauth.deprecation.Deprecations.TEST_MESSAGE_2).$once();

  mockControl.$replayAll();

  fireauth.deprecation.log(fireauth.deprecation.Deprecations.TEST_MESSAGE);
  fireauth.deprecation.log(fireauth.deprecation.Deprecations.TEST_MESSAGE_2);
}


function testLogMultipleDontRepeat() {
  mockWarning(fireauth.deprecation.Deprecations.TEST_MESSAGE).$once();
  mockWarning(fireauth.deprecation.Deprecations.TEST_MESSAGE_2).$once();

  mockControl.$replayAll();

  fireauth.deprecation.log(fireauth.deprecation.Deprecations.TEST_MESSAGE);
  fireauth.deprecation.log(fireauth.deprecation.Deprecations.TEST_MESSAGE_2);
  fireauth.deprecation.log(fireauth.deprecation.Deprecations.TEST_MESSAGE);
  fireauth.deprecation.log(fireauth.deprecation.Deprecations.TEST_MESSAGE_2);
  fireauth.deprecation.log(fireauth.deprecation.Deprecations.TEST_MESSAGE_2);
}
