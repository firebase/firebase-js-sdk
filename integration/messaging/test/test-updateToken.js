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

const seleniumAssistant = require('selenium-assistant');
const expect = require('chai').expect;
const testServer = require('./utils/test-server');
const retrieveToken = require('./utils/retrieveToken');
const clearAppForTest = require('./utils/clearAppForTest');
const createPermittedWebDriver = require('./utils/createPermittedWebDriver');
const timeForward = require('./utils/forwardTime');
const triggerGetToken = require('./utils/triggerGetToken');
const getErrors = require('./utils/getErrors');

const TEST_SUITE_TIMEOUT_MS = 70000;
const TEST_DOMAIN = 'valid-vapid-key';

describe('Firebase Messaging Integration Tests > update a token', function () {
  this.timeout(TEST_SUITE_TIMEOUT_MS);
  this.retries(3);

  let globalWebDriver;

  before(async function () {
    await testServer.start();
  });

  after(async function () {
    await testServer.stop();
  });

  const availableBrowsers = seleniumAssistant.getLocalBrowsers();
  //TODO: enable testing for edge and firefox if applicable
  availableBrowsers.forEach(assistantBrowser => {
    if (assistantBrowser.getId() !== 'chrome') {
      return;
    }

    describe(`Testing browser: ${assistantBrowser.getPrettyName()} : ${TEST_DOMAIN}`, function () {
      before(async function () {
        // Use one webDriver per browser instead of one per test to speed up test.
        globalWebDriver = createPermittedWebDriver(
          /* browser= */ assistantBrowser.getId()
        );
        await globalWebDriver.get(
          `${testServer.serverAddress}/${TEST_DOMAIN}/`
        );
      });

      after(async function () {
        await seleniumAssistant.killWebDriver(globalWebDriver);
      });

      afterEach(async function () {
        await clearAppForTest(globalWebDriver);
      });

      it(`should update a token`, async function () {
        const token = await retrieveToken(globalWebDriver);
        expect(token).to.exist;

        // roll the clock forward > 7days
        await timeForward(globalWebDriver);
        const updatedToken = await triggerGetToken(globalWebDriver);
        const errors = await getErrors(globalWebDriver);
        expect(errors).to.exist;
        expect(errors.length).to.equal(0);
        expect(updatedToken).to.exist;
      });
    });
  });
});
