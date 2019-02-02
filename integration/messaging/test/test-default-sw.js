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
const fetch = require('node-fetch');
const expect = require('chai').expect;

const setupNotificationPermission = require('./utils/setupNotificationPermission');
const testServer = require('./utils/test-server');
const retrieveFCMToken = require('./utils/retrieveFCMToken');
const makeFCMAPICall = require('./utils/makeFCMAPICall');
const getReceivedMessages = require('./utils/getReceivedMessages');

const ENDPOINT = 'https://fcm.googleapis.com';
// const ENDPOINT = 'https://jmt17.google.com';

const demoInfo = {
  name: 'default-sw',
  senderId: '660737059320',
  apiKey:
    'AAAAmdb_afg:APA91bEa0scOaRxp1G-Rg5DGML1fm34LNm97hjAIT-KETrpm33B8Q3HK5xlqheX6l2i7CPHxAMxy06WK9pQIy-jl5UGVpl66b8ZnDc_2qzs8b7jmCnBIjqr7m35-NoGXI9WvAtFgoOVA'
};

describe(`Firebase Messaging Integration Tests > Use 'firebase-messaging-sw.js' by default`, function() {
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

  beforeEach(async function() {
    await cleanUp();

    assistantBrowser = setupNotificationPermission(
      assistantBrowser,
      testServer.serverAddress
    );

    globalWebDriver = await assistantBrowser.getSeleniumDriver();
  });

  after(async function() {
    await testServer.stop();
    await cleanUp();
  });

  let assistantBrowser = seleniumAssistant.getLocalBrowser('chrome', 'stable');

  it(`should use default SW by default`, async function() {
    await globalWebDriver.get(`${testServer.serverAddress}/${demoInfo.name}/`);

    // If we have a token, then we know the default SW worked.
    const token = await retrieveFCMToken(globalWebDriver);
    expect(token).to.exist;

    const result = await globalWebDriver.executeAsyncScript(function(cb) {
      navigator.serviceWorker
        .getRegistrations()
        .then(regs => {
          return (
            regs[0].scope.indexOf('/firebase-cloud-messaging-push-scope') !== 0
          );
        })
        .then(cb, cb);
    });
    expect(result).to.equal(true);
  });
});
