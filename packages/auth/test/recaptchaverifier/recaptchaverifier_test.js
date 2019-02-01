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

/**
 * @fileoverview Tests for recaptchaverifier.js.
 */

goog.provide('fireauth.RecaptchaVerifierTest');

goog.require('fireauth.AuthError');
goog.require('fireauth.BaseRecaptchaVerifier');
goog.require('fireauth.GRecaptchaMockFactory');
goog.require('fireauth.RecaptchaRealLoader');
goog.require('fireauth.RecaptchaVerifier');
goog.require('fireauth.RpcHandler');
goog.require('fireauth.authenum.Error');
goog.require('fireauth.common.testHelper');
goog.require('fireauth.constants');
goog.require('fireauth.util');
goog.require('goog.Promise');
goog.require('goog.Uri');
goog.require('goog.dom');
goog.require('goog.html.TrustedResourceUrl');
goog.require('goog.testing.MockClock');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.TestCase');
goog.require('goog.testing.events');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.mockmatchers');
goog.require('goog.testing.recordFunction');

goog.setTestOnly('fireauth.RecaptchaVerifierTest');


var mockControl;
var stubs = new goog.testing.PropertyReplacer();
var app;
var grecaptcha;
var myElement, myElement2;
var ignoreArgument;
var loaderInstance;
var clock;
var grecaptchaMock;
var randomCounter;
var startInstanceId = fireauth.GRecaptchaMockFactory.START_INSTANCE_ID;
var expirationTimeMs = fireauth.GRecaptchaMockFactory.EXPIRATION_TIME_MS;
var solveTimeMs = fireauth.GRecaptchaMockFactory.SOLVE_TIME_MS;


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


/**
 * Asserts the expected parameters used to initialize the reCAPTCHA.
 * @param {number} widgetId The reCAPTCHA widget ID.
 * @param {!Element|string} expectedContainer The expected reCAPTCHA container
 *     parameter.
 * @param {!Object} expectedParams The expected parameters used to initialize
 *     the reCAPTCHA.
 */
function assertRecaptchaParams(widgetId, expectedContainer, expectedParams) {
  // Confirm all expected parameters passed to the specified reCAPTCHA.
  // This check excludes callbacks.
  var instance = grecaptcha.instances[widgetId];
  var actualParameters = instance['parameters'];
  for (var key in expectedParams) {
    if (expectedParams.hasOwnProperty(key) &&
        key != 'callback' &&
        key != 'expired-callback') {
      assertEquals(expectedParams[key], actualParameters[key]);
    }
  }
  // Confirm the reCAPTCHA initialized on the expected container.
  if (expectedParams.size !== 'invisible') {
    // For visible reCAPTCHA, confirm expectedContainer element matches the
    // parent of the actual container.
    assertEquals(
        goog.dom.getElement(expectedContainer),
        goog.dom.getParentElement(instance.container));
  } else {
    assertEquals(expectedContainer, instance.container);
  }
}


function setUp() {
  mockControl = new goog.testing.MockControl();
  ignoreArgument = goog.testing.mockmatchers.ignoreArgument;
  mockControl.$resetAll();
  app = null;
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
  // Mock grecaptcha.
  var randomCounter = 0;
  var grecaptchaMock = new fireauth.GRecaptchaMockFactory();
  stubs.replace(
      fireauth.GRecaptchaMockFactory,
      'getInstance',
      function() {
        return grecaptchaMock;
      });
  stubs.replace(
      fireauth.util,
      'generateRandomAlphaNumericString',
      function(charCount) {
        assertEquals(50, charCount);
        return 'random' + (randomCounter++).toString();
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
  delete goog.global['devCallback'];
  delete goog.global['devExpiredCallback'];
  stubs.reset();
}


/**
 * Sets the Auth service on the provided app instance if not already set.
 * @param {!firebase.app.App} app The Firebase app instance on which to
 *     initialize the Auth service if not already available.
 */
function initializeAuthServiceOnApp(app) {
  // Do nothing if auth() already exists.
  if (typeof app.auth !== 'function') {
    // Use set as Auth doesn't exist on the App instance.
    stubs.set(app, 'auth', function() {
      if (!this.auth_) {
        this.auth_ = {
          settings: {
            // App verification enabled by default.
            appVerificationDisabledForTesting: false
          }
        };
      }
      return this.auth_;
    });
  }
}


/**
 * Simulates the current Auth language on the specified App instance.
 * @param {!firebase.app.App} app The expected Firebase App instance.
 * @param {?string} languageCode The default Auth language.
 */
function simulateAuthLanguage(app, languageCode) {
  initializeAuthServiceOnApp(app);
  app.auth().getLanguageCode = function() {
    return languageCode;
  };
}


/**
 * Simulates the current Auth frameworks on the specified App instance.
 * @param {!firebase.app.App} app The expected Firebase app instance.
 * @param {!Array<string>} frameworks The current frameworks set on the Auth
 *     instance.
 */
function simulateAuthFramework(app, frameworks) {
  initializeAuthServiceOnApp(app);
  app.auth().getFramework = function() {
    return frameworks;
  };
}


/**
 * Install the test to run and runs it.
 * @param {string} id The test identifier.
 * @param {function():!goog.Promise} func The test function to run.
 * @return {!goog.Promise} The result of the test.
 */
function installAndRunTest(id, func) {
  /**
   * @return {?goog.Promise<void>} A promise that resolves on cleanup
   *     completion.
   */
  var cleanupAppAndClock = function() {
    var promises = [];
    for (var i = 0; i < firebase.apps.length; i++) {
      promises.push(firebase.apps[i].delete());
    }
    var p = null;
    if (promises.length) {
      p = goog.Promise.all(promises).then(function() {
        // Dispose clock then. Disposing before will throw an error in IE 11.
        goog.dispose(clock);
      });
      if (clock) {
        // Some IE browsers like IE 11, native promise hangs if this is not
        // called when clock is mocked.
        // app.delete() will hang (it uses the native Promise).
        clock.tick();
      }
    } else if (clock) {
      goog.dispose(clock);
    }
    return p;
  };
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
    return cleanupAppAndClock();
  }).thenCatch(function(err) {
    error = err;
    return cleanupAppAndClock();
  }).then(function() {
    if (error) {
      throw error;
    }
  });
}


function testBaseRecaptchaVerifier_noDOM() {
  return installAndRunTest('testBaseAppVerifier_noHttpOrHttps', function() {
    var isDOMSupported = mockControl.createMethodMock(
        fireauth.util, 'isDOMSupported');
    isDOMSupported().$returns(false).$once();
    mockControl.$replayAll();
    var expectedError = new fireauth.AuthError(
        fireauth.authenum.Error.OPERATION_NOT_SUPPORTED,
        'RecaptchaVerifier is only supported in a browser HTTP/HTTPS ' +
        'environment with DOM support.');
    var error = assertThrows(function() {
      new fireauth.BaseRecaptchaVerifier('API_KEY', 'id');
    });
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
  });
}


function testBaseRecaptchaVerifier_noHttpOrHttps() {
  return installAndRunTest('testBaseAppVerifier_noHttpOrHttps', function() {
    var isHttpOrHttps = mockControl.createMethodMock(
        fireauth.util, 'isHttpOrHttps');
    isHttpOrHttps().$returns(false).$once();
    mockControl.$replayAll();
    var expectedError = new fireauth.AuthError(
        fireauth.authenum.Error.OPERATION_NOT_SUPPORTED,
        'RecaptchaVerifier is only supported in a browser HTTP/HTTPS ' +
        'environment.');
    var recaptchaVerifier = new fireauth.BaseRecaptchaVerifier(
        'API_KEY', myElement);
    return recaptchaVerifier.render().thenCatch(function(error) {
      fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    });
  });
}


function testBaseRecaptchaVerifier_worker() {
  return installAndRunTest('testBaseAppVerifier_noHttpOrHttps', function() {
    // This gets called in some underlying dependencies at various points.
    // It is not feasible counting the exact number of calls and the sequence
    // they get called. It is better to use property replacer to stub this
    // utility.
    stubs.replace(
        fireauth.util,
        'isWorker',
        function() {return true;});
    var isHttpOrHttps = mockControl.createMethodMock(
        fireauth.util, 'isHttpOrHttps');
    isHttpOrHttps().$returns(true).$once();
    mockControl.$replayAll();
    var expectedError = new fireauth.AuthError(
        fireauth.authenum.Error.OPERATION_NOT_SUPPORTED,
        'RecaptchaVerifier is only supported in a browser HTTP/HTTPS ' +
        'environment.');
    var recaptchaVerifier = new fireauth.BaseRecaptchaVerifier(
        'API_KEY', myElement);
    return recaptchaVerifier.render().thenCatch(function(error) {
      fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    });
  });
}


function testBaseRecaptchaVerifier_withSitekey() {
  return installAndRunTest('testBaseAppVerifier_withSitekey', function() {
    var options = {
      sitekey: 'MY_SITE_KEY'
    };
    var expectedError = new fireauth.AuthError(
        fireauth.authenum.Error.ARGUMENT_ERROR,
        'sitekey should not be provided for reCAPTCHA as one is ' +
        'automatically provisioned for the current project.');
    var error = assertThrows(function() {
      new fireauth.BaseRecaptchaVerifier('API_KEY', myElement, options);
    });
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
  });
}


function testBaseRecaptchaVerifier_visible_nonEmpty() {
  return installAndRunTest('testBaseAppVerifier_visible_nonEmpty', function() {
    var expectedError = new fireauth.AuthError(
        fireauth.authenum.Error.ARGUMENT_ERROR,
        'reCAPTCHA container is either not found or already contains inner ' +
        'elements!');
    myElement.appendChild(goog.dom.createDom(goog.dom.TagName.DIV));
    var error = assertThrows(function() {
      new fireauth.BaseRecaptchaVerifier('API_KEY', myElement);
    });
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
  });
}


