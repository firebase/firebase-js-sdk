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
const getReceivedBackgroundMessages = require('./utils/getReceivedBackgroundMessages');
const createPermittedWebDriver = require('./utils/createPermittedWebDriver');
const checkSendResponse = require('./utils/checkSendResponse');
const checkMessageReceived = require('./utils/checkMessageReceived');
const openNewTab = require('./utils/openNewTab');

const TEST_DOMAINS = ['valid-vapid-key-modern-sw'];

// 4 minutes. The fact that the flow includes making a request to the Send Service,
// storing/retrieving form indexedDb asynchronously makes these test units to have a execution time
// variance. Therefore, allowing these units to have a longer time to work is crucial.
const TIMEOUT_BACKGROUND_MESSAGE_TEST_UNIT_MILLISECONDS = 240000;

// 1 minute. Wait for object store to be created and received message to be stored in idb. This
// waiting time MUST be longer than the wait time for adding to db in the sw.
const WAIT_TIME_BEFORE_RETRIEVING_BACKGROUND_MESSAGES_MILLISECONDS = 60000;

const wait = ms => new Promise(res => setTimeout(res, ms));

// 50% of integration test run time is spent in testing receiving in background. Running these
// slower tests last so other tests can fail quickly if they do fail.
require('./test-token-delete');
require('./test-token-update');
require('./test-useValidManifest');
require('./test-useDefaultServiceWorker');
require('./test-receive-foreground');

describe('Firebase Messaging Integration Tests > Test Background Receive', function () {
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
    });
  });
});

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

function getTestDataPayload() {
  return { hello: 'world' };
}
