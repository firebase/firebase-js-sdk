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

/**
 * @fileoverview Tests for token.js
 */

goog.provide('fireauth.StsTokenManagerTest');

goog.require('fireauth.AuthError');
goog.require('fireauth.RpcHandler');
goog.require('fireauth.StsTokenManager');
goog.require('fireauth.authenum.Error');
goog.require('fireauth.common.testHelper');
goog.require('goog.Promise');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.jsunit');

goog.setTestOnly('fireauth.StsTokenManagerTest');


var token = null;
var rpcHandler = null;
var stubs = new goog.testing.PropertyReplacer();
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall();
var now;


function setUp() {
  now = goog.now();
  // Override goog.now().
  stubs.replace(
      goog,
      'now',
      function() {
        return now;
      });
  // Initialize RPC handler and token.
  rpcHandler = new fireauth.RpcHandler(
      'apiKey',
      {
        'tokenEndpoint': 'https://securetoken.googleapis.com/v1/token',
        'tokenTimeout': 10000,
        'tokenHeaders': {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
  token = new fireauth.StsTokenManager(rpcHandler);
}


function tearDown() {
  // Reset property replacer, token and RPC handler.
  token = null;
  rpcHandler = null;
  stubs.reset();
}


/**
 * Helper function to check RPC requestStsToken parameters and simulate a
 * returned response.
 * @param {?Object|string} expectedData The expected body data.
 * @param {?Object} xhrResponse The returned response when no error is returned.
 * @param {?fireauth.AuthError=} opt_error The specific error returned.
 */
function assertRpcHandler(
    expectedData,
    xhrResponse,
    opt_error) {
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'requestStsToken',
      function(data) {
        return new goog.Promise(function(resolve, reject) {
          // Confirm expected data sent.
          assertObjectEquals(expectedData, data);
          if (xhrResponse) {
            // Return expected response.
            resolve(xhrResponse);
          } else if (opt_error) {
            reject(opt_error);
          } else {
            reject(
                new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR));
          }
        });
      });
}


/**
 * Asserts that two errors are equivalent. Plain assertObjectEquals cannot be
 * used as Internet Explorer adds the stack trace as a property of the object.
 * @param {!Error} expected
 * @param {!Error} actual
 */
function assertErrorEquals(expected, actual) {
  assertEquals(expected.code, actual.code);
  assertEquals(expected.message, actual.message);
}


function testStsTokenManager_gettersSetters() {
  var expirationTime = goog.now() + 3600 * 1000;
  var jwt = fireauth.common.testHelper.createMockJwt(null, expirationTime);
  token.setRefreshToken('refreshToken');
  token.setAccessToken(jwt);
  assertEquals('refreshToken', token.getRefreshToken());
  assertEquals(expirationTime, token.getExpirationTime());
}


function testStsTokenManager_parseServerResponse() {
  var expirationTime = now + 3600 * 1000;
  var jwt = fireauth.common.testHelper.createMockJwt(null, expirationTime);
  var serverResponse = {
    'idToken': jwt,
    'refreshToken': 'myStsRefreshToken',
  };
  var accessToken = token.parseServerResponse(serverResponse);
  assertEquals(jwt, accessToken);
  assertEquals('myStsRefreshToken', token.getRefreshToken());
  assertEquals(expirationTime, token.getExpirationTime());
}


function testStsTokenManager_toServerResponse() {
  var expirationTime = goog.now() + 3600 * 1000;
  var jwt = fireauth.common.testHelper.createMockJwt(null, expirationTime);
  token.setRefreshToken('refreshToken');
  token.setAccessToken(jwt);
  assertObjectEquals(
      {
        'refreshToken': 'refreshToken',
        'idToken': jwt
      },
      token.toServerResponse());
}


function testStsTokenManager_copy() {
  var expirationTime = goog.now() + 3600 * 1000;
  var jwt = fireauth.common.testHelper.createMockJwt(null, expirationTime);
  token.setRefreshToken('refreshToken');
  token.setAccessToken(jwt);
  // Injects a new RPC handler with different API key.
  var rpcHandlerWithDiffApiKey = new fireauth.RpcHandler(
      'apiKey2',
      {
        'tokenEndpoint': 'https://securetoken.googleapis.com/v1/token',
        'tokenTimeout': 10000,
        'tokenHeaders': {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
  var tokenToCopy = new fireauth.StsTokenManager(rpcHandlerWithDiffApiKey);
  var newExpirationTime = goog.now() + 4800 * 1000;
  var newJwt = fireauth.common.testHelper.createMockJwt(
      null, newExpirationTime);
  var serverResponse = {
    'idToken': newJwt,
    'refreshToken': 'newRefreshToken'
  };

  tokenToCopy.parseServerResponse(serverResponse);
  token.copy(tokenToCopy);
  assertObjectEquals(
      {
        // ApiKey should remain the same.
        'apiKey': 'apiKey',
        'refreshToken': 'newRefreshToken',
        'accessToken': newJwt,
        'expirationTime': newExpirationTime
      },
      token.toPlainObject());
  assertEquals(token.getExpirationTime(), newExpirationTime);
}


function testStsTokenManager_getToken_noToken() {
  // No token.
  asyncTestCase.waitForSignals(1);
  token.getToken().then(function(token) {
    assertNull(token);
    asyncTestCase.signal();
  });
}


function testStsTokenManager_getToken_invalidResponse() {
  // Test when an network error is returned and then called again successfully
  // that the network error is not cached.
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.NETWORK_REQUEST_FAILED);
  var jwt = fireauth.common.testHelper.createMockJwt();
  token.setRefreshToken('myRefreshToken');
  // Simulate invalid response from server.
  assertRpcHandler(
      {
        'grant_type': 'refresh_token',
        'refresh_token': 'myRefreshToken'
      },
      null,
      expectedError);
  asyncTestCase.waitForSignals(1);
  token.getToken().then(fail, function(error) {
    // Invalid response error should be triggered.
    assertErrorEquals(expectedError, error);
    // Since this is not an expired token error, another call should still
    // ping the backend.
    assertRpcHandler(
      {
        'grant_type': 'refresh_token',
        'refresh_token': 'myRefreshToken'
      },
      {
        'access_token': jwt,
        'refresh_token': 'refreshToken2'
      });
      token.getToken().then(function(response) {
        // Confirm all properties updated.
        assertEquals(jwt, response['accessToken']);
        assertEquals('refreshToken2', response['refreshToken']);
        asyncTestCase.signal();
      });
  });
}


function testStsTokenManager_getToken_tokenExpiredError() {
  // Test when expired refresh token error is returned.
  // Simulate Id token is expired to force refresh.
  var expirationTime = goog.now() - 1;
  // Expected token expired error.
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.TOKEN_EXPIRED);
  var expiredJwt = fireauth.common.testHelper.createMockJwt(
      null, expirationTime);
  var newJwt = fireauth.common.testHelper.createMockJwt();
  token.setAccessToken(expiredJwt);
  token.setRefreshToken('myRefreshToken');
  assertFalse(token.isRefreshTokenExpired());
  // Simulate token expired error from server.
  assertRpcHandler(
      {
        'grant_type': 'refresh_token',
        'refresh_token': 'myRefreshToken'
      },
      null,
      expectedError);
  asyncTestCase.waitForSignals(4);
  // This call will return token expired error.
  token.getToken().then(fail, function(error) {
    assertTrue(token.isRefreshTokenExpired());
    // If another RPC is sent, it will resolve with valid STS token.
    // This should not happen since the token expired error is cached.
    assertRpcHandler(
      {
        'grant_type': 'refresh_token',
        'refresh_token': 'refreshToken2'
      },
      {
        'access_token': newJwt,
        'refresh_token': 'refreshToken2',
        'expires_in': '3600'
      });
    // Token expired error should be thrown.
    assertErrorEquals(expectedError, error);
    // Try again, cached expired token error should be triggered.
    token.getToken(false).thenCatch(function(error) {
      assertErrorEquals(expectedError, error);
      asyncTestCase.signal();
    });
    // Try again with forced refresh, cached expired token error should be
    // triggered.
    token.getToken(true).thenCatch(function(error) {
      assertErrorEquals(expectedError, error);
      asyncTestCase.signal();
    });
    // Plain object should have refresh token reset.
    assertObjectEquals(
        {
          'apiKey': 'apiKey',
          'refreshToken': null,
          'accessToken': expiredJwt,
          'expirationTime': expirationTime
        },
        token.toPlainObject());
    // If the refresh token is manually updated, the cached error should be
    // cleared.
    token.setRefreshToken('refreshToken2');
    // This should now resolve.
    token.getToken().then(function(response) {
      assertFalse(token.isRefreshTokenExpired());
      // Confirm all properties updated.
      assertEquals(newJwt, response['accessToken']);
      assertEquals('refreshToken2', response['refreshToken']);
      // Plain object should have the new refresh token set.
      assertObjectEquals(
          {
            'apiKey': 'apiKey',
            'refreshToken': 'refreshToken2',
            'accessToken': newJwt,
            'expirationTime': goog.now() + 3600 * 1000
          },
          token.toPlainObject());
      asyncTestCase.signal();
    });
    asyncTestCase.signal();
  });
}


function testStsTokenManager_getToken_tokenAlmostExpired() {
  // Test when cached token is within range of being almost expired.
  var expirationTime = goog.now() +
      fireauth.StsTokenManager.TOKEN_REFRESH_BUFFER - 1;
  var almostExpiredJwt = fireauth.common.testHelper.createMockJwt(
      null, expirationTime);
  var newJwt = fireauth.common.testHelper.createMockJwt();
  token.setAccessToken(almostExpiredJwt);
  token.setRefreshToken('myRefreshToken');
  assertFalse(token.isRefreshTokenExpired());
  // Token will be refreshed since cached token is almost expired.
  assertRpcHandler(
      {
        'grant_type': 'refresh_token',
        'refresh_token': 'myRefreshToken'
      },
      {
        'access_token': newJwt,
        'refresh_token': 'refreshToken2'
      });
  asyncTestCase.waitForSignals(1);
  token.getToken().then(function(response) {
    assertFalse(token.isRefreshTokenExpired());
    // Confirm all properties updated.
    assertEquals(newJwt, response['accessToken']);
    assertEquals('refreshToken2', response['refreshToken']);
    assertObjectEquals(
        {
          'apiKey': 'apiKey',
          'refreshToken': 'refreshToken2',
          'accessToken': newJwt,
          'expirationTime': goog.now() + 3600 * 1000
        },
        token.toPlainObject());
    asyncTestCase.signal();
  });
}


function testStsTokenManager_getToken_exchangeRefreshToken() {
  // Set a previously cached access token that is expired.
  var expirationTime = goog.now() - 1;
  var unexpiredTime = goog.now() + 3600 * 1000;
  var expiredJwt =
      fireauth.common.testHelper.createMockJwt(null, expirationTime);
  var newJwt = fireauth.common.testHelper.createMockJwt(null, unexpiredTime);
  token.setRefreshToken('refreshToken');
  // Expired access token.
  token.setAccessToken(expiredJwt);
  // It will attempt to exchange refresh token for STS token.
  assertRpcHandler(
      {
        'grant_type': 'refresh_token',
        'refresh_token': 'refreshToken'
      },
      {
        'access_token': newJwt,
        'refresh_token': 'refreshToken2'
      });
  asyncTestCase.waitForSignals(1);
  token.getToken().then(function(response) {
    // Confirm all properties updated.
    assertEquals('refreshToken2', token.getRefreshToken());
    assertEquals(unexpiredTime, token.getExpirationTime());
    // Confirm correct STS response.
    assertObjectEquals(
        {
          'accessToken': newJwt,
          'refreshToken': 'refreshToken2'
        },
        response);
    asyncTestCase.signal();
  });
}


function testStsTokenManager_getToken_cached() {
  // Set a previously cached access token that hasn't expired yet.
  var expirationTime = goog.now() + 60 * 1000;
  var jwt = fireauth.common.testHelper.createMockJwt(null, expirationTime);
  // Set refresh token and unexpired access token.
  // No XHR request needed.
  token.setRefreshToken('refreshToken');
  token.setAccessToken(jwt);
  asyncTestCase.waitForSignals(1);
  token.getToken().then(function(response) {
    assertEquals('refreshToken', token.getRefreshToken());
    assertEquals(
        expirationTime, token.getExpirationTime());
    // Confirm correct STS response.
    assertObjectEquals(
        {
          'accessToken': jwt,
          'refreshToken': 'refreshToken'
        },
        response);
    asyncTestCase.signal();
  });
}


function testStsTokenManager_getToken_forceRefresh() {
  // Set a previously cached access token that hasn't expired yet.
  var expirationTime = goog.now() + 3000 * 1000;
  var expirationTime2 = goog.now() + 3600 * 1000;
  var jwt = fireauth.common.testHelper.createMockJwt(null, expirationTime);
  var newJwt = fireauth.common.testHelper.createMockJwt(null, expirationTime2);
  // Set ID token, refresh token and unexpired access token.
  token.setRefreshToken('refreshToken');
  token.setAccessToken(jwt);
  // Even though unexpired access token, it will attempt to exchange for refresh
  // token since force refresh is set to true.
  assertRpcHandler(
      {
        'grant_type': 'refresh_token',
        'refresh_token': 'refreshToken'
      },
      {
        'access_token': newJwt,
        'refresh_token': 'refreshToken2'
      });
  asyncTestCase.waitForSignals(1);
  token.getToken(true).then(function(response) {
    // Confirm all properties updated.
    assertEquals('refreshToken2', token.getRefreshToken());
    assertEquals(expirationTime2, token.getExpirationTime());
    // Confirm correct STS response.
    assertObjectEquals(
        {
          'accessToken': newJwt,
          'refreshToken': 'refreshToken2'
        },
        response);
    asyncTestCase.signal();
  });
}


function testToPlainObject() {
  var expirationTime = goog.now() + 3600 * 1000;
  var jwt = fireauth.common.testHelper.createMockJwt(null, expirationTime);
  token.setRefreshToken('refreshToken');
  token.setAccessToken(jwt);
  assertObjectEquals(
      {
        'apiKey': 'apiKey',
        'refreshToken': 'refreshToken',
        'accessToken': jwt,
        'expirationTime': expirationTime
      },
      token.toPlainObject());
}


function testFromPlainObject() {
  var expirationTime = goog.now() + 3600 * 1000;
  var jwt = fireauth.common.testHelper.createMockJwt(null, expirationTime);
  assertNull(
      fireauth.StsTokenManager.fromPlainObject(
          new fireauth.RpcHandler('apiKey'),
          {}));

  token.setRefreshToken('refreshToken');
  token.setAccessToken(jwt);
  assertObjectEquals(
      token,
      fireauth.StsTokenManager.fromPlainObject(
          rpcHandler,
          {
            'apiKey': 'apiKey',
            'refreshToken': 'refreshToken',
            'accessToken': jwt
          }));
}
