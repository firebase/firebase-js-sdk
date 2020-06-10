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
const sendMessage = require('./utils/sendMessage');
const retrieveToken = require('./utils/retrieveToken');
const seleniumAssistant = require('selenium-assistant');
const clearAppForTest = require('./utils/clearAppForTest');
const getReceivedBackgroundMessages = require('./utils/getReceivedBackgroundMessages');
const openNewTab = require('./utils/openNewTab');
const createPermittedWebDriver = require('./utils/createPermittedWebDriver');
const clearBackgroundMessages = require('./utils/clearBackgroundMessages');

const TEST_SUITE_TIMEOUT_MS = 300000;
const TEST_DOMAIN = 'valid-vapid-key';
const TEST_PROJECT_SENDER_ID = '750970317741';
const DEFAULT_COLLAPSE_KEY_VALUE = 'do_not_collapse';
const FIELD_FROM = 'from';
const FIELD_COLLAPSE_KEY = 'collapse_key';
const FIELD_DATA = 'data';
const FIELD_NOTIFICATION = 'notification';

const wait = ms => new Promise(res => setTimeout(res, ms));

describe('Starting Integration Test > Sending and Receiving ', function() {
  this.timeout(TEST_SUITE_TIMEOUT_MS);
  if (process.env.TRAVIS) {
    this.retries(3);
  } else {
    this.retries(1);
  }
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

    describe(`Testing browser: ${assistantBrowser.getPrettyName()} : ${TEST_DOMAIN}`, function() {
      before(async function() {
        // Use one webDriver per browser instead of one per test to speed up test.
        globalWebDriver = createPermittedWebDriver(
          /* browser= */ assistantBrowser.getId()
        );

        await globalWebDriver.get(
          `${testServer.serverAddress}/${TEST_DOMAIN}/`
        );

        // Shift window focus away from app window so that background messages can be received/processed
        try {
          await openNewTab(globalWebDriver);
        } catch (err) {
          // ChromeDriver seems to have an open bug which throws "JavascriptError: javascript error: circular reference".
          // Nevertheless, a new tab can still be opened. Hence, just catch and continue here.
          console.log(
            'FCM integration test error (ignored on purpose): ' + err
          );
        }
      });

      after(async function() {
        await seleniumAssistant.killWebDriver(globalWebDriver);
      });

      afterEach(async function() {
        await clearBackgroundMessages(globalWebDriver);

        // clears errors and received foreground messages
        await clearAppForTest(globalWebDriver);
      });

      it('Background app can receive a {} empty message from sw', async function() {
        checkSendResponse(
          await sendMessage({
            to: await retrieveToken(globalWebDriver)
          })
        );

        // Wait briefly for object store to be created and received message to be stored in idb
        await wait(3000);

        checkMessageReceived(
          await getReceivedBackgroundMessages(globalWebDriver),
          /* expectedNotificationPayload= */ null,
          /* expectedDataPayload= */ null
        );
        await clearBackgroundMessages(globalWebDriver);

        // clears errors and received foreground messages
        await clearAppForTest(globalWebDriver);
      });

      it('Background app can receive a {"data"} message frow sw', async function() {
        checkSendResponse(
          await sendMessage({
            to: await retrieveToken(globalWebDriver),
            data: getTestDataPayload()
          })
        );

        // Wait briefly for object store to be created and received message to be stored in idb
        await wait(3000);

        checkMessageReceived(
          await getReceivedBackgroundMessages(globalWebDriver),
          /* expectedNotificationPayload= */ null,
          /* expectedDataPayload= */ getTestDataPayload()
        );

        await clearBackgroundMessages(globalWebDriver);

        // clears errors and received foreground messages
        await clearAppForTest(globalWebDriver);
      });
    });
  });
});

function checkMessageReceived(
  receivedMessages,
  expectedNotificationPayload,
  expectedDataPayload
) {
  expect(receivedMessages).to.exist;

  const message = receivedMessages[0];

  expect(message[FIELD_FROM]).to.equal(TEST_PROJECT_SENDER_ID);
  expect(message[FIELD_COLLAPSE_KEY]).to.equal(DEFAULT_COLLAPSE_KEY_VALUE);

  if (expectedNotificationPayload) {
    expect(message[FIELD_NOTIFICATION]).to.deep.equal(
      getTestNotificationPayload()
    );
  }

  if (expectedDataPayload) {
    expect(message[FIELD_DATA]).to.deep.equal(getTestDataPayload());
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
