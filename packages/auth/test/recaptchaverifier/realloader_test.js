/**
 * @license
 * Copyright 2018 Google Inc.
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

 /**
 * @fileoverview Tests for realloader.js.
 */

goog.provide('fireauth.RecaptchaRealLoaderTest');

goog.require('fireauth.RecaptchaRealLoader');
goog.require('goog.Promise');
goog.require('goog.Uri');
goog.require('goog.dom');
goog.require('goog.html.TrustedResourceUrl');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.TestCase');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.mockmatchers');

goog.setTestOnly('fireauth.RecaptchaRealLoaderTest');


var mockControl;
var stubs = new goog.testing.PropertyReplacer();
var grecaptcha;
var myElement, myElement2;
var ignoreArgument;
var loaderInstance;


/**
 * Initialize reCAPTCHA mocks. This mocks the grecaptcha library.
 */
function initializeRecaptchaMocks() {
  var recaptcha = {
    // Recaptcha challenge ID.
    'challengesId': 0,
    // Recaptcha array of instances.
    'instances': [],
    // Render reCAPTCHA instance.
    'render': function(container, parameters) {
      // New widget ID.
      var id = recaptcha.instances.length;
      // Element container.
      var ele = goog.dom.getElement(container);
      // Store new reCAPTCHA instance and its parameters.
      recaptcha.instances.push({
        'container': container,
        'response': 'response-' + recaptcha.challengesId,
        'userResponse': '',
        'parameters': parameters,
        'callback': parameters['callback'] || null,
        'expired-callback': parameters['expired-callback'] || null,
        'execute': false
      });
      // Increment challenges ID.
      recaptcha.challengesId++;
      if (parameters.size !== 'invisible') {
        // recaptcha can only be rendered on an empty element.
        assertFalse(goog.dom.getChildren(ele).length > 0);
        // Fill container with some HTML to simulate rendered widget.
        ele.innerHTML = '<div id="recaptchaInstance' + id + '"></div>';
      }
      // Return the reCAPTCHA widget ID.
      return id;
    },
    // Reset reCAPTCHA instance
    'reset': function(opt_id) {
      // If widget ID not provided, use last created one.
      var id = typeof opt_id !== 'undefined' ?
          opt_id : recaptcha.instances.length - 1;
      // Assert instance exists.
      assertNotNullNorUndefined(recaptcha.instances[id]);
      var parameters = recaptcha.instances[id]['parameters'];
      // Reset instance challenge and its other properties.
      recaptcha.instances[id] = {
        'container': parameters['container'],
        'response': 'response-' + recaptcha.challengesId,
        'userResponse': '',
        'parameters': parameters,
        'callback': parameters['callback'],
        'expired-callback': parameters['expired-callback'],
        'execute': false
      };
      // Increment challenges ID.
      recaptcha.challengesId++;
    },
    // Returns reCAPTCHA instance's user response.
    'getResponse': function(opt_id) {
      // If widget ID not provided, use last created one.
      var id = typeof opt_id !== 'undefined' ?
          opt_id : recaptcha.instances.length - 1;
      // Assert instance exists.
      assertNotNullNorUndefined(recaptcha.instances[id]);
      // Return user response.
      return recaptcha.instances[id]['userResponse'] || '';
    },
    // Executes the invisible reCAPTCHA. This will either force a reCAPTCHA
    // visible challenge or resolve immediately. For testing, the former
    // scenario is used.
    'execute': function(opt_id) {
      // If widget id not provided, use last created one.
      var id = typeof opt_id !== 'undefined' ?
          opt_id : recaptcha.instances.length - 1;
      // Assert instance exists.
      assertNotNullNorUndefined(recaptcha.instances[id]);
      var instance = recaptcha.instances[id];
      var parameters = instance['parameters'];
      // execute should not be called on a visible reCAPTCHA.
      if (parameters['size'] !== 'invisible') {
        throw new Error('execute called on visible reCAPTCHA!');
      }
      // Mark execute flag as true.
      instance['execute'] = true;
    },
    // For internal testing, simulates the reCAPTCHA corresponding to ID passed
    // is solved.
    'solveResponse': function(opt_id) {
      // If widget ID not provided, use last created one.
      var id = typeof opt_id !== 'undefined' ?
          opt_id : recaptcha.instances.length - 1;
      // Assert instance exists.
      assertNotNullNorUndefined(recaptcha.instances[id]);
      var instance = recaptcha.instances[id];
      var parameters = instance['parameters'];
      // Updated user response with the solve response.
      instance['userResponse'] = instance['response'];
      // execute must have been called on invisible reCAPTCHA.
      if (!instance['execute'] && parameters['size'] === 'invisible') {
        throw new Error('execute needs to be called before solving response!');
      }
      // Trigger reCAPTCHA callback.
      if (instance['callback'] &&
          typeof instance['callback'] == 'function') {
        instance['callback'](instance['response']);
      }
      // Update next challenge response.
      instance['response'] = 'response-' + recaptcha.challengesId;
      recaptcha.challengesId++;
    },
    // For internal testing, simulates the reCAPTCHA token corresponding to ID
    // passed is expired.
    'expireResponse': function(opt_id) {
      // If widget ID not provided, use last created one.
      var id = typeof opt_id !== 'undefined' ?
          opt_id : recaptcha.instances.length - 1;
      // Assert instance exists.
      assertNotNullNorUndefined(recaptcha.instances[id]);
      var instance = recaptcha.instances[id];
      // Reset user response.
      instance['userResponse'] = '';
      // Trigger expired callback.
      if (instance['expired-callback'] &&
          typeof instance['expired-callback'] == 'function') {
        instance['expired-callback']();
      }
      // Reset execute.
      instance['execute'] = false;
    }
  };
  // Fake the Recaptcha global object.
  goog.global['grecaptcha'] = recaptcha;
}