function testBaseRecaptchaVerifier_invisible_nonEmpty() {
  return installAndRunTest(
      'testBaseAppVerifier_invisible_nonEmpty', function() {
    myElement.appendChild(goog.dom.createDom(goog.dom.TagName.DIV));
    var returnValue = assertNotThrows(function() {
      return new fireauth.BaseRecaptchaVerifier(
          'API_KEY', myElement, {'size': 'invisible'});
    });
    assertTrue(returnValue instanceof fireauth.BaseRecaptchaVerifier);
  });
}


function testBaseRecaptchaVerifier_invalidContainer() {
  return installAndRunTest('testBaseAppVerifier_invalidContainer', function() {
    var expectedError = new fireauth.AuthError(
        fireauth.authenum.Error.ARGUMENT_ERROR,
        'reCAPTCHA container is either not found or already contains inner ' +
        'elements!');
    var error = assertThrows(function() {
      new fireauth.BaseRecaptchaVerifier('API_KEY', 'invalidId');
    });
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
  });
}


function testBaseRecaptchaVerifier_validContainerId() {
  return installAndRunTest('testBaseAppVerifier_validContainerId', function() {
    app = firebase.initializeApp({
      apiKey: 'API_KEY'
    }, 'test');
    var returnValue = assertNotThrows(function() {
      return new fireauth.BaseRecaptchaVerifier(
          'API_KEY', 'recaptcha', {'size': 'compact'});
    });
    assertTrue(returnValue instanceof fireauth.BaseRecaptchaVerifier);
  });
}


function testBaseRecaptchaVerifier_render() {
  return installAndRunTest('testBaseAppVerifier_render', function() {
    // Confirm expected endpoint config and version passed to underlying RPC
    // handler.
    var version = '1.2.3';
    var endpoint = fireauth.constants.Endpoint.STAGING;
    var endpointConfig = {
      'firebaseEndpoint': endpoint.firebaseAuthEndpoint,
      'secureTokenEndpoint': endpoint.secureTokenEndpoint
    };
    var safeLoad = mockControl.createMethodMock(goog.net.jsloader, 'safeLoad');
    var recaptchaConfig = {
      'recaptchaSiteKey': 'SITE_KEY'
    };
    var rpcHandler = mockControl.createStrictMock(fireauth.RpcHandler);
    var rpcHandlerConstructor = mockControl.createConstructorMock(
        fireauth, 'RpcHandler');
    rpcHandlerConstructor('API_KEY', endpointConfig, version)
        .$returns(rpcHandler);
    safeLoad(ignoreArgument)
        .$does(function(url) {
          var uri = goog.Uri.parse(goog.html.TrustedResourceUrl.unwrap(url));
          var callback = uri.getParameterValue('onload');
          assertEquals('', uri.getParameterValue('hl'));
          initializeRecaptchaMocks();
          goog.global[callback]();
        })
        .$once();
    rpcHandler.getRecaptchaParam().$once().$returns(recaptchaConfig);
    mockControl.$replayAll();

    var expectedParams = {
      'sitekey': 'SITE_KEY',
      'theme': 'light',
      'type': 'image'
    };
    var recaptchaVerifier = new fireauth.BaseRecaptchaVerifier(
        'API_KEY', myElement, undefined, function() {return null;}, version,
        endpointConfig);
    assertEquals('recaptcha', recaptchaVerifier['type']);
    // Confirm property is readonly.
    recaptchaVerifier['type'] = 'modified';
    assertEquals('recaptcha', recaptchaVerifier['type']);
    return recaptchaVerifier.render().then(function(widgetId) {
      assertRecaptchaParams(widgetId, myElement, expectedParams);
      assertEquals(0, widgetId);
      return recaptchaVerifier.render();
    }).then(function(widgetId) {
      assertEquals(0, widgetId);
      grecaptcha.solveResponse(0);
      return recaptchaVerifier.verify();
    }).then(function(recaptchaToken) {
      assertEquals('response-0', recaptchaToken);
      // Already rendered.
      return recaptchaVerifier.render();
    }).then(function(widgetId) {
      assertEquals(0, widgetId);
      return recaptchaVerifier.verify();
    }).then(function(recaptchaToken) {
      // Same unexpired response returned.
      assertEquals('response-0', recaptchaToken);
      // Expire response.
      grecaptcha.expireResponse(0);
      var resp = recaptchaVerifier.verify();
      // Solve response after expiration. New reCAPTCHA token should be
      // returned.
      grecaptcha.solveResponse(0);
      return resp;
    }).then(function(recaptchaToken) {
      assertEquals('response-1', recaptchaToken);
    });
  });
}


function testBaseRecaptchaVerifier_render_visible_testMode() {
  return installAndRunTest('testBaseAppVerifier_visible_testMode', function() {
    // Confirm expected endpoint config and version passed to underlying RPC
    // handler.
    var version = '1.2.3';
    var responseCallback = goog.testing.recordFunction();
    var expiredCallback = goog.testing.recordFunction();
    // Record calls to grecaptchaMock.render.
    stubs.replace(
        fireauth.GRecaptchaMockFactory.prototype,
        'render',
        goog.testing.recordFunction(
            fireauth.GRecaptchaMockFactory.prototype.render));
    var endpoint = fireauth.constants.Endpoint.STAGING;
    var endpointConfig = {
      'firebaseEndpoint': endpoint.firebaseAuthEndpoint,
      'secureTokenEndpoint': endpoint.secureTokenEndpoint
    };
    var safeLoad = mockControl.createMethodMock(goog.net.jsloader, 'safeLoad');
    var recaptchaConfig = {
      'recaptchaSiteKey': 'SITE_KEY'
    };
    var rpcHandler = mockControl.createStrictMock(fireauth.RpcHandler);
    var rpcHandlerConstructor = mockControl.createConstructorMock(
        fireauth, 'RpcHandler');
    rpcHandlerConstructor('API_KEY', endpointConfig, version)
        .$returns(rpcHandler);
    safeLoad(ignoreArgument).$never();
    rpcHandler.getRecaptchaParam().$once().$returns(recaptchaConfig);
    mockControl.$replayAll();

    // Install mock clock.
    clock = new goog.testing.MockClock(true);
    var params = {
      'size': 'compact',
      'theme': 'light',
      'type': 'image',
      'callback': responseCallback,
      'expired-callback': expiredCallback
    };
    var recaptchaVerifier = new fireauth.BaseRecaptchaVerifier(
        'API_KEY', myElement, params, function() {return null;}, version,
        endpointConfig, true /** Enable test mode */);
    assertEquals('recaptcha', recaptchaVerifier['type']);
    // Confirm property is readonly.
    recaptchaVerifier['type'] = 'modified';
    assertEquals('recaptcha', recaptchaVerifier['type']);
    return recaptchaVerifier.render().then(function(widgetId) {
      // Mock instance should be rendered.
      assertEquals(
          1, fireauth.GRecaptchaMockFactory.prototype.render.getCallCount());
      // For visible reCAPTCHA, confirm expectedContainer element matches the
      // parent of the actual container.
      assertEquals(
          myElement,
          goog.dom.getParentElement(
              fireauth.GRecaptchaMockFactory.prototype.render.getLastCall()
                  .getArgument(0)));
      var actualParams = fireauth.GRecaptchaMockFactory.prototype.render
          .getLastCall().getArgument(1);
      // Confirm expected parameters passed to reCAPTCHA.
      assertEquals('SITE_KEY', actualParams['sitekey']);
      assertEquals('light', actualParams['theme']);
      assertEquals('image', actualParams['type']);
      assertEquals('compact', actualParams['size']);
      assertEquals(startInstanceId, widgetId);
      return recaptchaVerifier.render();
    }).then(function(widgetId) {
      assertEquals(startInstanceId, widgetId);
      var verifyPromise = recaptchaVerifier.verify();
      assertEquals(0, responseCallback.getCallCount());
      clock.tick(solveTimeMs);
      assertEquals(1, responseCallback.getCallCount());
      assertEquals('random0', responseCallback.getLastCall().getArgument(0));
      return verifyPromise;
    }).then(function(recaptchaToken) {
      assertEquals('random0', recaptchaToken);
      // Already rendered.
      return recaptchaVerifier.render();
    }).then(function(widgetId) {
      assertEquals(startInstanceId, widgetId);
      return recaptchaVerifier.verify();
    }).then(function(recaptchaToken) {
      // Same unexpired response returned.
      assertEquals('random0', recaptchaToken);
      assertEquals(0, expiredCallback.getCallCount());
      // Expire response.
      clock.tick(expirationTimeMs);
      assertEquals(1, expiredCallback.getCallCount());
      var resp = recaptchaVerifier.verify();
      // Solve response after expiration. New reCAPTCHA token should be
      // returned.
      clock.tick(solveTimeMs);
      return resp;
    }).then(function(recaptchaToken) {
      assertEquals(2, responseCallback.getCallCount());
      assertEquals('random1', responseCallback.getLastCall().getArgument(0));
      assertEquals('random1', recaptchaToken);
    });
  });
}


