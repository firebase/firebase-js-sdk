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
const seleniumAssistant = require('selenium-assistant');
const checkSendResponse = require('./utils/checkSendResponse');
const getReceivedForegroundMessages = require('./utils/getReceivedForegroundMessages');
const checkMessageReceived = require('./utils/checkMessageReceived');
const createPermittedWebDriver = require('./utils/createPermittedWebDriver');

// Only testing 'valid-vapid-key' because 'valid-vapid-key-modern-sw' has the same behavior
const TEST_DOMAINS = ['valid-vapid-key'];
const TIMEOUT_FOREGROUND_MESSAGE_TEST_UNIT_MILLISECONDS = 120000;

// Getting and deleting token is the entry step of using FM SDK. Let it run first and fail quickly.
require('./test-token-delete');

describe('Firebase Messaging Integration Tests > Test Foreground Receive', function () {
  this.retries(2);
  let globalWebDriver;

  before(async function () {
    await testServer.start();
  });

  after(async function () {
    await testServer.stop();
  });

  // TODO: enable testing for firefox
  seleniumAssistant.getLocalBrowsers().forEach(assistantBrowser => {
    if (assistantBrowser.getId() !== 'chrome') {
      return;
    }

    TEST_DOMAINS.forEach(domain => {
      describe(`Testing browser: ${assistantBrowser.getPrettyName()} : ${domain}`, function () {
        before(async function () {
          globalWebDriver = createPermittedWebDriver(
            /* browser= */ assistantBrowser.getId()
          );
        });
      });

      it('Foreground app can receive a {} empty message in onMessage', async function () {
        this.timeout(TIMEOUT_FOREGROUND_MESSAGE_TEST_UNIT_MILLISECONDS);

        await seleniumAssistant.killWebDriver(globalWebDriver);

        globalWebDriver = createPermittedWebDriver(
          /* browser= */ assistantBrowser.getId()
        );

        await globalWebDriver.get(`${testServer.serverAddress}/${domain}/`);

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
      });

      it('Foreground app can receive a {"notification"} message in onMessage', async function () {
        this.timeout(TIMEOUT_FOREGROUND_MESSAGE_TEST_UNIT_MILLISECONDS);

        await seleniumAssistant.killWebDriver(globalWebDriver);

        globalWebDriver = createPermittedWebDriver(
          /* browser= */ assistantBrowser.getId()
        );

        await globalWebDriver.get(`${testServer.serverAddress}/${domain}/`);

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
      });

      it('Foreground app can receive a {"data"} message in onMessage', async function () {
        this.timeout(TIMEOUT_FOREGROUND_MESSAGE_TEST_UNIT_MILLISECONDS);

        await seleniumAssistant.killWebDriver(globalWebDriver);

        globalWebDriver = createPermittedWebDriver(
          /* browser= */ assistantBrowser.getId()
        );

        await globalWebDriver.get(`${testServer.serverAddress}/${domain}/`);

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
      });

      it('Foreground app can receive a {"notification", "data"} message in onMessage', async function () {
        this.timeout(TIMEOUT_FOREGROUND_MESSAGE_TEST_UNIT_MILLISECONDS);

        await seleniumAssistant.killWebDriver(globalWebDriver);

        globalWebDriver = createPermittedWebDriver(
          /* browser= */ assistantBrowser.getId()
        );

        await globalWebDriver.get(`${testServer.serverAddress}/${domain}/`);

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
      });
    });
  });
});

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
