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

const chrome = require('selenium-webdriver/chrome');
const { Builder } = require('selenium-webdriver');
const CHROME_PREFERENCE_NOTIFICATION_ENABLED = 1;
const SERVER_ADDRESS_SEPARATOR = ',*';
const testServer = require('./test-server');

module.exports = browser => {
  const chromePreferences = {
    profile: {
      content_settings: {
        exceptions: {
          notifications: {}
        }
      }
    }
  };
  chromePreferences.profile.content_settings.exceptions.notifications[
    testServer.serverAddress + SERVER_ADDRESS_SEPARATOR
  ] = {
    setting: CHROME_PREFERENCE_NOTIFICATION_ENABLED
  };

  let chromeOptions = new chrome.Options().setUserPreferences(
    chromePreferences
  );

  let driver = new Builder()
    .forBrowser(browser)
    .setChromeOptions(chromeOptions)
    // .setFirefoxOptions(firefoxOptions)
    .build();
  return driver;
};