function testBaseRecaptchaVerifier_render_invisible_testMode() {
  return installAndRunTest('testBaseVerifier_invisible_testMode', function() {
    // Confirm expected endpoint config and version passed to underlying RPC
    // handler.
    var version = '1.2.3';
    var responseCallback = goog.testing.recordFunction();
    var expiredCallback = goog.testing.recordFunction();
    // Record calls to grecaptchaMock.render.
    stubs.replace(
        fireauth.GRecaptchaMockFactory.prototype,
        'render',
        goog.testing.recordFunction(
            fireauth.GRecaptchaMockFactory.prototype.render));
    var endpoint = fireauth.constants.Endpoint.STAGING;
    var endpointConfig = {
      'firebaseEndpoint': endpoint.firebaseAuthEndpoint,
      'secureTokenEndpoint': endpoint.secureTokenEndpoint
    };
    var safeLoad = mockControl.createMethodMock(goog.net.jsloader, 'safeLoad');
    var recaptchaConfig = {
      'recaptchaSiteKey': 'SITE_KEY'
    };
    var rpcHandler = mockControl.createStrictMock(fireauth.RpcHandler);
    var rpcHandlerConstructor = mockControl.createConstructorMock(
        fireauth, 'RpcHandler');
    rpcHandlerConstructor('API_KEY', endpointConfig, version)
        .$returns(rpcHandler);
    safeLoad(ignoreArgument).$never();
    rpcHandler.getRecaptchaParam().$once().$returns(recaptchaConfig);
    mockControl.$replayAll();

    // Install mock clock.
    clock = new goog.testing.MockClock(true);
    var params = {
      'size': 'invisible',
      'theme': 'light',
      'type': 'image',
      'callback': responseCallback,
      'expired-callback': expiredCallback
    };
    var recaptchaVerifier = new fireauth.BaseRecaptchaVerifier(
        'API_KEY', myElement, params, function() {return null;}, version,
        endpointConfig, true /** Enable test mode */);
    assertEquals('recaptcha', recaptchaVerifier['type']);
    // Confirm property is readonly.
    recaptchaVerifier['type'] = 'modified';
    assertEquals('recaptcha', recaptchaVerifier['type']);
    return recaptchaVerifier.render().then(function(widgetId) {
      // Confirm mock reCAPTCHA instance rendered.
      assertEquals(
          1, fireauth.GRecaptchaMockFactory.prototype.render.getCallCount());
      // For invisible reCAPTCHA, confirm expectedContainer element matches the
      // actual container.
      assertEquals(
          myElement,
          fireauth.GRecaptchaMockFactory.prototype.render.getLastCall()
              .getArgument(0));
      var actualParams = fireauth.GRecaptchaMockFactory.prototype.render
          .getLastCall().getArgument(1);
      // Confirm expected parameters passed to reCAPTCHA.
      assertEquals('SITE_KEY', actualParams['sitekey']);
      assertEquals('light', actualParams['theme']);
      assertEquals('image', actualParams['type']);
      assertEquals('invisible', actualParams['size']);
      assertEquals(startInstanceId, widgetId);
      return recaptchaVerifier.render();
    }).then(function(widgetId) {
      assertEquals(startInstanceId, widgetId);
      var verifyPromise = recaptchaVerifier.verify();
      // verify calls render underneath, wait for it to resolve before running
      // clock.
      return recaptchaVerifier.render().then(function() {
        assertEquals(0, responseCallback.getCallCount());
        clock.tick(solveTimeMs);
        assertEquals(1, responseCallback.getCallCount());
        assertEquals('random0', responseCallback.getLastCall().getArgument(0));
        return verifyPromise;
      });
    }).then(function(recaptchaToken) {
      assertEquals('random0', recaptchaToken);
      // Already rendered.
      return recaptchaVerifier.render();
    }).then(function(widgetId) {
      assertEquals(startInstanceId, widgetId);
      return recaptchaVerifier.verify();
    }).then(function(recaptchaToken) {
      // Same unexpired response returned.
      assertEquals('random0', recaptchaToken);
      assertEquals(0, expiredCallback.getCallCount());
      // Expire response.
      clock.tick(expirationTimeMs);
      assertEquals(1, expiredCallback.getCallCount());
      // Element click should resolve with a token.
      goog.testing.events.fireClickSequence(myElement);
      clock.tick(solveTimeMs);
      return recaptchaVerifier.verify();
    }).then(function(recaptchaToken) {
      assertEquals(2, responseCallback.getCallCount());
      assertEquals('random1', responseCallback.getLastCall().getArgument(0));
      assertEquals('random1', recaptchaToken);
    });
  });
}


function testBaseRecaptchaVerifier_render_offline() {
  return installAndRunTest('testBaseAppVerifier_render_offline', function() {
    // Install mock clock.
    clock = new goog.testing.MockClock(true);
    var safeLoad = mockControl.createMethodMock(goog.net.jsloader, 'safeLoad');
    var recaptchaConfig = {
      'recaptchaSiteKey': 'SITE_KEY'
    };
    var isOnline = mockControl.createMethodMock(fireauth.util, 'isOnline');
    var rpcHandler = mockControl.createStrictMock(fireauth.RpcHandler);
    var rpcHandlerConstructor = mockControl.createConstructorMock(
        fireauth, 'RpcHandler');
    rpcHandlerConstructor('API_KEY', null, ignoreArgument).$returns(rpcHandler);
    // Simulate first attempt fails due to network connection not being
    // available.
    isOnline().$does(function() {
      goog.Promise.resolve().then(function() {
        clock.tick(5000);
      });
      return false;
    });
    // Simulate first call does nothing due to network timeout.
    safeLoad(ignoreArgument).$returns(
        new goog.Promise(function(resolve, reject) {}));
    // Simulate second attempt succeeding.
    isOnline().$returns(true);
    safeLoad(ignoreArgument)
        .$does(function(url) {
          var uri = goog.Uri.parse(goog.html.TrustedResourceUrl.unwrap(url));
          var callback = uri.getParameterValue('onload');
          assertEquals('', uri.getParameterValue('hl'));
          initializeRecaptchaMocks();
          goog.global[callback]();
        })
        .$once();
    rpcHandler.getRecaptchaParam().$once().$returns(recaptchaConfig);
    mockControl.$replayAll();

    var expectedParams = {
      'sitekey': 'SITE_KEY',
      'theme': 'light',
      'type': 'image',
      // Invalid callback names should be ignored.
      'callback': 'invalid',
      'expired-callback': 'invalid'
    };
    var expectedError = new fireauth.AuthError(
        fireauth.authenum.Error.NETWORK_REQUEST_FAILED);
    var recaptchaVerifier = new fireauth.BaseRecaptchaVerifier(
        'API_KEY', myElement);
    return recaptchaVerifier.render().thenCatch(function(error) {
      // Initial attempt fails due to network connection.
      fireauth.common.testHelper.assertErrorEquals(expectedError, error);
      // Try again. It should be successful now.
      return recaptchaVerifier.render();
    }).then(function(widgetId) {
      assertRecaptchaParams(widgetId, myElement, expectedParams);
      assertEquals(0, widgetId);
      return recaptchaVerifier.render();
    }).then(function(widgetId) {
      assertEquals(0, widgetId);
      grecaptcha.solveResponse(0);
      return recaptchaVerifier.verify();
    }).then(function(recaptchaToken) {
      assertEquals('response-0', recaptchaToken);
      // Already rendered.
      return recaptchaVerifier.render();
    }).then(function(widgetId) {
      assertEquals(0, widgetId);
      return recaptchaVerifier.verify();
    }).then(function(recaptchaToken) {
      assertEquals('response-0', recaptchaToken);
      grecaptcha.expireResponse(0);
      var resp = recaptchaVerifier.verify();
      grecaptcha.solveResponse(0);
      return resp;
    }).then(function(recaptchaToken) {
      assertEquals('response-1', recaptchaToken);
    });
  });
}


function testBaseRecaptchaVerifier_render_grecaptchaLoaded() {
  return installAndRunTest('testBaseAppVerifier_recaptchaLoaded', function() {
    // Simulate grecaptcha loaded.
    initializeRecaptchaMocks();
    var recaptchaConfig = {
      'recaptchaSiteKey': 'SITE_KEY'
    };
    var rpcHandler = mockControl.createStrictMock(fireauth.RpcHandler);
    var rpcHandlerConstructor = mockControl.createConstructorMock(
        fireauth, 'RpcHandler');
    rpcHandlerConstructor('API_KEY', null, ignoreArgument).$returns(rpcHandler);
    rpcHandler.getRecaptchaParam().$once().$returns(recaptchaConfig);
    mockControl.$replayAll();

    var expectedParams = {
      'sitekey': 'SITE_KEY'
    };
    // In addition, test when the developer passes their own callbacks.
    var devCallback = goog.testing.recordFunction();
    var devExpiredCallback = goog.testing.recordFunction();
    var params = {
      'callback': devCallback,
      'expired-callback': devExpiredCallback
    };
    var resp = null;
    var recaptchaVerifier = new fireauth.BaseRecaptchaVerifier(
        'API_KEY', myElement, params);
    return recaptchaVerifier.render().then(function(widgetId) {
      assertRecaptchaParams(widgetId, myElement, expectedParams);
      assertEquals(0, widgetId);
      return recaptchaVerifier.render();
    }).then(function(widgetId) {
      assertEquals(0, widgetId);
      // Simulate the reCAPTCHA challenge solved.
      grecaptcha.solveResponse(0);
      // Developer callback should be called with the expected token.
      assertEquals(1, devCallback.getCallCount());
      assertEquals('response-0', devCallback.getLastCall().getArgument(0));
      // verify should resolve with the same token.
      return recaptchaVerifier.verify();
    }).then(function(recaptchaToken) {
      assertEquals('response-0', recaptchaToken);
      // Already rendered.
      return recaptchaVerifier.render();
    }).then(function(widgetId) {
      // Cached response returned.
      assertEquals(0, widgetId);
      return recaptchaVerifier.verify();
    }).then(function(recaptchaToken) {
      assertEquals('response-0', recaptchaToken);
      // Expire the response.
      grecaptcha.expireResponse(0);
      // Developer expired callback should be triggered.
      assertEquals(1, devExpiredCallback.getCallCount());
      // Try to verify again.
      resp = recaptchaVerifier.verify();
      // Break thread to allow the verification to pick up the new response.
      return goog.Promise.resolve();
    }).then(function() {
      // Solve reCAPTCHA. Ths should be picked up.
      grecaptcha.solveResponse(0);
      // Developer token callback triggered with new token.
      assertEquals(2, devCallback.getCallCount());
      assertEquals('response-1',devCallback.getLastCall().getArgument(0));
      assertEquals('response-1', grecaptcha.getResponse());
      return goog.Promise.resolve();
    }).then(function() {
      // Expire token.
      grecaptcha.expireResponse(0);
      // Expired callback triggered.
      assertEquals(2, devExpiredCallback.getCallCount());
      // Solve reCAPTCHA.
      grecaptcha.solveResponse(0);
      // Developer callback triggered with the new token.
      assertEquals(3, devCallback.getCallCount());
      assertEquals('response-2', devCallback.getLastCall().getArgument(0));
      assertEquals('response-2', grecaptcha.getResponse());
      return goog.Promise.resolve();
    }).then(function() {
      // Confirm the first resolved token picked up earlier.
      return resp;
    }).then(function(recaptchaToken) {
      assertEquals('response-1', recaptchaToken);
    });
  });
}


