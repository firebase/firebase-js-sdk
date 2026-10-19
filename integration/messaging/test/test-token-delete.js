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

const testServer = require('./utils/test-server');
const deleteToken = require('./utils/deleteToken');
const clearAppForTest = require('./utils/clearAppForTest');
const retrieveToken = require('./utils/retrieveToken');
const createPermittedWebDriver = require('./utils/createPermittedWebDriver');

const TEST_SUITE_TIMEOUT_MS = 20000;
const TEST_DOMAIN = 'valid-vapid-key';

describe(
  'Firebase Messaging Integration Tests > get and delete token',
  { timeout: TEST_SUITE_TIMEOUT_MS, retry: 2 },
  () => {
    beforeAll(async () => {
      await testServer.start();
    });

    afterAll(async () => {
      await testServer.stop();
    });

    describe(`Testing browser: Chrome : ${TEST_DOMAIN}`, () => {
      let globalWebDriver;

      beforeAll(async () => {
        // Use one webDriver per browser instead of one per test to speed up test.
        globalWebDriver = await createPermittedWebDriver();

        await globalWebDriver.goto(
          `${testServer.serverAddress}/${TEST_DOMAIN}/`
        );
      });

      afterAll(async () => {
        if (globalWebDriver) {
          await globalWebDriver.close();
        }
      });

      afterEach(async () => {
        await clearAppForTest(globalWebDriver);
      });

      it(`Test app can delete a valid token`, async () => {
        const token = await retrieveToken(globalWebDriver);
        expect(token).toBeDefined();
        try {
          await deleteToken(globalWebDriver, token);
          console.log('Token deletion succeed.');
        } catch (e) {
          console.log('Error trying to delete FCM token: ', e);
          expect.fail();
        }
      });
    });
  }
);