function setUp() {
  mockControl = new goog.testing.MockControl();
  ignoreArgument = goog.testing.mockmatchers.ignoreArgument;
  mockControl.$resetAll();
  // Create DIV test element and add to document.
  myElement = goog.dom.createDom(goog.dom.TagName.DIV, {'id': 'recaptcha'});
  document.body.appendChild(myElement);
  // Create another DIV test element and add to document.
  myElement2 = goog.dom.createDom(goog.dom.TagName.DIV, {'id': 'recaptcha2'});
  document.body.appendChild(myElement2);
  // Bypass singleton for tests so loaders are not shared among different tests.
  loaderInstance = new fireauth.RecaptchaRealLoader();
  stubs.replace(
      fireauth.RecaptchaRealLoader,
      'getInstance',
      function() {
        return loaderInstance;
      });
}


function tearDown() {
  // Destroy both elements.
  if (myElement) {
    goog.dom.removeNode(myElement);
    myElement = null;
  }
  if (myElement2) {
    goog.dom.removeNode(myElement2);
    myElement2 = null;
  }
  // Reset global grecaptcha.
  grecaptcha = null;
  delete grecaptcha;
  try {
    mockControl.$verifyAll();
  } finally {
    mockControl.$tearDown();
  }
  stubs.reset();
}


/**
 * Install the test to run and runs it.
 * @param {string} id The test identifier.
 * @param {function():!goog.Promise} func The test function to run.
 * @return {!goog.Promise} The result of the test.
 */
function installAndRunTest(id, func) {
  var testCase = new goog.testing.TestCase();
  testCase.addNewTest(id, func);
  var error = null;
  return testCase.runTestsReturningPromise().then(function(result) {
    assertTrue(result.complete);
    // Display error detected.
    if (result.errors.length) {
      fail(result.errors.join('\n'));
    }
    assertEquals(1, result.totalCount);
    assertEquals(1, result.runCount);
    assertEquals(1, result.successCount);
    assertEquals(0, result.errors.length);
  }).thenCatch(function(err) {
    error = err;
  }).then(function() {
    if (error) {
      throw error;
    }
  });
}