function testBaseRecaptchaVerifier_render_stringCallbacks() {
  return installAndRunTest('testBaseAppVerifier_stringCallbacks', function() {
    // Simulate grecaptcha loaded.
    initializeRecaptchaMocks();
    var recaptchaConfig = {
      'recaptchaSiteKey': 'SITE_KEY'
    };
    var rpcHandler = mockControl.createStrictMock(fireauth.RpcHandler);
    var rpcHandlerConstructor = mockControl.createConstructorMock(
        fireauth, 'RpcHandler');
    rpcHandlerConstructor('API_KEY', null, ignoreArgument).$returns(rpcHandler);
    rpcHandler.getRecaptchaParam().$once().$returns(recaptchaConfig);
    mockControl.$replayAll();

    var expectedParams = {
      'sitekey': 'SITE_KEY'
    };
    // Test when the developer passes callback function names instead of the
    // function references directly.
    goog.global['devCallback'] = goog.testing.recordFunction();
    goog.global['devExpiredCallback'] = goog.testing.recordFunction();
    var params = {
      'callback': 'devCallback',
      'expired-callback': 'devExpiredCallback'
    };
    var resp = null;
    var recaptchaVerifier = new fireauth.BaseRecaptchaVerifier(
        'API_KEY', myElement, params);
    return recaptchaVerifier.render().then(function(widgetId) {
      assertRecaptchaParams(widgetId, myElement, expectedParams);
      assertEquals(0, widgetId);
      return recaptchaVerifier.render();
    }).then(function(widgetId) {
      assertEquals(0, widgetId);
      // Simulate the reCAPTCHA challenge solved.
      grecaptcha.solveResponse(0);
      // Developer callback should be called with the expected token.
      assertEquals(1, goog.global['devCallback'].getCallCount());
      assertEquals(
          'response-0',
          goog.global['devCallback'].getLastCall().getArgument(0));
      // verify should resolve with the same token.
      return recaptchaVerifier.verify();
    }).then(function(recaptchaToken) {
      assertEquals('response-0', recaptchaToken);
      // Already rendered.
      return recaptchaVerifier.render();
    }).then(function(widgetId) {
      // Cached response returned.
      assertEquals(0, widgetId);
      return recaptchaVerifier.verify();
    }).then(function(recaptchaToken) {
      assertEquals('response-0', recaptchaToken);
      // Expire the response.
      grecaptcha.expireResponse(0);
      // Developer expired callback should be triggered.
      assertEquals(1, goog.global['devExpiredCallback'].getCallCount());
      // Try to verify again.
      resp = recaptchaVerifier.verify();
      // Break thread to allow the verification to pick up the new response.
      return goog.Promise.resolve();
    }).then(function() {
      // Solve reCAPTCHA. Ths should be picked up.
      grecaptcha.solveResponse(0);
      // Developer token callback triggered with new token.
      assertEquals(2, goog.global['devCallback'].getCallCount());
      assertEquals(
          'response-1',
          goog.global['devCallback'].getLastCall().getArgument(0));
      assertEquals('response-1', grecaptcha.getResponse());
      return goog.Promise.resolve();
    }).then(function() {
      // Expire token.
      grecaptcha.expireResponse(0);
      // Expired callback triggered.
      assertEquals(2, goog.global['devExpiredCallback'].getCallCount());
      // Solve reCAPTCHA.
      grecaptcha.solveResponse(0);
      // Developer callback triggered with the new token.
      assertEquals(3, goog.global['devCallback'].getCallCount());
      assertEquals(
          'response-2',
          goog.global['devCallback'].getLastCall().getArgument(0));
      assertEquals('response-2', grecaptcha.getResponse());
      return goog.Promise.resolve();
    }).then(function() {
      // Confirm the first resolved token picked up earlier.
      return resp;
    }).then(function(recaptchaToken) {
      assertEquals('response-1', recaptchaToken);
    });
  });
}


function testBaseRecaptchaVerifier_getRecaptchaParamError() {
  return installAndRunTest(
      'testBaseAppVerifier__recaptchaParamError', function() {
    var expectedError = new fireauth.AuthError(
        fireauth.authenum.Error.INTERNAL_ERROR,
        'Something unexpected happened.');
    var safeLoad = mockControl.createMethodMock(goog.net.jsloader, 'safeLoad');
    var recaptchaConfig = {
      'recaptchaSiteKey': 'SITE_KEY'
    };
    var rpcHandler = mockControl.createStrictMock(fireauth.RpcHandler);
    var rpcHandlerConstructor = mockControl.createConstructorMock(
        fireauth, 'RpcHandler');
    rpcHandlerConstructor('API_KEY', null, ignoreArgument).$returns(rpcHandler);
    safeLoad(ignoreArgument)
        .$does(function(url) {
          var uri = goog.Uri.parse(goog.html.TrustedResourceUrl.unwrap(url));
          var callback = uri.getParameterValue('onload');
          assertEquals('', uri.getParameterValue('hl'));
          initializeRecaptchaMocks();
          goog.global[callback]();
        })
        .$once();
    // Simulate first attempt fails for some unknown reason.
    rpcHandler.getRecaptchaParam().$once().$does(function() {
      return goog.Promise.reject(expectedError);
    });
    // Allow second attempt to succeed.
    rpcHandler.getRecaptchaParam().$once().$returns(recaptchaConfig);
    mockControl.$replayAll();

    var expectedParams = {
      'sitekey': 'SITE_KEY',
      'theme': 'light',
      'type': 'image'
    };
    var recaptchaVerifier = new fireauth.BaseRecaptchaVerifier(
        'API_KEY', myElement);
    return recaptchaVerifier.render().thenCatch(function(error) {
      // First attempt fails with the same expected underlying error.
      fireauth.common.testHelper.assertErrorEquals(expectedError, error);
      // Try again.
      return recaptchaVerifier.render();
    }).then(function(widgetId) {
      // Resolves with the expected widget ID.
      assertRecaptchaParams(widgetId, myElement, expectedParams);
      assertEquals(0, widgetId);
      return recaptchaVerifier.render();
    }).then(function(widgetId) {
      // Same cached response. All other behavior should be the same.
      assertEquals(0, widgetId);
    });
  });
}


function testBaseRecaptchaVerifier_verify_newToken() {
  return installAndRunTest('testBaseAppVerifier_verify_newToken', function() {
    // Simulate grecaptcha loaded.
    initializeRecaptchaMocks();
    var recaptchaConfig = {
      'recaptchaSiteKey': 'SITE_KEY'
    };
    var rpcHandler = mockControl.createStrictMock(fireauth.RpcHandler);
    var rpcHandlerConstructor = mockControl.createConstructorMock(
        fireauth, 'RpcHandler');
    rpcHandlerConstructor('API_KEY', null, ignoreArgument).$returns(rpcHandler);
    rpcHandler.getRecaptchaParam().$once().$returns(recaptchaConfig);
    mockControl.$replayAll();

    var expectedParams = {
      'sitekey': 'SITE_KEY',
      'theme': 'light',
      'type': 'image'
    };
    var resp = null;
    var recaptchaVerifier = new fireauth.BaseRecaptchaVerifier(
        'API_KEY', myElement);
    // Simulate challenge solved after calling verify.
    setTimeout(function() {
      grecaptcha.solveResponse(0);
    }, 10);
    // This should render the reCAPTCHA and then after challenge is solve,
    // resolve with the expected reCAPTCHA token.
    return recaptchaVerifier.verify().then(function(recaptchaToken) {
      assertRecaptchaParams(0, myElement, expectedParams);
      assertEquals('response-0', recaptchaToken);
      return recaptchaVerifier.verify();
    }).then(function(recaptchaToken) {
      assertEquals('response-0', recaptchaToken);
      // Expire the token response.
      grecaptcha.expireResponse(0);
      // Verify again.
      resp = recaptchaVerifier.verify();
      return goog.Promise.resolve();
    }).then(function() {
      // New response should be picked up.
      grecaptcha.solveResponse(0);
      assertEquals('response-1', grecaptcha.getResponse());
      return goog.Promise.resolve();
    }).then(function() {
      // Expire and then solve again.
      grecaptcha.expireResponse(0);
      grecaptcha.solveResponse(0);
      assertEquals('response-2', grecaptcha.getResponse());
      return goog.Promise.resolve();
    }).then(function() {
      // Verify should resolve with the first expected response.
      return resp;
    }).then(function(recaptchaToken) {
      assertEquals('response-1', recaptchaToken);
    });
  });
}


