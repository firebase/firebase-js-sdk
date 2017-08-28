const seleniumAssistant = require('selenium-assistant');
const seleniumFirefox = require('selenium-webdriver/firefox');
const seleniumChrome = require('selenium-webdriver/chrome');
const fetch = require('node-fetch');
const expect = require('chai').expect;

const testServer = require('./static/test-server.js');

const PROD_ENDPOINT = 'https://fcm.googleapis.com';

describe('Firebase Messaging Integration Tests', () => {
  before(function() {
    return testServer.start();
  });

  after(function() {
    return testServer.stop();
  });

  const performTestInBrowser = (seleniumBrowser) => {
    // Mocha must have functions in describe and it functions due to its
    // binding behavior
    describe(`Test Messaging in ${seleniumBrowser.getPrettyName()}`, function() {
      this.timeout(30 * 1000);
      this.retries(2);

      let server;
      let currentWebDriver;

      before(function() {
        this.timeout(10 * 1000);

        // Configure the notification permissions
        switch(seleniumBrowser.getId()) {
          case 'firefox': {
            const ffProfile = new seleniumFirefox.Profile();
            ffProfile.setPreference('security.turn_off_all_security_so_that_' +
              'viruses_can_take_over_this_computer', true);
            ffProfile.setPreference('dom.push.testing.ignorePermission', true);
            ffProfile.setPreference('notification.prompt.testing', true);
            ffProfile.setPreference('notification.prompt.testing.allow', true);
            seleniumBrowser.getSeleniumOptions().setProfile(ffProfile);
            break;
          }
          case 'chrome': {
            /* eslint-disable camelcase */
            const chromePreferences = {
              profile: {
                content_settings: {
                  exceptions: {
                    notifications: {},
                  },
                },
              },
            };
            chromePreferences.profile.content_settings.
              exceptions.notifications[testServer.serverAddress + ',*'] = {
              setting: 1,
            };
            seleniumBrowser.getSeleniumOptions().setUserPreferences(chromePreferences);
            /* eslint-enable camelcase */
            break;
          }
        }

        return seleniumBrowser.getSeleniumDriver()
        .then((driver) => {
          currentWebDriver = driver;
        });
      });

      after(function() {
        this.timeout(10 * 1000);

        if (currentWebDriver) {
          return seleniumAssistant.killWebDriver(currentWebDriver);
        }
      });

      const getInPageToken = () => {
        return currentWebDriver.wait(() => {
          return currentWebDriver.executeScript(() => {
            return document.querySelector('.js-token').textContent.length > 0;
          });
        })
        .then(() => {
          return currentWebDriver.executeScript(() => {
            return document.querySelector('.js-token').textContent;
          });
        });
      };

      const sendFCMMessage = (endpoint, apiBody) => {
        return fetch(`${endpoint}/fcm/send`, {
          method: 'POST',
          body: JSON.stringify(apiBody),
          headers: {
            'Authorization': 'key=AIzaSyCqJkOa5awRsZ-1EyuAwU4loC3YXDBouIo',
            'Content-Type': 'application/json'
          }
        })
        .then((response) => {
          // FCM will return HTML is there is an error so we can't parse
          // the response as JSON, instead have to read as text, then parse
          // then handle the possible error.
          return response.text()
          .then((responseText) => {
            try {
              return JSON.parse(responseText);
            } catch (err) {
              throw new Error(`Unexpected response: '${responseText}'`);
            }
          });
        })
        .then((responseObj) => {
          if (responseObj.success !== 1) {
            throw new Error('Unexpected response: ' +JSON.stringify(responseObj));
          }
        });
      };

      const getInPageMessage = () => {
        return currentWebDriver.wait(() => {
          return currentWebDriver.executeScript(() => {
            return document.querySelectorAll('.js-message-list > li').length > 0;
          });
        })
        .then(() => {
          return currentWebDriver.executeScript(() => {
            return document.querySelector('.js-message-list > li:first-child').textContent;
          });
        });
      };

      const performTest = (dataPayload, notificationPayload) => {
        return currentWebDriver.get(`${testServer.serverAddress}/demo-valid/`)
        .then(() => getInPageToken())
        .then((fcmToken) => {
          const fcmAPIPayload = {};
          fcmAPIPayload.to = fcmToken;

          if (dataPayload != null) {
            fcmAPIPayload.data = dataPayload;
          }

          if (notificationPayload != null) {
            fcmAPIPayload.notification = notificationPayload;
          }

          return sendFCMMessage(PROD_ENDPOINT, fcmAPIPayload);
        })
        .then(() => {
          return getInPageMessage();
        })
        .then((inPageMessage) => {
          const inPageObj = JSON.parse(inPageMessage);
          if (dataPayload) {
            expect(inPageObj.data).to.deep.equal(dataPayload);
          } else {
            expect(typeof inPageObj.data).to.equal('undefined');
          }
          if (notificationPayload) {
            expect(inPageObj.notification).to.deep.equal(notificationPayload);
          } else {
            expect(typeof inPageObj.notification).to.equal('undefined');
          }
        })
        .then(() => {
          return new Promise((resolve) => setTimeout(resolve, 4000));
        });
      };

      it('should send and receive messages with no payload', function() {
        return performTest(null, null);
      });

      it('should send and receive messages with data payload', function() {
        return performTest({hello: 'world'}, null);
      });

      it('should send and receive messages with notification payload', function() {
        return performTest(null, {
          title: 'Test Title',
          body: 'Test Body',
          icon: '/test/icon.png',
          click_action: '/',
          tag: 'test-tag',
        });
      });

      it('should send and receive messages with data & notification payload', function() {
        return performTest({hello: 'world'}, {
          title: 'Test Title',
          body: 'Test Body',
          icon: '/test/icon.png',
          click_action: '/',
          tag: 'test-tag',
        });
      });
    });
  };

  const availableBrowsers = seleniumAssistant.getLocalBrowsers();
  availableBrowsers.forEach((assistantBrowser) => {
    // Only test on Chrome and Firefox
    if (assistantBrowser.getId() !== 'chrome' &&
      assistantBrowser.getId() !== 'firefox') {
      return;
    }

    performTestInBrowser(assistantBrowser);
  });
});