function testRecaptchaRealLoader() {
  return installAndRunTest('testRecaptchaRealLoader', function() {
    var expectedParams = {
      'sitekey': 'SITE_KEY',
      'theme': 'light',
      'type': 'image'
    };
    var currentLanguageCode = null;
    var safeLoad = mockControl.createMethodMock(goog.net.jsloader, 'safeLoad');
    // First load. Dependency loaded with null language code.
    safeLoad(ignoreArgument)
        .$does(function(url) {
          var uri = goog.Uri.parse(goog.html.TrustedResourceUrl.unwrap(url));
          var callback = uri.getParameterValue('onload');
          assertEquals('', uri.getParameterValue('hl'));
          currentLanguageCode = null;
          initializeRecaptchaMocks();
          goog.global[callback]();
        })
        .$once();
    // Third load. Dependency loaded with 'fr' language code.
    safeLoad(ignoreArgument)
        .$does(function(url) {
          var uri = goog.Uri.parse(goog.html.TrustedResourceUrl.unwrap(url));
          var callback = uri.getParameterValue('onload');
          assertEquals('fr', uri.getParameterValue('hl'));
          currentLanguageCode = 'fr';
          initializeRecaptchaMocks();
          goog.global[callback]();
        })
        .$once();
    // Seventh load. Dependency loaded with 'ar' language code.
    safeLoad(ignoreArgument)
        .$does(function(url) {
          var uri = goog.Uri.parse(goog.html.TrustedResourceUrl.unwrap(url));
          var callback = uri.getParameterValue('onload');
          assertEquals('ar', uri.getParameterValue('hl'));
          currentLanguageCode = 'ar';
          initializeRecaptchaMocks();
          goog.global[callback]();
        })
        .$once();
    mockControl.$replayAll();
    var loader = new fireauth.RecaptchaRealLoader();
    // First load with empty string hl.
    return loader.loadRecaptchaDeps(null).then(function() {
      assertNull(currentLanguageCode);
      // No load needed.
      return loader.loadRecaptchaDeps(null);
    }).then(function() {
      assertNull(currentLanguageCode);
      // Will load.
      return loader.loadRecaptchaDeps('fr');
    }).then(function() {
      assertEquals('fr', currentLanguageCode);
      // Simulate reCAPTCHAs rendered.
      grecaptcha.render(myElement, expectedParams);
      grecaptcha.render(myElement2, expectedParams);
      // This will do nothing.
      return loader.loadRecaptchaDeps('de');
    }).then(function() {
      assertEquals('fr', currentLanguageCode);
      loader.clearSingleRecaptcha();
      // Still no load as one instance remains.
      return loader.loadRecaptchaDeps('ru');
    }).then(function() {
      assertEquals('fr', currentLanguageCode);
      loader.clearSingleRecaptcha();
      // Language still loaded. No reload needed.
      return loader.loadRecaptchaDeps('fr');
    }).then(function() {
      assertEquals('fr', currentLanguageCode);
      // This will load reCAPTCHA dependencies for specified language.
      return loader.loadRecaptchaDeps('ar');
    }).then(function() {
      assertEquals('ar', currentLanguageCode);
    });
  });
}


function testRecaptchaRealLoader_alreadyLoaded() {
  return installAndRunTest(
      'testRecaptchaRealLoader_alreadyLoaded', function() {
    // Simulate grecaptcha loaded.
    initializeRecaptchaMocks();
    // No dependency load.
    var safeLoad = mockControl.createMethodMock(goog.net.jsloader, 'safeLoad');
    safeLoad(ignoreArgument).$times(0);
    mockControl.$replayAll();

    // Initialize after simulated reCAPTCHA dependency is loaded.
    var loader = new fireauth.RecaptchaRealLoader();
    return loader.loadRecaptchaDeps('de');
  });
}
