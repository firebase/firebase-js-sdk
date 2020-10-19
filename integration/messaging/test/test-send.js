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
const getReceivedBackgroundMessages = require('./utils/getReceivedBackgroundMessages');
const getReceivedForegroundMessages = require('./utils/getReceivedForegroundMessages');
const openNewTab = require('./utils/openNewTab');
const createPermittedWebDriver = require('./utils/createPermittedWebDriver');

const TEST_DOMAINS = ['valid-vapid-key', 'valid-vapid-key-modern-sw'];
const TEST_PROJECT_SENDER_ID = '750970317741';
const DEFAULT_COLLAPSE_KEY_VALUE = 'do_not_collapse';
const FIELD_FROM = 'from';
const FIELD_COLLAPSE_KEY_LEGACY = 'collapse_key';
const FIELD_COLLAPSE_KEY = 'collapseKey';

const FIELD_DATA = 'data';
const FIELD_NOTIFICATION = 'notification';

// 4 minutes. The fact that the flow includes making a request to the Send Service,
// storing/retrieving form indexedDb asynchronously makes these test units to have a execution time
// variance. Therefore, allowing these units to have a longer time to work is crucial.
const TIMEOUT_BACKGROUND_MESSAGE_TEST_UNIT_MILLISECONDS = 240000;

const TIMEOUT_FOREGROUND_MESSAGE_TEST_UNIT_MILLISECONDS = 120000;

// 1 minute. Wait for object store to be created and received message to be stored in idb. This
// waiting time MUST be longer than the wait time for adding to db in the sw.
const WAIT_TIME_BEFORE_RETRIEVING_BACKGROUND_MESSAGES_MILLISECONDS = 60000;

const wait = ms => new Promise(res => setTimeout(res, ms));

describe('Starting Integration Test > Sending and Receiving ', function () {
  this.retries(3);
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

        it('Background app can receive a {} empty message from sw', async function () {
          this.timeout(TIMEOUT_BACKGROUND_MESSAGE_TEST_UNIT_MILLISECONDS);

          // Clearing the cache and db data by killing the previously instantiated driver. Note that
          // ideally this call is placed inside the after/before hooks. However, Mocha forbids
          // operations longer than 2s in hooks. Hence, this clearing call needs to be inside the
          // test unit.
          await seleniumAssistant.killWebDriver(globalWebDriver);

          globalWebDriver = createPermittedWebDriver(
            /* browser= */ assistantBrowser.getId()
          );

          prepareBackgroundApp(globalWebDriver, domain);

          checkSendResponse(
            await sendMessage({
              to: await retrieveToken(globalWebDriver)
            })
          );

          await wait(
            WAIT_TIME_BEFORE_RETRIEVING_BACKGROUND_MESSAGES_MILLISECONDS
          );

          checkMessageReceived(
            await getReceivedBackgroundMessages(globalWebDriver),
            /* expectedNotificationPayload= */ null,
            /* expectedDataPayload= */ null,
            /* isLegacyPayload= */ false
          );
        });

        it('Background app can receive a {"data"} message frow sw', async function () {
          this.timeout(TIMEOUT_BACKGROUND_MESSAGE_TEST_UNIT_MILLISECONDS);

          await seleniumAssistant.killWebDriver(globalWebDriver);

          globalWebDriver = createPermittedWebDriver(
            /* browser= */ assistantBrowser.getId()
          );

          prepareBackgroundApp(globalWebDriver, domain);

          checkSendResponse(
            await sendMessage({
              to: await retrieveToken(globalWebDriver),
              data: getTestDataPayload()
            })
          );

          await wait(
            WAIT_TIME_BEFORE_RETRIEVING_BACKGROUND_MESSAGES_MILLISECONDS
          );

          checkMessageReceived(
            await getReceivedBackgroundMessages(globalWebDriver),
            /* expectedNotificationPayload= */ null,
            /* expectedDataPayload= */ getTestDataPayload()
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

function checkMessageReceived(
  receivedMessages,
  expectedNotificationPayload,
  expectedDataPayload
) {
  expect(receivedMessages).to.exist;

  const message = receivedMessages[0];

  expect(message[FIELD_FROM]).to.equal(TEST_PROJECT_SENDER_ID);
  const collapseKey = !!message[FIELD_COLLAPSE_KEY_LEGACY]
    ? message[FIELD_COLLAPSE_KEY_LEGACY]
    : message[FIELD_COLLAPSE_KEY];
  expect(collapseKey).to.equal(DEFAULT_COLLAPSE_KEY_VALUE);

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

async function prepareBackgroundApp(globalWebDriver, domain) {
  await globalWebDriver.get(`${testServer.serverAddress}/${domain}/`);

  // TODO: remove the try/catch block once the underlying bug has been resolved. Shift window focus
  // away from app window so that background messages can be received/processed
  try {
    await openNewTab(globalWebDriver);
  } catch (err) {
    // ChromeDriver seems to have an open bug which throws "JavascriptError: javascript error:
    // circular reference". Nevertheless, a new tab can still be opened. Hence, just catch and
    // continue here.
    console.log('FCM (ignored on purpose): ' + err);
  }
}
