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

const seleniumAssistant = require('selenium-assistant');
const expect = require('chai').expect;

const setupNotificationPermission = require('./utils/setupNotificationPermission');
const testServer = require('./utils/test-server');
const getErrors = require('./utils/getErrors');
const retrieveFCMToken = require('./utils/retrieveFCMToken');
const deleteFCMToken = require('./utils/deleteFCMToken');
const demoSetup = require('./utils/getDemoSetup');

const ENDPOINT = 'https://fcm.googleapis.com';
const DEMOS = demoSetup.DEMOS;

describe('Firebase Messaging Integration Tests > get and delete token', function() {
  this.timeout(60 * 1000);
  if (process.env.TRAVIS) {
    this.retries(3);
  } else {
    this.retries(1);
  }

  let globalWebDriver;

  async function cleanUp() {
    await seleniumAssistant.killWebDriver(globalWebDriver);
  }

  before(async function() {
    await testServer.start();
  });

  after(async function() {
    await testServer.stop();
    await cleanUp();
  });

  const availableBrowsers = seleniumAssistant.getLocalBrowsers();
  availableBrowsers.forEach(assistantBrowser => {
    // Only test on Chrome and Firefox
    if (
      assistantBrowser.getId() !== 'chrome' &&
      assistantBrowser.getId() !== 'firefox'
    ) {
      return;
    }

    DEMOS.forEach(demoInfo => {
      describe(`${assistantBrowser.getPrettyName()} : ${
        demoInfo.name
      }`, function() {
        beforeEach(async function() {
          await cleanUp();

          assistantBrowser = setupNotificationPermission(
            assistantBrowser,
            testServer.serverAddress
          );

          globalWebDriver = await assistantBrowser.getSeleniumDriver();
        });

        it(`should get a token and delete it`, async function() {
          await globalWebDriver.get(
            `${testServer.serverAddress}/${demoInfo.name}/`
          );
          const token = await retrieveFCMToken(globalWebDriver);
          expect(token).to.exist;
          try {
            await deleteFCMToken(globalWebDriver, token);
          } catch (e) {
            console.log('Error trying to delete FCM token: ', e);
            fail();
          }
        });

        it(`should fail to delete an invalid token`, async function() {
          await globalWebDriver.get(
            `${testServer.serverAddress}/${demoInfo.name}/`
          );
          await deleteFCMToken(globalWebDriver, 'invalid-token');
          const errors = await getErrors(globalWebDriver);
          expect(errors).to.exist;
          expect(errors.length).to.equal(1);
          expect(errors[0].code).to.equal('messaging/invalid-delete-token');
        });
      });
    });
  });
});
