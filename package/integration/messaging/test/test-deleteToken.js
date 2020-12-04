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

const expect = require('chai').expect;
const testServer = require('./utils/test-server');
const deleteToken = require('./utils/deleteToken');
const clearAppForTest = require('./utils/clearAppForTest');
const retrieveToken = require('./utils/retrieveToken');
const seleniumAssistant = require('selenium-assistant');
const createPermittedWebDriver = require('./utils/createPermittedWebDriver');

const TEST_SUITE_TIMEOUT_MS = 100000;
const TEST_DOMAIN = 'valid-vapid-key';

describe('Firebase Messaging Integration Tests > get and delete token', function () {
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
  availableBrowsers.forEach(assistantBrowser => {
    // TODO: enable testing for firefox
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

      it(`Test app can delete a valid token`, async function () {
        const token = await retrieveToken(globalWebDriver);
        expect(token).to.exist;
        try {
          await deleteToken(globalWebDriver, token);
          console.log('Token deletion succeed.');
        } catch (e) {
          console.log('Error trying to delete FCM token: ', e);
          fail();
        }
      });
    });
  });
});
