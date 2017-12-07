/**
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
const getFCMToken = require('./utils/getFCMToken');
const makeFCMAPICall = require('./utils/makeFCMAPICall');
const getReceivedMessages = require('./utils/getReceivedMessages');

//const ENDPOINT = 'https://fcm.googleapis.com';
const ENDPOINT = 'https://jmt17.google.com';

describe('Firebase Messaging Integration Tests > /demo-valid/', function() {
  this.timeout(30 * 1000);
  if (process.env.TRAVIS) {
    this.retries(2);
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

    describe(`${assistantBrowser.getPrettyName()}`, function() {
      beforeEach(async function() {
        await cleanUp();

        assistantBrowser = setupNotificationPermission(
          assistantBrowser,
          testServer.serverAddress
        );

        globalWebDriver = await assistantBrowser.getSeleniumDriver();

        await globalWebDriver.get(`${testServer.serverAddress}/demo-valid/`);
      });

      it(`should send an empty messge and be recieved by the SDK`, async function() {
        const token = await getFCMToken(globalWebDriver);
        expect(token).to.exist;

        const response = await makeFCMAPICall(ENDPOINT, {
          to: token
        });
        expect(response).to.exist;
        expect(response.success).to.equal(1);

        const receivedMessage = await getReceivedMessages(globalWebDriver);
        expect(receivedMessage).to.exist;
        expect(receivedMessage.length).to.equal(1);
        expect(receivedMessage[0]).to.deep.equal({
          collapse_key: 'do_not_collapse',
          from: '153517668099'
        });
      });

      it(`should send a data only messge and be recieved by the SDK`, async function() {
        const token = await getFCMToken(globalWebDriver);
        expect(token).to.exist;

        const data = { hello: 'world' };

        const response = await makeFCMAPICall(ENDPOINT, {
          to: token,
          data: data
        });
        expect(response).to.exist;
        expect(response.success).to.equal(1);

        const receivedMessage = await getReceivedMessages(globalWebDriver);
        expect(receivedMessage).to.exist;
        expect(receivedMessage.length).to.equal(1);
        expect(receivedMessage[0]).to.deep.equal({
          collapse_key: 'do_not_collapse',
          from: '153517668099',
          data: data
        });
      });

      it(`should send a notification only messge and be recieved by the SDK`, async function() {
        const token = await getFCMToken(globalWebDriver);
        expect(token).to.exist;

        const notification = {
          title: 'Test Title',
          body: 'Test Body',
          icon: '/test/icon.png',
          click_action: '/',
          tag: 'test-tag'
        };

        const response = await makeFCMAPICall(ENDPOINT, {
          to: token,
          notification: notification,
        });
        expect(response).to.exist;
        expect(response.success).to.equal(1);

        const receivedMessage = await getReceivedMessages(globalWebDriver);
        expect(receivedMessage).to.exist;
        expect(receivedMessage.length).to.equal(1);
        expect(receivedMessage[0]).to.deep.equal({
          collapse_key: 'do_not_collapse',
          from: '153517668099',
          notification
        });
      });
    });
  });
});