function testBaseRecaptchaVerifier_idElement() {
  return installAndRunTest('testBaseAppVerifier_idElement', function() {
    // Simulate grecaptcha loaded.
    initializeRecaptchaMocks();
    var recaptchaConfig = {
      'recaptchaSiteKey': 'SITE_KEY'
    };
    var rpcHandler = mockControl.createStrictMock(fireauth.RpcHandler);
    var rpcHandlerConstructor = mockControl.createConstructorMock(
        fireauth, 'RpcHandler');
    rpcHandlerConstructor('API_KEY', null, ignoreArgument).$returns(rpcHandler);
    rpcHandler.getRecaptchaParam().$once().$returns(recaptchaConfig);
    mockControl.$replayAll();

    var expectedParams = {
      'sitekey': 'SITE_KEY',
      'theme': 'light',
      'type': 'image'
    };
    // Pass the element ID instead of the element itself for the container
    // argument.
    var recaptchaVerifier = new fireauth.BaseRecaptchaVerifier(
        'API_KEY', 'recaptcha');
    setTimeout(function() {
      grecaptcha.solveResponse(0);
    }, 10);
    return recaptchaVerifier.verify().then(function(recaptchaToken) {
      // reCAPTCHA initialized with the expected parameters.
      assertRecaptchaParams(0, 'recaptcha', expectedParams);
      // verify resolves with the expected response.
      assertEquals('response-0', recaptchaToken);
      // Same response cached until expiration.
      return recaptchaVerifier.verify();
    }).then(function(recaptchaToken) {
      assertEquals('response-0', recaptchaToken);
    });
  });
}


function testBaseRecaptchaVerifier_verify_reset() {
  return installAndRunTest('testBaseAppVerifier_verify_reset', function() {
    // Simulate grecaptcha loaded.
    initializeRecaptchaMocks();
    var recaptchaConfig = {
      'recaptchaSiteKey': 'SITE_KEY'
    };
    var rpcHandler = mockControl.createStrictMock(fireauth.RpcHandler);
    var rpcHandlerConstructor = mockControl.createConstructorMock(
        fireauth, 'RpcHandler');
    rpcHandlerConstructor('API_KEY', null, ignoreArgument).$returns(rpcHandler);
    rpcHandler.getRecaptchaParam().$once().$returns(recaptchaConfig);
    mockControl.$replayAll();

    var recaptchaVerifier = new fireauth.BaseRecaptchaVerifier(
        'API_KEY', myElement);
    var widgetIdReturned = null;
    return recaptchaVerifier.render().then(function(widgetId) {
      assertEquals(0, widgetId);
      widgetIdReturned = widgetId;
      grecaptcha.solveResponse(widgetId);
      return recaptchaVerifier.verify();
    }).then(function(recaptchaToken) {
      assertEquals('response-0', recaptchaToken);
      // After reset, the cached response is forgotten and the new one is used.
      assertEquals('response-0', grecaptcha.getResponse(widgetIdReturned));
      recaptchaVerifier.reset();
      assertEquals('', grecaptcha.getResponse(widgetIdReturned));
      setTimeout(function() {
        // The new solved challenge will be used as the old response is reset.
        grecaptcha.solveResponse(0);
      }, 10);
      return recaptchaVerifier.verify();
    }).then(function(recaptchaToken) {
      // Since reCAPTCHA is reset, the new response should be used.
      assertEquals('response-2', recaptchaToken);
      assertEquals('response-2', grecaptcha.getResponse(0));
    });
  });
}


function testBaseRecaptchaVerifier_multipleVerifiers() {
  return installAndRunTest('testBaseAppVerifier_multipleVerifiers', function() {
    // Simulate grecaptcha loaded.
    initializeRecaptchaMocks();
    var recaptchaConfig1 = {
      'recaptchaSiteKey': 'SITE_KEY1'
    };
    var recaptchaConfig2 = {
      'recaptchaSiteKey': 'SITE_KEY2'
    };
    var rpcHandler = mockControl.createStrictMock(fireauth.RpcHandler);
    var rpcHandler2 = mockControl.createStrictMock(fireauth.RpcHandler);
    var rpcHandlerConstructor = mockControl.createConstructorMock(
        fireauth, 'RpcHandler');
    rpcHandlerConstructor('API_KEY', null, ignoreArgument)
        .$returns(rpcHandler);
    rpcHandlerConstructor('API_KEY', null, ignoreArgument)
        .$returns(rpcHandler2);
    rpcHandler.getRecaptchaParam().$once().$returns(recaptchaConfig1);
    rpcHandler2.getRecaptchaParam().$once().$returns(recaptchaConfig2);
    mockControl.$replayAll();

    var expectedParams1 = {
      'sitekey': 'SITE_KEY1',
      'theme': 'dark ',
      'type': 'audio',
      'size': 'compact'
    };
    var params1 = {
      'theme': 'dark ',
      'type': 'audio',
      'size': 'compact'
    };
    var expectedParams2 = {
      'sitekey': 'SITE_KEY2',
      'theme': 'light',
      'type': 'image',
      'tabindex': 1
    };
    var params2 = {
      'theme': 'light',
      'type': 'image',
      'tabindex': 1
    };
    // Initialize 2 reCAPTCHA verifiers.
    var recaptchaVerifier1 = new fireauth.BaseRecaptchaVerifier(
        'API_KEY', myElement, params1);
    var recaptchaVerifier2 = new fireauth.BaseRecaptchaVerifier(
        'API_KEY', myElement2, params2);
    // Render first reCAPTCHA.
    var p1 = recaptchaVerifier1.render().then(function(widgetId) {
      // Expected widget ID returned.
      assertEquals(0, widgetId);
      // reCAPTCHA initialized with the expected parameters.
      assertRecaptchaParams(widgetId, myElement, expectedParams1);
      // Solve the challenge for the first reCAPTCHA.
      grecaptcha.solveResponse(widgetId);
      // verify should be resolved with the expected response.
      return recaptchaVerifier1.verify();
    }).then(function(recaptchaToken) {
      assertEquals('response-0', recaptchaToken);
    });
    // Render second reCAPTCHA.
    var p2 = recaptchaVerifier2.render().then(function(widgetId) {
      // Expected widget ID returned.
      assertEquals(1, widgetId);
      // reCAPTCHA initialized with the expected parameters.
      assertRecaptchaParams(widgetId, myElement2, expectedParams2);
      // Solve the challenge for the second reCAPTCHA.
      grecaptcha.solveResponse(widgetId);
      // verify should be resolved with the expected response.
      return recaptchaVerifier2.verify();
    }).then(function(recaptchaToken) {
      assertEquals('response-1', recaptchaToken);
    });
    return goog.Promise.all([p1, p2]);
  });
}


function testBaseRecaptchaVerifier_verify_invisibleRecaptcha() {
  return installAndRunTest('testBaseAppVerifier_verify_invisible', function() {
    // Simulate grecaptcha loaded.
    initializeRecaptchaMocks();
    var recaptchaConfig = {
      'recaptchaSiteKey': 'SITE_KEY'
    };
    var rpcHandler = mockControl.createStrictMock(fireauth.RpcHandler);
    var rpcHandlerConstructor = mockControl.createConstructorMock(
        fireauth, 'RpcHandler');
    rpcHandlerConstructor('API_KEY', null, ignoreArgument).$returns(rpcHandler);
    rpcHandler.getRecaptchaParam().$once().$returns(recaptchaConfig);
    mockControl.$replayAll();

    var expectedParams = {
      'sitekey': 'SITE_KEY',
      'size': 'invisible'
    };
    var resp = null;
    // Initialize invisible reCAPTCHA.
    var recaptchaVerifier = new fireauth.BaseRecaptchaVerifier(
        'API_KEY', myElement, {'size': 'invisible'});
    // Simulate invisible reCAPTCHA solved after some delay.
    setTimeout(function() {
      grecaptcha.execute(0);
      grecaptcha.solveResponse(0);
    }, 10);
    // This should render and resolve with the expected response.
    return recaptchaVerifier.verify().then(function(recaptchaToken) {
      assertRecaptchaParams(0, myElement, expectedParams);
      assertEquals('response-0', recaptchaToken);
      // Same cached response returned.
      return recaptchaVerifier.verify();
    }).then(function(recaptchaToken) {
      assertEquals('response-0', recaptchaToken);
      // Expire response.
      grecaptcha.expireResponse(0);
      // verify again.
      resp = recaptchaVerifier.verify();
      return goog.Promise.resolve();
    }).then(function() {
      // After this is solved, verify should resolve with it.
      // Even though execute is not call here, it will not throw an error as
      // verify calls it underneath.
      grecaptcha.solveResponse(0);
      assertEquals('response-1', grecaptcha.getResponse());
      return goog.Promise.resolve();
    }).then(function() {
      // Expire and solve again. This should be ignored by verify.
      grecaptcha.expireResponse(0);
      grecaptcha.execute(0);
      grecaptcha.solveResponse(0);
      assertEquals('response-2', grecaptcha.getResponse());
      return goog.Promise.resolve();
    }).then(function() {
      return resp;
    }).then(function(recaptchaToken) {
      // Expected first response returned.
      assertEquals('response-1', recaptchaToken);
    });
  });
}


