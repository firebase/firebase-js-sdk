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

const expect = require('chai').expect;
const testServer = require('./utils/test-server');
const retrieveToken = require('./utils/retrieveToken');
const seleniumAssistant = require('selenium-assistant');
const clearAppForTest = require('./utils/clearAppForTest');
const createPermittedWebDriver = require('./utils/createPermittedWebDriver');
const sendMessage = require('./utils/sendMessage');
const getTestConfigs = require('./utils/getTestConfigs');
const getReceivedMessages = require('./utils/getReceivedMessages');

const TEST_SUITE_TIMEOUT_MS = 70_000;
const DEFAULT_COLLAPSE_KEY_VALUE = 'do_not_collapse';

describe('Starting Integration Test: Sending and Receiving ', function() {
  this.timeout(TEST_SUITE_TIMEOUT_MS);
  let globalWebDriver;

  before(async function() {
    await testServer.start();
  });

  after(async function() {
    await testServer.stop();
  });

  //TODO: enable testing for edge and firefox if applicable
  seleniumAssistant.getLocalBrowsers().forEach(assistantBrowser => {
    if (assistantBrowser.getId() !== 'chrome') {
      return;
    }

    describe(`Testing browser: ${assistantBrowser.getPrettyName()} : ${
      getTestConfigs().testName
    }`, function() {
      before(async function() {
        // Use one webDriver per browser instead of one per test to speed up test.
        globalWebDriver = createPermittedWebDriver(
          /* browser= */ assistantBrowser.getId()
        );
        await globalWebDriver.get(
          `${testServer.serverAddress}/${getTestConfigs().testName}/`
        );
      });

      after(async function() {
        await seleniumAssistant.killWebDriver(globalWebDriver);
      });

      afterEach(async function() {
        await clearAppForTest(globalWebDriver);
      });

      it('Foreground app can receive a {} empty message in onMessage', async function() {
        let token = await retrieveToken(globalWebDriver);
        checkSendResponse(
          await sendMessage({
            to: token
          })
        );

        await checkMessageReceived(
          globalWebDriver,
          /* expectedNotificationPayload= */ null,
          /* expectedDataPayload= */ null
        );
      });

      it('Foreground app can receive a {"notification"} message in onMessage', async function() {
        checkSendResponse(
          await sendMessage({
            to: await retrieveToken(globalWebDriver),
            notification: getTestNotificationPayload()
          })
        );

        await checkMessageReceived(
          globalWebDriver,
          /* expectedNotificationPayload= */ getTestNotificationPayload(),
          /* expectedDataPayload= */ null
        );
      });

      it('Foreground app can receive a {"data"} message in onMessage', async function() {
        checkSendResponse(
          await sendMessage({
            to: await retrieveToken(globalWebDriver),
            data: getTestDataPayload()
          })
        );

        await checkMessageReceived(
          globalWebDriver,
          /* expectedNotificationPayload= */ null,
          /* expectedDataPayload= */ getTestDataPayload()
        );
      });

      it('Foreground app can receive a {"notification", "data"} message in onMessage', async function() {
        checkSendResponse(
          await sendMessage({
            to: await retrieveToken(globalWebDriver),
            data: getTestDataPayload(),
            notification: getTestNotificationPayload()
          })
        );

        await checkMessageReceived(
          globalWebDriver,
          /* expectedNotificationPayload= */ getTestNotificationPayload(),
          /* expectedDataPayload= */ getTestDataPayload()
        );
      });
    });
  });
});

async function checkMessageReceived(
  webDriver,
  expectedNotificationPayload,
  expectedDataPayload
) {
  let receivedMessages = await getReceivedMessages(webDriver);
  expect(receivedMessages).to.exist;
  expect(receivedMessages.length).to.equal(1);

  const message = receivedMessages[0];
  expect(message.from).to.equal(getTestConfigs().senderId);
  expect(message.collapse_key).to.equal(DEFAULT_COLLAPSE_KEY_VALUE);

  if (expectedNotificationPayload) {
    expect(message.notification).to.deep.equal(getTestNotificationPayload());
  }

  if (expectedDataPayload) {
    expect(message.data).to.deep.equal(getTestDataPayload());
  }
}

function checkSendResponse(response) {
  expect(response).to.exist;
  expect(response.success).to.equal(1);
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

function getTestDataPayload() {
  return { hello: 'world' };
}

function openNewTap(webDriver) {
  webDriver.FindElement(By.LinkText('Open new window')).Click();
}
