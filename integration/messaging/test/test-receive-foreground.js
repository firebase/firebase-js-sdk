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
const sendMessage = require('./utils/sendMessage');
const retrieveToken = require('./utils/retrieveToken');
const checkSendResponse = require('./utils/checkSendResponse');
const getReceivedForegroundMessages = require('./utils/getReceivedForegroundMessages');
const checkMessageReceived = require('./utils/checkMessageReceived');
const createPermittedWebDriver = require('./utils/createPermittedWebDriver');

// Only testing 'valid-vapid-key' because 'valid-vapid-key-modern-sw' has the same behavior
const TEST_DOMAINS = ['valid-vapid-key'];
const TIMEOUT_FOREGROUND_MESSAGE_TEST_UNIT_MILLISECONDS = 120000;

describe(
  'Firebase Messaging Integration Tests > Test Foreground Receive',
  { retry: 2 },
  () => {
    beforeAll(async () => {
      await testServer.start();
    });

    afterAll(async () => {
      await testServer.stop();
    });

    TEST_DOMAINS.forEach(domain => {
      describe(`Testing browser: Chrome : ${domain}`, () => {
        let globalWebDriver;

        beforeAll(async () => {
          globalWebDriver = await createPermittedWebDriver();
        });

        afterAll(async () => {
          if (globalWebDriver) {
            await globalWebDriver.close();
          }
        });

        it(
          'Foreground app can receive a {} empty message in onMessage',
          async () => {
            await globalWebDriver.close();

            globalWebDriver = await createPermittedWebDriver();

            await globalWebDriver.goto(
              `${testServer.serverAddress}/${domain}/`
            );

            let token = await retrieveToken(globalWebDriver);
            checkSendResponse(
              await sendMessage({
                to: token
              })
            );

            await checkMessageReceived(
              await getReceivedForegroundMessages(globalWebDriver),
              /* expectedNotificationPayload= */ null,
              /* expectedDataPayload= */ null
            );
          },
          TIMEOUT_FOREGROUND_MESSAGE_TEST_UNIT_MILLISECONDS
        );

        it(
          'Foreground app can receive a {"notification"} message in onMessage',
          async () => {
            await globalWebDriver.close();

            globalWebDriver = await createPermittedWebDriver();

            await globalWebDriver.goto(
              `${testServer.serverAddress}/${domain}/`
            );

            checkSendResponse(
              await sendMessage({
                to: await retrieveToken(globalWebDriver),
                notification: getTestNotificationPayload()
              })
            );

            await checkMessageReceived(
              await getReceivedForegroundMessages(globalWebDriver),
              /* expectedNotificationPayload= */ getTestNotificationPayload(),
              /* expectedDataPayload= */ null
            );
          },
          TIMEOUT_FOREGROUND_MESSAGE_TEST_UNIT_MILLISECONDS
        );

        it(
          'Foreground app can receive a {"data"} message in onMessage',
          async () => {
            await globalWebDriver.close();

            globalWebDriver = await createPermittedWebDriver();

            await globalWebDriver.goto(
              `${testServer.serverAddress}/${domain}/`
            );

            checkSendResponse(
              await sendMessage({
                to: await retrieveToken(globalWebDriver),
                data: getTestDataPayload()
              })
            );

            await checkMessageReceived(
              await getReceivedForegroundMessages(globalWebDriver),
              /* expectedNotificationPayload= */ null,
              /* expectedDataPayload= */ getTestDataPayload()
            );
          },
          TIMEOUT_FOREGROUND_MESSAGE_TEST_UNIT_MILLISECONDS
        );

        it(
          'Foreground app can receive a {"notification", "data"} message in onMessage',
          async () => {
            await globalWebDriver.close();

            globalWebDriver = await createPermittedWebDriver();

            await globalWebDriver.goto(
              `${testServer.serverAddress}/${domain}/`
            );

            checkSendResponse(
              await sendMessage({
                to: await retrieveToken(globalWebDriver),
                data: getTestDataPayload(),
                notification: getTestNotificationPayload()
              })
            );

            await checkMessageReceived(
              await getReceivedForegroundMessages(globalWebDriver),
              /* expectedNotificationPayload= */ getTestNotificationPayload(),
              /* expectedDataPayload= */ getTestDataPayload()
            );
          },
          TIMEOUT_FOREGROUND_MESSAGE_TEST_UNIT_MILLISECONDS
        );
      });
    });
  }
);

function getTestDataPayload() {
  return { hello: 'world' };
}

function getTestNotificationPayload() {
  return {
    title: 'test title',
    body: 'test body',
    icon: '/test/icon.png',
    click_action: '/',
    tag: 'test-tag'
  };
}
