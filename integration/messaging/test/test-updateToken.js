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
const retrieveFCMToken = require('./utils/retrieveFCMToken');
const timeForward = require('./utils/timeForward');
const getFCMToken = require('./utils/getFCMToken');
const getErrors = require('./utils/getErrors');
const demoSetup = require('./utils/getDemoSetup');

const ENDPOINT = 'https://fcm.googleapis.com';
const DEMOS = demoSetup.DEMOS;

describe('Firebase Messaging Integration Tests > update a token', function() {
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

        it(`should update a token`, async function() {
          // Skip this test for unstable builds
          if (assistantBrowser.getReleaseName() === 'unstable') {
            console.warn('Skipping tests for unstable releases');
            return;
          }
          await globalWebDriver.get(
            `${testServer.serverAddress}/${demoInfo.name}/`
          );

          const token = await retrieveFCMToken(globalWebDriver);
          expect(token).to.exist;

          // roll the clock forward > 7days
          await timeForward(globalWebDriver);
          const updatedToken = await getFCMToken(globalWebDriver);
          const errors = await getErrors(globalWebDriver);
          expect(errors).to.exist;
          expect(errors.length).to.equal(0);
          expect(updatedToken).to.exist;
        });
      });
    });
  });
});
