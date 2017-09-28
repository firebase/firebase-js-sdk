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

const expect = require('chai').expect;

describe("Firebase App Service Worker", function() {
  // Long Timeout to Allow plenty of time for service worker registration
  this.timeout(Infinity);
  let swRegistration;
  before("Load Service Worker", function() {
    expect(navigator.serviceWorker).to.be.ok;
    
    // Service worker is a root - so it can process ALL requests to the domain.
    // Using absolute path and the webpack and browserify builds will have
    // builds of these test file with different subdirectory structures in temp/
    const swFile = '/base/serviceWorker.js';
    
    return navigator.serviceWorker.register(swFile, {scope: '/'})
      .then(function(registration) {
        return (swRegistration = registration);
      })
      .then(function(registration) {
        return new Promise(function(resolve) {
          const interval = setInterval(function() {
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
        expect(json).to.contain('4.');
      });
  });
});