function testBaseRecaptchaVerifier_visible_clear() {
  return installAndRunTest('testBaseAppVerifier_visible_clear', function() {
    // Simulate grecaptcha loaded.
    initializeRecaptchaMocks();
    var expectedError = new fireauth.AuthError(
        fireauth.authenum.Error.INTERNAL_ERROR,
        'RecaptchaVerifier instance has been destroyed.');
    var recaptchaConfig = {
      'recaptchaSiteKey': 'SITE_KEY'
    };
    var rpcHandler = mockControl.createStrictMock(fireauth.RpcHandler);
    var rpcHandlerConstructor = mockControl.createConstructorMock(
        fireauth, 'RpcHandler');
    rpcHandlerConstructor('API_KEY', null, ignoreArgument).$returns(rpcHandler);
    rpcHandler.getRecaptchaParam().$once().$returns(recaptchaConfig);
    mockControl.$replayAll();

    var recaptchaVerifier = new fireauth.BaseRecaptchaVerifier(
        'API_KEY', myElement);
    return recaptchaVerifier.render().then(function(widgetId) {
      // After rendering a visible reCAPTCHA, confirm reCAPTCHA HTML content
      // added to that container.
      assertEquals(
          1,
          goog.dom.getChildren(goog.dom.getElement(myElement)).length);
      // Clear reCAPTCHA.
      recaptchaVerifier.clear();
      // reCAPTCHA content should be cleared.
      assertEquals(
          0,
          goog.dom.getChildren(goog.dom.getElement(myElement)).length);
      // Calling verify will throw the expected error.
      var error = assertThrows(function() {
        recaptchaVerifier.verify();
      });
      fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    });
  });
}


function testBaseRecaptchaVerifier_pendingPromises_clear() {
  return installAndRunTest(
      'testBaseAppVerifier_pendingPromises_clear', function() {
    // Simulate grecaptcha loaded.
    initializeRecaptchaMocks();
    var rpcHandler = mockControl.createStrictMock(fireauth.RpcHandler);
    var rpcHandlerConstructor = mockControl.createConstructorMock(
        fireauth, 'RpcHandler');
    rpcHandlerConstructor('API_KEY', null, ignoreArgument).$returns(rpcHandler);
    mockControl.$replayAll();

    var recaptchaVerifier = new fireauth.BaseRecaptchaVerifier(
        'API_KEY', myElement);
    var p = new goog.Promise(function(resolve, reject) {
      // This will remain pending until it is cancelled.
      recaptchaVerifier.verify().then(function(token) {
        reject('reCAPTCHA verify pending promise should be cancelled!');
      }).thenCatch(function(error) {
        assertFalse(recaptchaVerifier.hasPendingPromises());
        // Cancellation error should trigger.
        assertEquals(
            'RecaptchaVerifier instance has been destroyed.', error.message);
        resolve();
      });
      // recaptchaVerifier verify promise should be pending.
      assertTrue(recaptchaVerifier.hasPendingPromises());
    });
    // Clear reCAPTCHA. This should cancel the above pending promise.
    recaptchaVerifier.clear();
    return p;
  });
}


function testBaseRecaptchaVerifier_invisible_clear() {
  return installAndRunTest('testBaseAppVerifier_invisible_clear', function() {
    // Simulate grecaptcha loaded.
    initializeRecaptchaMocks();
    var expectedError = new fireauth.AuthError(
        fireauth.authenum.Error.INTERNAL_ERROR,
        'RecaptchaVerifier instance has been destroyed.');
    var recaptchaConfig = {
      'recaptchaSiteKey': 'SITE_KEY'
    };
    var rpcHandler = mockControl.createStrictMock(fireauth.RpcHandler);
    var rpcHandlerConstructor = mockControl.createConstructorMock(
        fireauth, 'RpcHandler');
    rpcHandlerConstructor('API_KEY', null, ignoreArgument).$returns(rpcHandler);
    rpcHandler.getRecaptchaParam().$once().$returns(recaptchaConfig);
    mockControl.$replayAll();

    // Append 2 DIVs to the container. This is fine for invisible reCAPTCHAs.
    myElement.appendChild(goog.dom.createDom(goog.dom.TagName.DIV));
    myElement.appendChild(goog.dom.createDom(goog.dom.TagName.DIV));
    var recaptchaVerifier = new fireauth.BaseRecaptchaVerifier(
        'API_KEY', myElement, {'size': 'invisible'});
    return recaptchaVerifier.render().then(function(widgetId) {
      // After rendering, no new content added to the container.
      assertEquals(
          2,
          goog.dom.getChildren(goog.dom.getElement(myElement)).length);
      // Clear reCAPTCHA.
      recaptchaVerifier.clear();
      // No changes to container.
      assertEquals(
          2,
          goog.dom.getChildren(goog.dom.getElement(myElement)).length);
      // Calling any reCAPTCHA verifier API will throw the expected error.
      var error = assertThrows(function() {
        recaptchaVerifier.render();
      });
      fireauth.common.testHelper.assertErrorEquals(expectedError, error);
    });
  });
}


function testBaseRecaptchaVerifier_localization() {
  return installAndRunTest('testBaseAppVerifier_localization', function() {
    var currentLanguageCode = null;
    var appLanguageCode = null;
    var getLanguageCode = function() {return appLanguageCode;};
    var safeLoad = mockControl.createMethodMock(goog.net.jsloader, 'safeLoad');
    var recaptchaConfig = {
      'recaptchaSiteKey': 'SITE_KEY'
    };
    var rpcHandler = mockControl.createStrictMock(fireauth.RpcHandler);
    var rpcHandlerConstructor = mockControl.createConstructorMock(
        fireauth, 'RpcHandler');
    // First instance.
    rpcHandlerConstructor('API_KEY', null, ignoreArgument).$returns(rpcHandler);
    // Dependency loaded with language code 'fr'.
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
    rpcHandler.getRecaptchaParam().$once().$returns(recaptchaConfig);
    // Second instance.
    rpcHandlerConstructor('API_KEY', null, ignoreArgument).$returns(rpcHandler);
    // Dependency loaded with language code 'de'.
    safeLoad(ignoreArgument)
        .$does(function(url) {
          var uri = goog.Uri.parse(goog.html.TrustedResourceUrl.unwrap(url));
          var callback = uri.getParameterValue('onload');
          assertEquals('de', uri.getParameterValue('hl'));
          currentLanguageCode = 'de';
          initializeRecaptchaMocks();
          goog.global[callback]();
        })
        .$once();
    rpcHandler.getRecaptchaParam().$once().$returns(recaptchaConfig);
    // Third instance. As same language is used, no dependency reload.
    rpcHandlerConstructor('API_KEY', null, ignoreArgument).$returns(rpcHandler);
    rpcHandler.getRecaptchaParam().$once().$returns(recaptchaConfig);
    // Fourth instance.
    rpcHandlerConstructor('API_KEY', null, ignoreArgument).$returns(rpcHandler);
    // Dependency loaded with null language code.
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
    rpcHandler.getRecaptchaParam().$once().$returns(recaptchaConfig);
    // Fifth instance. As existing reCAPTCHA instance available, no dependency
    // reload occurs.
    rpcHandlerConstructor('API_KEY', null, ignoreArgument).$returns(rpcHandler);
    rpcHandler.getRecaptchaParam().$once().$returns(recaptchaConfig);
    // Sixth instance.
    rpcHandlerConstructor('API_KEY', null, ignoreArgument).$returns(rpcHandler);
    // Dependency loaded with language code 'ru'.
    safeLoad(ignoreArgument)
        .$does(function(url) {
          var uri = goog.Uri.parse(goog.html.TrustedResourceUrl.unwrap(url));
          var callback = uri.getParameterValue('onload');
          assertEquals('ru', uri.getParameterValue('hl'));
          currentLanguageCode = 'ru';
          initializeRecaptchaMocks();
          goog.global[callback]();
        })
        .$once();
    rpcHandler.getRecaptchaParam().$once().$returns(recaptchaConfig);
    // Seventh instance. As existing reCAPTCHA instance available, no dependency
    // reload occurs.
    rpcHandlerConstructor('API_KEY', null, ignoreArgument).$returns(rpcHandler);
    rpcHandler.getRecaptchaParam().$once().$returns(recaptchaConfig);
    mockControl.$replayAll();

    // Set Auth language code to 'fr'.
    appLanguageCode = 'fr';
    var expectedParams = {
      'sitekey': 'SITE_KEY',
      'theme': 'light',
      'type': 'image'
    };
    var recaptchaVerifier = new fireauth.BaseRecaptchaVerifier(
        'API_KEY', myElement, null, getLanguageCode);
    var recaptchaVerifier2;
    // First instance rendered with 'fr' language code.
    return recaptchaVerifier.render().then(function(widgetId) {
      assertEquals('fr', currentLanguageCode);
      // Change Auth language code to 'de'.
      appLanguageCode = 'de';
      // Clear existing reCAPTCHA verifier.
      recaptchaVerifier.clear();
      // Render new instance which should use 'de' language code.
      recaptchaVerifier = new fireauth.BaseRecaptchaVerifier(
          'API_KEY', myElement, null, getLanguageCode);
      return recaptchaVerifier.render();
    }).then(function(widgetId) {
      assertEquals('de', currentLanguageCode);
      // Clear existing instance.
      recaptchaVerifier.clear();
      // As same language is used, no dependency reload.
      recaptchaVerifier = new fireauth.BaseRecaptchaVerifier(
          'API_KEY', myElement, null, getLanguageCode);
      return recaptchaVerifier.render();
    }).then(function(widgetId) {
      assertEquals('de', currentLanguageCode);
      // Language reset should force reload of dependency.
      appLanguageCode = null;
      // Clear existing reCAPTCHA instance.
      recaptchaVerifier.clear();
      // Render new instance. It should force a dependency reload with null
      // language code.
      recaptchaVerifier = new fireauth.BaseRecaptchaVerifier(
          'API_KEY', myElement, null, getLanguageCode);
      return recaptchaVerifier.render();
    }).then(function(widgetId) {
      assertNull(currentLanguageCode);
      // Simulate reCAPTCHA is not cleared and language is changed.
      appLanguageCode = 'ru';
      // No dependency reload should occur as it could break existing instance.
      recaptchaVerifier2 = new fireauth.BaseRecaptchaVerifier(
          'API_KEY', myElement2, null, getLanguageCode);
      return recaptchaVerifier2.render();
    }).then(function(widgetId) {
      assertNull(currentLanguageCode);
      // Clear both.
      recaptchaVerifier.clear();
      recaptchaVerifier2.clear();
      // This should reload dependency with last language code.
      recaptchaVerifier = new fireauth.BaseRecaptchaVerifier(
          'API_KEY', myElement, null, getLanguageCode);
      return recaptchaVerifier.render();
    }).then(function(widgetId) {
      // Last loaded language code.
      assertEquals('ru', currentLanguageCode);
      // Clear existing instance.
      recaptchaVerifier.clear();
      // Assume developer rendered external instance.
      grecaptcha.render(myElement, expectedParams);
      // Changing language will not reload dependencies.
      appLanguageCode = 'ar';
      recaptchaVerifier2 = new fireauth.BaseRecaptchaVerifier(
          'API_KEY', myElement2, null, getLanguageCode);
      return recaptchaVerifier2.render();
    }).then(function(widgetId) {
      // Previous loaded language code remains.
      assertEquals('ru', currentLanguageCode);
      recaptchaVerifier2.clear();
    });
  });
}


