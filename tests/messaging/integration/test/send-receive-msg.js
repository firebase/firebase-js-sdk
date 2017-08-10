const seleniumAssistant = require('selenium-assistant');
const testServer = require('./static/test-server.js');

const performTestInBrowser = (seleniumBrowser) => {
  // Mocha must have functions in describe and it functions due to its
  // binding behavior
  describe(`Test Messaging in ${seleniumBrowser.getPrettyName()}`, function() {
    let server;
    let currentWebDriver;

    before(function() {
      this.timeout(10 * 1000);

      return testServer.start()
      .then(() => {
        return seleniumBrowser.getSeleniumDriver()
      })
      .then((driver) => {
        currentWebDriver = driver;
      });
    });

    after(function() {
      this.timeout(10 * 1000);

      return testServer.stop()
      .then(() => {
        if (currentWebDriver) {
          return seleniumAssistant.killWebDriver(currentWebDriver);
        }
      });
    });

    it('should send and receive messages', function() {
      this.timeout(30 * 1000);

      return currentWebDriver.get('https://gauntface.com')
      .then(() => {
        return new Promise((resolve) => setTimeout(resolve, 4000));
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
