var assert = require('chai').assert;

describe("Firebase App Service Worker", function() {
  // Long Timeout to Allow plenty of time for service worker registration
  this.timeout(Infinity);
  var swRegistration;
  before("Load Service Worker", function() {
    assert.isDefined(navigator.serviceWorker);
    
    // Service worker is a root - so it can process ALL requests to the domain.
    // Using absolute path and the webpack and browserify builds will have
    // builds of these test file with different subdirectory structures in temp/
    var swFile = '/base/temp/bundlers/browser/service-worker.js';
    
    return navigator.serviceWorker.register(swFile, {scope: '/'})
      .then(function(registration) {
        return (swRegistration = registration);
      })
      .then(function(registration) {
        return new Promise(function(resolve) {
          var interval = setInterval(function() {
            if (registration.active) {
              clearInterval(interval);
              resolve();
            }
          }, 150);
        });
      })
      .catch(function(error) {
        console.error('SW Registration Error');
        console.error('Attempted to register: ', swFile);
        console.error('Error msg: ', error.message);
        console.error('Error stack: ', JSON.stringify(error.stack));
        throw error;
      });
  });

  after('Unload Service Worker', function() {
    return swRegistration && swRegistration.unregister();
  });

  it("Firebase version in worker", function() {
    return fetch('/SDK_VERSION')
      .then(function(response) {
        return response.json();
      })
      .then(function(json) {
        assert.ok(json.startsWith, "3.");
      });
  });
});