function testBaseRecaptchaVerifier_localization_alreadyLoaded() {
  return installAndRunTest(
      'testBaseAppVerifier_locale_alreadyLoaded', function() {
    // Simulate grecaptcha loaded.
    initializeRecaptchaMocks();
    // Initialize after simulated reCAPTCHA dependency is loaded to make sure
    // internal counter knows about the existence of grecaptcha.
    loaderInstance = new fireauth.RecaptchaRealLoader();
    var recaptchaConfig = {
      'recaptchaSiteKey': 'SITE_KEY'
    };
    var appLanguageCode = 'de';
    var getLanguageCode = function() {return appLanguageCode;};
    var rpcHandler = mockControl.createStrictMock(fireauth.RpcHandler);
    var rpcHandlerConstructor = mockControl.createConstructorMock(
        fireauth, 'RpcHandler');
    rpcHandlerConstructor('API_KEY', null, ignoreArgument).$returns(rpcHandler);
    // No language code reload.
    rpcHandler.getRecaptchaParam().$once().$returns(recaptchaConfig);
    mockControl.$replayAll();

    // Even though this is the first instance of reCAPTCHA verifier, we can't
    // know for sure that there is no other external instance. We shouldn't
    // reload the reCAPTCHA dependencies.
    var recaptchaVerifier = new fireauth.BaseRecaptchaVerifier(
        'API_KEY', myElement, null, getLanguageCode);
    return recaptchaVerifier.render().then(function(widgetId) {
      recaptchaVerifier.clear();
    });
  });
}


function testRecaptchaVerifier_noApp() {
  return installAndRunTest('testAppVerifier_noApp', function() {
    var expectedError = new fireauth.AuthError(
        fireauth.authenum.Error.ARGUMENT_ERROR,
        'No firebase.app.App instance is currently initialized.');
    var error = assertThrows(function() {
      new fireauth.RecaptchaVerifier(myElement);
    });
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
  });
}


function testRecaptchaVerifier_noApiKey() {
  return installAndRunTest('testAppVerifier_noApiKey', function() {
    var expectedError = new fireauth.AuthError(
        fireauth.authenum.Error.INVALID_API_KEY);
    app = firebase.initializeApp({}, 'test');
    var error = assertThrows(function() {
      new fireauth.RecaptchaVerifier(myElement, undefined, app);
    });
    fireauth.common.testHelper.assertErrorEquals(expectedError, error);
  });
}


function testRecaptchaVerifier_defaultApp() {
  return installAndRunTest('testAppVerifier_defaultApp', function() {
    app = firebase.initializeApp({
      apiKey: 'API_KEY'
    }, 'test');
    stubs.set(firebase, 'app', function() {
      return app;
    });
    var returnValue = assertNotThrows(function() {
      // Do not pass the App instance explicitly.
      return new fireauth.RecaptchaVerifier('recaptcha', {'size': 'compact'});
    });
    assertTrue(returnValue instanceof fireauth.RecaptchaVerifier);
    // Should be a subclass of fireauth.BaseRecaptchaVerifier.
    assertTrue(returnValue instanceof fireauth.BaseRecaptchaVerifier);
  });
}


function testRecaptchaVerifier_render() {
  return installAndRunTest('testAppVerifier_render', function() {
    // Confirm expected endpoint config passed to underlying RPC handler.
    var endpoint = fireauth.constants.Endpoint.STAGING;
    var endpointConfig = {
      'firebaseEndpoint': endpoint.firebaseAuthEndpoint,
      'secureTokenEndpoint': endpoint.secureTokenEndpoint
    };
    stubs.replace(
      fireauth.constants,
      'getEndpointConfig',
      function(opt_id) {
        return endpointConfig;
      });
    // Confirm expected client version with the expected frameworks.
    var expectedClientFullVersion = fireauth.util.getClientVersion(
        fireauth.util.ClientImplementation.JSCORE, firebase.SDK_VERSION,
        [fireauth.util.Framework.FIREBASEUI]);
    var safeLoad = mockControl.createMethodMock(goog.net.jsloader, 'safeLoad');
    var recaptchaConfig = {
      'recaptchaSiteKey': 'SITE_KEY'
    };
    var rpcHandler = mockControl.createStrictMock(fireauth.RpcHandler);
    var rpcHandlerConstructor = mockControl.createConstructorMock(
        fireauth, 'RpcHandler');
    // RpcHandler should be initialized with expected API key, endpoint config
    // and client version.
    rpcHandlerConstructor('API_KEY', endpointConfig, expectedClientFullVersion)
        .$returns(rpcHandler);
    safeLoad(ignoreArgument)
        .$does(function(url) {
          var uri = goog.Uri.parse(goog.html.TrustedResourceUrl.unwrap(url));
          var callback = uri.getParameterValue('onload');
          assertEquals('', uri.getParameterValue('hl'));
          initializeRecaptchaMocks();
          goog.global[callback]();
        })
        .$once();
    rpcHandler.getRecaptchaParam().$once().$returns(recaptchaConfig);
    mockControl.$replayAll();

    app = firebase.initializeApp({
      apiKey: 'API_KEY'
    }, 'test');
    var expectedParams = {
      'sitekey': 'SITE_KEY',
      'theme': 'light',
      'type': 'image'
    };
    // Simulate FirebaseUI logging.
    simulateAuthFramework(app, [fireauth.util.Framework.FIREBASEUI]);
    var recaptchaVerifier = new fireauth.RecaptchaVerifier(
        myElement, undefined, app);
    assertEquals('recaptcha', recaptchaVerifier['type']);
    // Confirm property is readonly.
    recaptchaVerifier['type'] = 'modified';
    assertEquals('recaptcha', recaptchaVerifier['type']);
    return recaptchaVerifier.render().then(function(widgetId) {
      assertRecaptchaParams(widgetId, myElement, expectedParams);
      assertEquals(0, widgetId);
      return recaptchaVerifier.render();
    }).then(function(widgetId) {
      assertEquals(0, widgetId);
      grecaptcha.solveResponse(0);
      return recaptchaVerifier.verify();
    }).then(function(recaptchaToken) {
      assertEquals('response-0', recaptchaToken);
      // Already rendered.
      return recaptchaVerifier.render();
    }).then(function(widgetId) {
      assertEquals(0, widgetId);
      return recaptchaVerifier.verify();
    }).then(function(recaptchaToken) {
      // Same unexpired response returned.
      assertEquals('response-0', recaptchaToken);
      // Expire response.
      grecaptcha.expireResponse(0);
      var resp = recaptchaVerifier.verify();
      // Solve response after expiration. New reCAPTCHA token should be
      // returned.
      grecaptcha.solveResponse(0);
      return resp;
    }).then(function(recaptchaToken) {
      assertEquals('response-1', recaptchaToken);
    });
  });
}


function testRecaptchaVerifier_render_testingMode() {
  return installAndRunTest('testAppVerifier_render_testingMode', function() {
    // Confirm expected endpoint config passed to underlying RPC handler.
    var endpoint = fireauth.constants.Endpoint.STAGING;
    var endpointConfig = {
      'firebaseEndpoint': endpoint.firebaseAuthEndpoint,
      'secureTokenEndpoint': endpoint.secureTokenEndpoint
    };
    var responseCallback = goog.testing.recordFunction();
    var expiredCallback = goog.testing.recordFunction();
    stubs.replace(
      fireauth.constants,
      'getEndpointConfig',
      function(opt_id) {
        return endpointConfig;
      });
    // Record calls to grecaptchaMock.render.
    stubs.replace(
        fireauth.GRecaptchaMockFactory.prototype,
        'render',
        goog.testing.recordFunction(
            fireauth.GRecaptchaMockFactory.prototype.render));
    // Confirm expected client version with the expected frameworks.
    var expectedClientFullVersion = fireauth.util.getClientVersion(
        fireauth.util.ClientImplementation.JSCORE, firebase.SDK_VERSION,
        [fireauth.util.Framework.FIREBASEUI]);
    var safeLoad = mockControl.createMethodMock(goog.net.jsloader, 'safeLoad');
    var recaptchaConfig = {
      'recaptchaSiteKey': 'SITE_KEY'
    };
    var rpcHandler = mockControl.createStrictMock(fireauth.RpcHandler);
    var rpcHandlerConstructor = mockControl.createConstructorMock(
        fireauth, 'RpcHandler');
    // RpcHandler should be initialized with expected API key, endpoint config
    // and client version.
    rpcHandlerConstructor('API_KEY', endpointConfig, expectedClientFullVersion)
        .$returns(rpcHandler);
    safeLoad(ignoreArgument).$never();
    rpcHandler.getRecaptchaParam().$once().$returns(recaptchaConfig);
    mockControl.$replayAll();

    // Install mock clock.
    clock = new goog.testing.MockClock(true);
    app = firebase.initializeApp({
      apiKey: 'API_KEY'
    }, 'test');
    // Simulate FirebaseUI logging.
    simulateAuthFramework(app, [fireauth.util.Framework.FIREBASEUI]);
    // Disable app verification.
    app.auth().settings.appVerificationDisabledForTesting = true;
    var params = {
      'size': 'compact',
      'theme': 'light',
      'type': 'image',
      'callback': responseCallback,
      'expired-callback': expiredCallback
    };
    var recaptchaVerifier = new fireauth.RecaptchaVerifier(
        myElement, params, app);
    assertEquals('recaptcha', recaptchaVerifier['type']);
    // Confirm property is readonly.
    recaptchaVerifier['type'] = 'modified';
    assertEquals('recaptcha', recaptchaVerifier['type']);
    return recaptchaVerifier.render().then(function(widgetId) {
      // Mock reCAPTCHA should be rendered.
      assertEquals(
          1, fireauth.GRecaptchaMockFactory.prototype.render.getCallCount());
      // For visible reCAPTCHA, confirm expectedContainer element matches the
      // parent of the actual container.
      assertEquals(
          myElement,
          goog.dom.getParentElement(
              fireauth.GRecaptchaMockFactory.prototype.render.getLastCall()
                  .getArgument(0)));
      var actualParams = fireauth.GRecaptchaMockFactory.prototype.render
          .getLastCall().getArgument(1);
      // Confirm expected parameters passed to reCAPTCHA.
      assertEquals('SITE_KEY', actualParams['sitekey']);
      assertEquals('light', actualParams['theme']);
      assertEquals('image', actualParams['type']);
      assertEquals('compact', actualParams['size']);
      assertEquals(startInstanceId, widgetId);
      return recaptchaVerifier.render();
    }).then(function(widgetId) {
      assertEquals(startInstanceId, widgetId);
      var verifyPromise = recaptchaVerifier.verify();
      assertEquals(0, responseCallback.getCallCount());
      clock.tick(solveTimeMs);
      assertEquals(1, responseCallback.getCallCount());
      assertEquals('random0', responseCallback.getLastCall().getArgument(0));
      return verifyPromise;
    }).then(function(recaptchaToken) {
      assertEquals('random0', recaptchaToken);
      // Already rendered.
      return recaptchaVerifier.render();
    }).then(function(widgetId) {
      assertEquals(startInstanceId, widgetId);
      return recaptchaVerifier.verify();
    }).then(function(recaptchaToken) {
      // Same unexpired response returned.
      assertEquals('random0', recaptchaToken);
      assertEquals(0, expiredCallback.getCallCount());
      // Expire response.
      clock.tick(expirationTimeMs);
      assertEquals(1, expiredCallback.getCallCount());
      var resp = recaptchaVerifier.verify();
      // Solve response after expiration. New reCAPTCHA token should be
      // returned.
      clock.tick(solveTimeMs);
      return resp;
    }).then(function(recaptchaToken) {
      assertEquals(2, responseCallback.getCallCount());
      assertEquals('random1', responseCallback.getLastCall().getArgument(0));
      assertEquals('random1', recaptchaToken);
    });
  });
}


function testRecaptchaVerifier_localization() {
  return installAndRunTest('testAppVerifier_localization', function() {
    var currentLanguageCode = null;
    var safeLoad = mockControl.createMethodMock(goog.net.jsloader, 'safeLoad');
    var recaptchaConfig = {
      'recaptchaSiteKey': 'SITE_KEY'
    };
    var rpcHandler = mockControl.createStrictMock(fireauth.RpcHandler);
    var rpcHandlerConstructor = mockControl.createConstructorMock(
        fireauth, 'RpcHandler');
    // First instance.
    rpcHandlerConstructor('API_KEY', null, ignoreArgument).$returns(rpcHandler);
    // Dependency loaded with language code 'fr'.
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
    rpcHandler.getRecaptchaParam().$once().$returns(recaptchaConfig);
    // Second instance.
    rpcHandlerConstructor('API_KEY', null, ignoreArgument).$returns(rpcHandler);
    // Dependency loaded with language code 'de'.
    safeLoad(ignoreArgument)
        .$does(function(url) {
          var uri = goog.Uri.parse(goog.html.TrustedResourceUrl.unwrap(url));
          var callback = uri.getParameterValue('onload');
          assertEquals('de', uri.getParameterValue('hl'));
          currentLanguageCode = 'de';
          initializeRecaptchaMocks();
          goog.global[callback]();
        })
        .$once();
    rpcHandler.getRecaptchaParam().$once().$returns(recaptchaConfig);
    // Third instance. As same language is used, no dependency reload.
    rpcHandlerConstructor('API_KEY', null, ignoreArgument).$returns(rpcHandler);
    rpcHandler.getRecaptchaParam().$once().$returns(recaptchaConfig);
    // Fourth instance.
    rpcHandlerConstructor('API_KEY', null, ignoreArgument).$returns(rpcHandler);
    // Dependency loaded with null language code.
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
    rpcHandler.getRecaptchaParam().$once().$returns(recaptchaConfig);
    // Fifth instance. As existing reCAPTCHA instance available, no dependency
    // reload occurs.
    rpcHandlerConstructor('API_KEY', null, ignoreArgument).$returns(rpcHandler);
    rpcHandler.getRecaptchaParam().$once().$returns(recaptchaConfig);
    // Sixth instance.
    rpcHandlerConstructor('API_KEY', null, ignoreArgument).$returns(rpcHandler);
    // Dependency loaded with language code 'ru'.
    safeLoad(ignoreArgument)
        .$does(function(url) {
          var uri = goog.Uri.parse(goog.html.TrustedResourceUrl.unwrap(url));
          var callback = uri.getParameterValue('onload');
          assertEquals('ru', uri.getParameterValue('hl'));
          currentLanguageCode = 'ru';
          initializeRecaptchaMocks();
          goog.global[callback]();
        })
        .$once();
    rpcHandler.getRecaptchaParam().$once().$returns(recaptchaConfig);
    // Seventh instance. As existing reCAPTCHA instance available, no dependency
    // reload occurs.
    rpcHandlerConstructor('API_KEY', null, ignoreArgument).$returns(rpcHandler);
    rpcHandler.getRecaptchaParam().$once().$returns(recaptchaConfig);
    mockControl.$replayAll();

    app = firebase.initializeApp({
      apiKey: 'API_KEY'
    }, 'test');
    // Set Auth language code to 'fr'.
    simulateAuthLanguage(app, 'fr');
    var expectedParams = {
      'sitekey': 'SITE_KEY',
      'theme': 'light',
      'type': 'image'
    };
    var recaptchaVerifier = new fireauth.RecaptchaVerifier(
        myElement, undefined, app);
    var recaptchaVerifier2;
    // First instance rendered with 'fr' language code.
    return recaptchaVerifier.render().then(function(widgetId) {
      assertEquals('fr', currentLanguageCode);
      // Change Auth language code to 'de'.
      simulateAuthLanguage(app, 'de');
      // Clear existing reCAPTCHA verifier.
      recaptchaVerifier.clear();
      // Render new instance which should use 'de' language code.
      recaptchaVerifier = new fireauth.RecaptchaVerifier(
          myElement, undefined, app);
      return recaptchaVerifier.render();
    }).then(function(widgetId) {
      assertEquals('de', currentLanguageCode);
      // Clear existing instance.
      recaptchaVerifier.clear();
      // As same language is used, no dependency reload.
      recaptchaVerifier = new fireauth.RecaptchaVerifier(
          myElement, undefined, app);
      return recaptchaVerifier.render();
    }).then(function(widgetId) {
      assertEquals('de', currentLanguageCode);
      // Language reset should force reload of dependency.
      simulateAuthLanguage(app, null);
      // Clear existing reCAPTCHA instance.
      recaptchaVerifier.clear();
      // Render new instance. It should force a dependency reload with null
      // language code.
      recaptchaVerifier = new fireauth.RecaptchaVerifier(
          myElement, undefined, app);
      return recaptchaVerifier.render();
    }).then(function(widgetId) {
      assertNull(currentLanguageCode);
      // Simulate reCAPTCHA is not cleared and language is changed.
      simulateAuthLanguage(app, 'ru');
      // No dependency reload should occur as it could break existing instance.
      recaptchaVerifier2 = new fireauth.RecaptchaVerifier(
          myElement2, undefined, app);
      return recaptchaVerifier2.render();
    }).then(function(widgetId) {
      assertNull(currentLanguageCode);
      // Clear both.
      recaptchaVerifier.clear();
      recaptchaVerifier2.clear();
      // This should reload dependency with last language code.
      recaptchaVerifier = new fireauth.RecaptchaVerifier(
          myElement, undefined, app);
      return recaptchaVerifier.render();
    }).then(function(widgetId) {
      // Last loaded language code.
      assertEquals('ru', currentLanguageCode);
      // Clear existing instance.
      recaptchaVerifier.clear();
      // Assume developer rendered external instance.
      grecaptcha.render(myElement, expectedParams);
      // Changing language will not reload dependencies.
      simulateAuthLanguage(app, 'ar');
      recaptchaVerifier2 = new fireauth.RecaptchaVerifier(
          myElement2, undefined, app);
      return recaptchaVerifier2.render();
    }).then(function(widgetId) {
      // Previous loaded language code remains.
      assertEquals('ru', currentLanguageCode);
      recaptchaVerifier2.clear();
    });
  });
}
