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
 * @fileoverview Tests for authcredential.js
 */

goog.provide('fireauth.AuthCredentialTest');

goog.require('fireauth.Auth');
goog.require('fireauth.AuthCredential');
goog.require('fireauth.AuthError');
goog.require('fireauth.AuthProvider');
goog.require('fireauth.EmailAuthProvider');
goog.require('fireauth.FacebookAuthProvider');
goog.require('fireauth.GithubAuthProvider');
goog.require('fireauth.GoogleAuthProvider');
goog.require('fireauth.IdToken');
goog.require('fireauth.OAuthCredential');
goog.require('fireauth.OAuthProvider');
goog.require('fireauth.PhoneAuthCredential');
goog.require('fireauth.PhoneAuthProvider');
goog.require('fireauth.RpcHandler');
goog.require('fireauth.TwitterAuthProvider');
goog.require('fireauth.authenum.Error');
goog.require('fireauth.common.testHelper');
goog.require('fireauth.deprecation');
goog.require('fireauth.idp.ProviderId');
goog.require('fireauth.idp.SignInMethod');
goog.require('fireauth.util');
goog.require('goog.Promise');
goog.require('goog.testing.MockControl');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.recordFunction');

goog.setTestOnly('fireauth.AuthCredentialTest');


var mockControl;
var stubs = new goog.testing.PropertyReplacer();
var rpcHandler = new fireauth.RpcHandler('apiKey');
var responseForIdToken;

var app = firebase.initializeApp({
  apiKey: 'myApiKey'
});
var auth = new fireauth.Auth(app);


function setUp() {
  responseForIdToken = {
    'idToken': 'ID_TOKEN'
  };
  stubs.replace(
      fireauth.util,
      'getCurrentUrl',
      function() {
        // Simulates a non http://localhost current URL.
        return 'http://www.example.com';
      });
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'verifyAssertion',
      goog.testing.recordFunction(function(request) {
        return goog.Promise.resolve(responseForIdToken);
      }));
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'verifyPassword',
      goog.testing.recordFunction(function(request) {
        return goog.Promise.resolve(responseForIdToken);
      }));
  stubs.replace(
      fireauth.RpcHandler.prototype, 'emailLinkSignIn',
      goog.testing.recordFunction(function(request) {
        return goog.Promise.resolve(responseForIdToken);
      }));
  stubs.replace(
      fireauth.RpcHandler.prototype, 'emailLinkSignInForLinking',
      goog.testing.recordFunction(function(request) {
        return goog.Promise.resolve(responseForIdToken);
      }));
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'verifyAssertionForLinking',
      goog.testing.recordFunction(function(request) {
        return goog.Promise.resolve(responseForIdToken);
      }));
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'verifyAssertionForExisting',
      goog.testing.recordFunction(function(request) {
        return goog.Promise.resolve(responseForIdToken);
      }));
  stubs.replace(
      fireauth.RpcHandler.prototype,
      'updateEmailAndPassword',
      goog.testing.recordFunction(goog.Promise.resolve));

  // Internally we should not be using any deprecated methods.
  stubs.replace(fireauth.deprecation, 'log', function(message) {
    fail('Deprecation message unexpectedly displayed: ' + message);
  });
  mockControl = new goog.testing.MockControl();
}


function tearDown() {
  mockControl.$verifyAll();
  mockControl.$tearDown();
  stubs.reset();
}


/**
 * Initialize the IdToken mocks for parsing an expected ID token and returning
 * the expected UID string.
 * @param {?string|undefined} expectedIdToken The expected ID token string.
 * @param {string} expectedUid The expected UID to be returned if the token is
 *     valid.
 */
function initializeIdTokenMocks(expectedIdToken, expectedUid) {
  // Mock idToken parsing.
  var tokenInstance = mockControl.createStrictMock(fireauth.IdToken);
  var idTokenParse = mockControl.createMethodMock(fireauth.IdToken, 'parse');
  if (!!expectedIdToken) {
    // Valid expected ID token string.
    idTokenParse(expectedIdToken).$returns(tokenInstance).$once();
    // Return expected token UID when getLocalId() called.
    tokenInstance.getLocalId().$returns(expectedUid);
  } else {
    // No ID token string provided.
    idTokenParse(expectedIdToken).$returns(null).$once();
  }
  mockControl.$replayAll();
}


/**
 * Assert that the correct request is sent to RPC handler
 * verifyAssertionFor.
 * @param {?Object} request The verifyAssertion request.
 */
function assertRpcHandlerVerifyAssertion(request) {
  assertEquals(
      1,
      fireauth.RpcHandler.prototype.verifyAssertion.getCallCount());
  assertObjectEquals(
      request,
      fireauth.RpcHandler.prototype.verifyAssertion
      .getLastCall()
      .getArgument(0));
}


/**
 * Asserts that the correct request is sent to RPC handler verifyPassword.
 * @param {string} email The email in verifyPassword request.
 * @param {string} password The password in verifyPassword request.
 */
function assertRpcHandlerVerifyPassword(email, password) {
  assertEquals(
      1,
      fireauth.RpcHandler.prototype.verifyPassword.getCallCount());
  assertObjectEquals(
      email,
      fireauth.RpcHandler.prototype.verifyPassword
      .getLastCall()
      .getArgument(0));
  assertObjectEquals(
      password,
      fireauth.RpcHandler.prototype.verifyPassword
      .getLastCall()
      .getArgument(1));
}


/**
 * Asserts that the correct request is sent to RPC handler emailLinkSignIn.
 * @param {string} email The email in emailLinkSignIn request.
 * @param {string} oobCode The oobCode in emailLinkSignIn request.
 */
function assertRpcHandlerEmailLinkSignIn(email, oobCode) {
  assertEquals(1, fireauth.RpcHandler.prototype.emailLinkSignIn.getCallCount());
  assertObjectEquals(
      email,
      fireauth.RpcHandler.prototype.emailLinkSignIn.getLastCall().getArgument(
          0));
  assertObjectEquals(
      oobCode,
      fireauth.RpcHandler.prototype.emailLinkSignIn.getLastCall().getArgument(
          1));
}


/**
 * Asserts that the correct request is sent to RPC handler
 * emailLinkSignInForLinking.
 * @param {string} idToken The idToken in emailLinkSignInForLinking request.
 * @param {string} email The email in emailLinkSignInForLinking request.
 * @param {string} oobCode The oobCode in emailLinkSignInForLinking request.
 */
function assertRpcHandlerEmailLinkSignInForLinking(idToken, email, oobCode) {
  assertEquals(1, fireauth.RpcHandler.prototype.emailLinkSignInForLinking
      .getCallCount());
  assertObjectEquals(
      idToken, fireauth.RpcHandler.prototype.emailLinkSignInForLinking
      .getLastCall().getArgument(0));
  assertObjectEquals(
      email, fireauth.RpcHandler.prototype.emailLinkSignInForLinking
      .getLastCall().getArgument(1));
  assertObjectEquals(
      oobCode, fireauth.RpcHandler.prototype.emailLinkSignInForLinking
      .getLastCall().getArgument(2));
}


/**
 * Assert that the correct request is sent to RPC handler
 * verifyAssertionForLinking.
 * @param {?Object} request The verifyAssertionForLinking request.
 */
function assertRpcHandlerVerifyAssertionForLinking(request) {
  assertEquals(
      1,
      fireauth.RpcHandler.prototype.verifyAssertionForLinking.getCallCount());
  assertObjectEquals(
      request,
      fireauth.RpcHandler.prototype.verifyAssertionForLinking
      .getLastCall()
      .getArgument(0));
}


/**
 * Assert that the correct request is sent to RPC handler
 * verifyAssertionForExisting.
 * @param {?Object} request The verifyAssertionForLinking request.
 */
function assertRpcHandlerVerifyAssertionForExisting(request) {
  assertEquals(
      1,
      fireauth.RpcHandler.prototype.verifyAssertionForExisting.getCallCount());
  assertObjectEquals(
      request,
      fireauth.RpcHandler.prototype.verifyAssertionForExisting
      .getLastCall()
      .getArgument(0));
}


/**
 * Assert that the correct request is sent to RPC handler
 * updateEmailAndPassword.
 * @param {!string} idToken The ID token in updateEmailAndPassword request.
 * @param {!string} email The email in updateEmailAndPassword request.
 * @param {!string} password The password in updateEmailAndPassword request.
 */
function assertRpcHandlerUpdateEmailAndPassword(idToken, email, password) {
  assertEquals(
      1,
      fireauth.RpcHandler.prototype.updateEmailAndPassword.getCallCount());
  assertObjectEquals(
      idToken,
      fireauth.RpcHandler.prototype.updateEmailAndPassword
      .getLastCall()
      .getArgument(0));
  assertObjectEquals(
      email,
      fireauth.RpcHandler.prototype.updateEmailAndPassword
      .getLastCall()
      .getArgument(1));
  assertObjectEquals(
      password,
      fireauth.RpcHandler.prototype.updateEmailAndPassword
      .getLastCall()
      .getArgument(2));
}


/**
 * Test invalid Auth credential.
 */
function testInvalidCredential() {
  var errorOAuth1 = new fireauth.AuthError(
      fireauth.authenum.Error.ARGUMENT_ERROR,
      'credential failed: expected 2 arguments ' +
      '(the OAuth access token and secret).');
  var errorOAuth2 = new fireauth.AuthError(
      fireauth.authenum.Error.ARGUMENT_ERROR,
      'credential failed: expected 1 argument ' +
      '(the OAuth access token).');
  var errorOidc = new fireauth.AuthError(
      fireauth.authenum.Error.ARGUMENT_ERROR,
      'credential failed: must provide the ID token and/or the access ' +
      'token.');

  try {
    fireauth.FacebookAuthProvider.credential('');
    fail('Should have triggered an invalid Auth credential error!');
  } catch (e) {
    fireauth.common.testHelper.assertErrorEquals(errorOAuth2, e);
  }
  try {
    fireauth.GithubAuthProvider.credential('');
    fail('Should have triggered an invalid Auth credential error!');
  } catch (e) {
    fireauth.common.testHelper.assertErrorEquals(errorOAuth2, e);
  }
  try {
    fireauth.GoogleAuthProvider.credential('', '');
    fail('Should have triggered an invalid Auth credential error!');
  } catch (e) {
    fireauth.common.testHelper.assertErrorEquals(errorOidc, e);
  }
  try {
    fireauth.TwitterAuthProvider.credential('twitterAccessToken', '');
    fail('Should have triggered an invalid Auth credential error!');
  } catch (e) {
    fireauth.common.testHelper.assertErrorEquals(errorOAuth1, e);
  }
  try {
    new fireauth.OAuthProvider('example.com').credential('', '');
    fail('Should have triggered an invalid Auth credential error!');
  } catch (e) {
    fireauth.common.testHelper.assertErrorEquals(errorOidc, e);
  }
  // Test invalid credentials from response.
  // Empty response.
  assertNull(fireauth.AuthProvider.getCredentialFromResponse({}));
  // Missing OAuth response.
  assertNull(
      fireauth.AuthProvider.getCredentialFromResponse({
        'providerId': 'facebook.com'
      }));
}


function testOAuthCredential() {
  var provider = new fireauth.OAuthProvider('example.com');
  var authCredential = provider.credential(
      'exampleIdToken', 'exampleAccessToken');
  assertEquals('exampleIdToken', authCredential['idToken']);
  assertEquals('exampleAccessToken', authCredential['accessToken']);
  assertEquals('example.com', authCredential['providerId']);
  assertEquals('example.com', authCredential['signInMethod']);
  authCredential.getIdTokenProvider(rpcHandler);
  assertObjectEquals(
      {
        'oauthAccessToken': 'exampleAccessToken',
        'oauthIdToken': 'exampleIdToken',
        'providerId': 'example.com',
        'signInMethod': 'example.com'
      },
      authCredential.toPlainObject());
  assertRpcHandlerVerifyAssertion({
    // requestUri should be http://localhost regardless of current URL.
    'requestUri': 'http://localhost',
    'postBody': 'id_token=exampleIdToken&access_token=exampleAccessToken' +
        '&providerId=example.com'
  });
}


function testInvalidOAuthCredential() {
  // Test the case where invalid arguments were passed to the OAuthCredential
  // constructor. The constructor is only called internally, so the errors are
  // internal errors.
  try {
    new fireauth.OAuthCredential('twitter.com', {
      'oauthToken': 'token'
      // OAuth1 secret missing.
    });
    fail('Should have triggered an invalid Auth credential error!');
  } catch (e) {
    assertEquals('auth/internal-error', e.code);
  }
}


function testOAuthProvider_constructor() {
  var provider = new fireauth.OAuthProvider('example.com');
  assertTrue(provider['isOAuthProvider']);
  assertEquals('example.com', provider['providerId']);
  // Should not throw an error.
  assertNotThrows(function() {
    fireauth.AuthProvider.checkIfOAuthSupported(provider);
  });
}


function testOAuthProvider_scopes() {
  var provider = new fireauth.OAuthProvider('example.com');
  provider.addScope('scope1');
  assertArrayEquals(['scope1'], provider.getScopes());
  provider.addScope('scope2').addScope('scope3');
  assertArrayEquals(['scope1', 'scope2', 'scope3'], provider.getScopes());
}


function testOAuthProvider_customParameters() {
  var provider = new fireauth.OAuthProvider('example.com');
  // Set OAuth custom parameters.
  provider.setCustomParameters({
    // Valid OAuth2/OIDC parameters.
    'login_hint': 'user@example.com',
    'prompt': 'consent',
    'include_granted_scopes': true,
    // Reserved parameters below should be filtered out.
    'client_id': 'CLIENT_ID',
    'response_type': 'token',
    'scope': 'scope1',
    'redirect_uri': 'https://www.evil.com',
    'state': 'STATE'
  });
  // Get custom parameters should only return the valid parameters.
  assertObjectEquals({
    'login_hint': 'user@example.com',
    'prompt': 'consent',
    'include_granted_scopes': 'true',
  }, provider.getCustomParameters());

  // Modify custom parameters.
  provider.setCustomParameters({
    'login_hint': 'user2@example.com'
  }).setCustomParameters({
    'login_hint': 'user3@example.com'
  });
  // Parameters should be updated.
  assertObjectEquals({
    'login_hint': 'user3@example.com'
  }, provider.getCustomParameters());
}


function testOAuthProvider_chainedMethods() {
  // Test that method chaining works.
  var provider = new fireauth.OAuthProvider('example.com')
      .addScope('scope1')
      .addScope('scope2')
      .setCustomParameters({
        'login_hint': 'user@example.com'
      })
      .addScope('scope3');
  assertArrayEquals(['scope1', 'scope2', 'scope3'], provider.getScopes());
  assertObjectEquals({
    'login_hint': 'user@example.com'
  }, provider.getCustomParameters());
}


function testOAuthProvider_getCredentialFromResponse() {
  var provider = new fireauth.OAuthProvider('example.com');
  var authCredential = provider.credential(
      'exampleIdToken', 'exampleAccessToken');
  assertObjectEquals(
      authCredential.toPlainObject(),
      fireauth.AuthProvider.getCredentialFromResponse({
        'oauthAccessToken': 'exampleAccessToken',
        'oauthIdToken': 'exampleIdToken',
        'providerId': 'example.com',
        'signInMethod': 'example.com'
      }).toPlainObject());
}


function testOAuthProvider_getCredentialFromResponse_accessTokenOnly() {
  // Test Auth credential from response with access token only.
  var provider = new fireauth.OAuthProvider('example.com');
  var authCredential = provider.credential(
      null, 'exampleAccessToken');
  assertObjectEquals(
      authCredential.toPlainObject(),
      fireauth.AuthProvider.getCredentialFromResponse({
        'oauthAccessToken': 'exampleAccessToken',
        'providerId': 'example.com',
        'signInMethod': 'example.com'
      }).toPlainObject());
}


function testOAuthProvider_getCredentialFromResponse_idTokenOnly() {
  // Test Auth credential from response with ID token only.
  var provider = new fireauth.OAuthProvider('example.com');
  authCredential = provider.credential('exampleIdToken');
  assertObjectEquals(
      authCredential.toPlainObject(),
      fireauth.AuthProvider.getCredentialFromResponse({
        'oauthIdToken': 'exampleIdToken',
        'providerId': 'example.com',
        'signInMethod': 'example.com'
      }).toPlainObject());
}


function testOAuthCredential_linkToIdToken() {
  var provider = new fireauth.OAuthProvider('example.com');
  var authCredential = provider.credential(
      'exampleIdToken', 'exampleAccessToken');
  authCredential.linkToIdToken(rpcHandler, 'myIdToken');
  assertRpcHandlerVerifyAssertionForLinking({
    // requestUri should be http://localhost regardless of current URL.
    'requestUri': 'http://localhost',
    'postBody': 'id_token=exampleIdToken&access_token=exampleAccessToken' +
        '&providerId=example.com',
    'idToken': 'myIdToken'
  });
}


function testOAuthCredential_matchIdTokenWithUid() {
  // Mock idToken parsing.
  initializeIdTokenMocks('ID_TOKEN', '1234');

  var provider = new fireauth.OAuthProvider('example.com');
  var authCredential = provider.credential(
      'exampleIdToken', 'exampleAccessToken');
  var p = authCredential.matchIdTokenWithUid(rpcHandler, '1234');
  assertRpcHandlerVerifyAssertionForExisting({
    // requestUri should be http://localhost regardless of current URL.
    'requestUri': 'http://localhost',
    'postBody': 'id_token=exampleIdToken&access_token=exampleAccessToken' +
        '&providerId=example.com'
  });
  return p;
}


/**
 * Test Facebook Auth credential.
 */
function testFacebookAuthCredential() {
  assertEquals(
      fireauth.idp.ProviderId.FACEBOOK,
      fireauth.FacebookAuthProvider['PROVIDER_ID']);
  assertEquals(
      fireauth.idp.SignInMethod.FACEBOOK,
      fireauth.FacebookAuthProvider['FACEBOOK_SIGN_IN_METHOD']);
  var authCredential = fireauth.FacebookAuthProvider.credential(
      'facebookAccessToken');
  assertEquals('facebookAccessToken', authCredential['accessToken']);
  assertEquals(fireauth.idp.ProviderId.FACEBOOK, authCredential['providerId']);
  assertEquals(
      fireauth.idp.SignInMethod.FACEBOOK, authCredential['signInMethod']);
  authCredential.getIdTokenProvider(rpcHandler);
  assertObjectEquals(
      {
        'oauthAccessToken': 'facebookAccessToken',
        'providerId': fireauth.idp.ProviderId.FACEBOOK,
        'signInMethod': fireauth.idp.SignInMethod.FACEBOOK
      },
      authCredential.toPlainObject());
  assertRpcHandlerVerifyAssertion({
    // requestUri should be http://localhost regardless of current URL.
    'requestUri': 'http://localhost',
    'postBody': 'access_token=facebookAccessToken&providerId=' +
        fireauth.idp.ProviderId.FACEBOOK
  });
  var provider = new fireauth.FacebookAuthProvider();
  // Should not throw an error.
  assertNotThrows(function() {
    fireauth.AuthProvider.checkIfOAuthSupported(provider);
  });
  assertArrayEquals([], provider.getScopes());
  provider.addScope('scope1');
  assertArrayEquals(['scope1'], provider.getScopes());
  provider.addScope('scope2').addScope('scope3');
  // Add duplicate scope.
  provider.addScope('scope1');
  assertArrayEquals(['scope1', 'scope2', 'scope3'], provider.getScopes());
  assertEquals(fireauth.idp.ProviderId.FACEBOOK, provider['providerId']);
  assertTrue(provider['isOAuthProvider']);
  // Set OAuth custom parameters.
  provider.setCustomParameters({
    // Valid Facebook OAuth 2.0 parameters.
    'display': 'popup',
    'auth_type': 'rerequest',
    'locale': 'pt_BR',
    // Reserved parameters below should be filtered out.
    'client_id': 'CLIENT_ID',
    'response_type': 'token',
    'scope': 'scope1',
    'redirect_uri': 'https://www.evil.com',
    'state': 'STATE'
  });
  // Get custom parameters should only return the valid parameters.
  assertObjectEquals({
    'display': 'popup',
    'auth_type': 'rerequest',
    'locale': 'pt_BR'
  }, provider.getCustomParameters());
  // Modify custom parameters.
  provider.setCustomParameters({
    // Valid Facebook OAuth 2.0 parameters.
    'auth_type': 'rerequest'
  });
  // Parameters should be updated.
  assertObjectEquals({
    'auth_type': 'rerequest'
  }, provider.getCustomParameters());
  // Test Auth credential from response.
  assertObjectEquals(
      authCredential.toPlainObject(),
      fireauth.AuthProvider.getCredentialFromResponse({
        'providerId': 'facebook.com',
        'oauthAccessToken': 'facebookAccessToken'
      }).toPlainObject());
}


function testFacebookAuthProvider_localization() {
  var provider = new fireauth.FacebookAuthProvider();
  // Set default language on provider.
  provider.setDefaultLanguage('fr_FR');
  // Default language should be set as custom param.
  assertObjectEquals({
    'locale': 'fr_FR'
  }, provider.getCustomParameters());
  // Set some other parameters without the provider's language.
  provider.setCustomParameters({
    'display': 'popup',
    'client_id': 'CLIENT_ID',
    'lang': 'de',
    'hl': 'de'
  });
  // The expected parameters include the provider's default language.
  assertObjectEquals({
    'display': 'popup',
    'lang': 'de',
    'hl': 'de',
    'locale': 'fr_FR'
  }, provider.getCustomParameters());
  // Set custom parameters with the provider's language.
  provider.setCustomParameters({
    'locale': 'pt_BR',
  });
  // Default language should be overwritten.
  assertObjectEquals({
    'locale': 'pt_BR'
  }, provider.getCustomParameters());
  // Even after setting the default language, the non-default should still
  // apply.
  provider.setDefaultLanguage('fr_FR');
  assertObjectEquals({
    'locale': 'pt_BR'
  }, provider.getCustomParameters());
  // Update custom parameters to not include a language field.
  provider.setCustomParameters({});
  // Default should apply again.
  assertObjectEquals({
    'locale': 'fr_FR'
  }, provider.getCustomParameters());
  // Set default language to null.
  provider.setDefaultLanguage(null);
  // No language should be returned anymore.
  assertObjectEquals({}, provider.getCustomParameters());
}


function testFacebookAuthCredential_alternateConstructor() {
  var authCredential = fireauth.FacebookAuthProvider.credential(
      {'accessToken': 'facebookAccessToken'});
  assertEquals('facebookAccessToken', authCredential['accessToken']);
  assertEquals(fireauth.idp.ProviderId.FACEBOOK, authCredential['providerId']);
  assertEquals(
      fireauth.idp.SignInMethod.FACEBOOK, authCredential['signInMethod']);
  assertObjectEquals(
      {
        'oauthAccessToken': 'facebookAccessToken',
        'providerId': fireauth.idp.ProviderId.FACEBOOK,
        'signInMethod': fireauth.idp.SignInMethod.FACEBOOK
      },
      authCredential.toPlainObject());

  // Missing token.
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.ARGUMENT_ERROR);
  var error = assertThrows(function() {
    fireauth.FacebookAuthProvider.credential({});
  });
  assertEquals(expectedError.code, error.code);
}


function testFacebookAuthProvider_chainedMethods() {
  // Test that method chaining works.
  var provider = new fireauth.FacebookAuthProvider()
      .addScope('scope1')
      .addScope('scope2')
      .setCustomParameters({
        'locale': 'pt_BR'
      })
      .addScope('scope3');
  assertArrayEquals(['scope1', 'scope2', 'scope3'], provider.getScopes());
  assertObjectEquals({
    'locale': 'pt_BR'
  }, provider.getCustomParameters());
}


/**
 * Test Facebook Auth credential with non HTTP request.
 */
function testFacebookAuthCredential_nonHttp() {
  // Non http or https environment.
  stubs.replace(
      fireauth.util,
      'getCurrentUrl',
      function() {return 'chrome-extension://SOME_LONG_ID';});
  stubs.replace(
      fireauth.util,
      'getCurrentScheme',
      function() {return 'chrome-extension:';});
  assertEquals(
      fireauth.idp.ProviderId.FACEBOOK,
      fireauth.FacebookAuthProvider['PROVIDER_ID']);
  var authCredential = fireauth.FacebookAuthProvider.credential(
      'facebookAccessToken');
  assertEquals('facebookAccessToken', authCredential['accessToken']);
  assertEquals(fireauth.idp.ProviderId.FACEBOOK, authCredential['providerId']);
  assertEquals(
      fireauth.idp.SignInMethod.FACEBOOK, authCredential['signInMethod']);
  authCredential.getIdTokenProvider(rpcHandler);
  assertObjectEquals(
      {
        'oauthAccessToken': 'facebookAccessToken',
        'providerId': fireauth.idp.ProviderId.FACEBOOK,
        'signInMethod': fireauth.idp.SignInMethod.FACEBOOK
      },
      authCredential.toPlainObject());
  // http://localhost should be used instead of the real current URL.
  assertRpcHandlerVerifyAssertion({
    // requestUri should be http://localhost regardless of current URL.
    'requestUri': 'http://localhost',
    'postBody': 'access_token=facebookAccessToken&providerId=' +
        fireauth.idp.ProviderId.FACEBOOK
  });
}


/**
 * Test GitHub Auth credential.
 */
function testGithubAuthCredential() {
  assertEquals(
      fireauth.idp.ProviderId.GITHUB,
      fireauth.GithubAuthProvider['PROVIDER_ID']);
  assertEquals(
      fireauth.idp.SignInMethod.GITHUB,
      fireauth.GithubAuthProvider['GITHUB_SIGN_IN_METHOD']);
  var authCredential = fireauth.GithubAuthProvider.credential(
      'githubAccessToken');
  assertEquals('githubAccessToken', authCredential['accessToken']);
  assertEquals(fireauth.idp.ProviderId.GITHUB, authCredential['providerId']);
  assertEquals(
      fireauth.idp.SignInMethod.GITHUB, authCredential['signInMethod']);
  authCredential.getIdTokenProvider(rpcHandler);
  assertObjectEquals(
      {
        'oauthAccessToken': 'githubAccessToken',
        'providerId': fireauth.idp.ProviderId.GITHUB,
        'signInMethod':fireauth.idp.SignInMethod.GITHUB
      },
      authCredential.toPlainObject());
  assertRpcHandlerVerifyAssertion({
    // requestUri should be http://localhost regardless of current URL.
    'requestUri': 'http://localhost',
    'postBody': 'access_token=githubAccessToken&providerId=' +
        fireauth.idp.ProviderId.GITHUB
  });
  var provider = new fireauth.GithubAuthProvider();
  // Should not throw an error.
  assertNotThrows(function() {
    fireauth.AuthProvider.checkIfOAuthSupported(provider);
  });
  assertArrayEquals([], provider.getScopes());
  provider.addScope('scope1');
  assertArrayEquals(['scope1'], provider.getScopes());
  provider.addScope('scope2');
  assertArrayEquals(['scope1', 'scope2'], provider.getScopes());
  assertEquals(fireauth.idp.ProviderId.GITHUB, provider['providerId']);
  assertTrue(provider['isOAuthProvider']);
  // Set OAuth custom parameters.
  provider.setCustomParameters({
    // Valid GitHub OAuth 2.0 parameters.
    'allow_signup': false,
    // Reserved parameters below should be filtered out.
    'client_id': 'CLIENT_ID',
    'response_type': 'token',
    'scope': 'scope1',
    'redirect_uri': 'https://www.evil.com',
    'state': 'STATE'
  });
  // Get custom parameters should only return the valid parameters.
  assertObjectEquals({
    'allow_signup': 'false'
  }, provider.getCustomParameters());
  // Modify custom parameters.
  provider.setCustomParameters({
    // Valid GitHub OAuth 2.0 parameters.
    'allow_signup': true
  });
  // Parameters should be updated.
  assertObjectEquals({
    'allow_signup': 'true'
  }, provider.getCustomParameters());
  // Test Auth credential from response.
  assertObjectEquals(
      authCredential.toPlainObject(),
      fireauth.AuthProvider.getCredentialFromResponse({
        'providerId': 'github.com',
        'oauthAccessToken': 'githubAccessToken'
      }).toPlainObject());
}


function testGithubAuthProvider_localization() {
  var provider = new fireauth.GithubAuthProvider();
  // Set default language on provider.
  provider.setDefaultLanguage('fr');
  // Default language should be ignored as Github doesn't support localization.
  assertObjectEquals({}, provider.getCustomParameters());
  // Set all possible language parameters.
  provider.setCustomParameters({
    'locale': 'ar',
    'hl': 'ar',
    'lang': 'ar'
  });
  // All language parameters just piped through without the default.
  assertObjectEquals({
    'locale': 'ar',
    'hl': 'ar',
    'lang': 'ar'
  }, provider.getCustomParameters());
}


function testOAuthProvider_localization() {
  var provider = new fireauth.OAuthProvider('yahoo.com');
  // Set default language on provider.
  provider.setDefaultLanguage('fr');
  // Default language should be ignored as generic providers don't support
  // default localization.
  assertObjectEquals({}, provider.getCustomParameters());
  // Set all possible language parameters.
  provider.setCustomParameters({
    'locale': 'ar',
    'hl': 'ar',
    'lang': 'ar'
  });
  // All language parameters just piped through without the default.
  assertObjectEquals({
    'locale': 'ar',
    'hl': 'ar',
    'lang': 'ar'
  }, provider.getCustomParameters());
}


function testGithubAuthCredential_alternateConstructor() {
  var authCredential = fireauth.GithubAuthProvider.credential(
      {'accessToken': 'githubAccessToken'});
  assertEquals('githubAccessToken', authCredential['accessToken']);
  assertEquals(fireauth.idp.ProviderId.GITHUB, authCredential['providerId']);
  assertObjectEquals(
      {
        'oauthAccessToken': 'githubAccessToken',
        'providerId': fireauth.idp.ProviderId.GITHUB,
        'signInMethod':fireauth.idp.SignInMethod.GITHUB
      },
      authCredential.toPlainObject());

  // Missing token.
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.ARGUMENT_ERROR);
  var error = assertThrows(function() {
    fireauth.GithubAuthProvider.credential({});
  });
  assertEquals(expectedError.code, error.code);
}


function testGithubAuthProvider_chainedMethods() {
  // Test that method chaining works.
  var provider = new fireauth.GithubAuthProvider()
      .addScope('scope1')
      .addScope('scope2')
      .setCustomParameters({
        'allow_signup': false
      })
      .addScope('scope3');
  assertArrayEquals(['scope1', 'scope2', 'scope3'], provider.getScopes());
  assertObjectEquals({
    'allow_signup': 'false'
  }, provider.getCustomParameters());
}


function testGithubAuthCredential_linkToIdToken() {
  var authCredential = fireauth.GithubAuthProvider.credential(
      'githubAccessToken');
  authCredential.linkToIdToken(rpcHandler, 'myIdToken');
  assertRpcHandlerVerifyAssertionForLinking({
    // requestUri should be http://localhost regardless of current URL.
    'requestUri': 'http://localhost',
    'postBody': 'access_token=githubAccessToken&providerId=' +
        fireauth.idp.ProviderId.GITHUB,
    'idToken': 'myIdToken'
  });
}


function testGithubAuthCredential_matchIdTokenWithUid() {
  // Mock idToken parsing.
  initializeIdTokenMocks('ID_TOKEN', '1234');

  var authCredential = fireauth.GithubAuthProvider.credential(
      'githubAccessToken');
  var p = authCredential.matchIdTokenWithUid(rpcHandler, '1234');
  assertRpcHandlerVerifyAssertionForExisting({
    // requestUri should be http://localhost regardless of current URL.
    'requestUri': 'http://localhost',
    'postBody': 'access_token=githubAccessToken&providerId=' +
        fireauth.idp.ProviderId.GITHUB,
  });
  return p;
}


/**
 * Test Google Auth credential.
 */
function testGoogleAuthCredential() {
  assertEquals(
      fireauth.idp.ProviderId.GOOGLE,
      fireauth.GoogleAuthProvider['PROVIDER_ID']);
  assertEquals(
      fireauth.idp.SignInMethod.GOOGLE,
      fireauth.GoogleAuthProvider['GOOGLE_SIGN_IN_METHOD']);
  var authCredential = fireauth.GoogleAuthProvider.credential(
      'googleIdToken', 'googleAccessToken');
  assertEquals('googleIdToken', authCredential['idToken']);
  assertEquals('googleAccessToken', authCredential['accessToken']);
  assertEquals(fireauth.idp.ProviderId.GOOGLE, authCredential['providerId']);
  assertEquals(
      fireauth.idp.SignInMethod.GOOGLE, authCredential['signInMethod']);
  authCredential.getIdTokenProvider(rpcHandler);
  assertObjectEquals(
      {
        'oauthAccessToken': 'googleAccessToken',
        'oauthIdToken': 'googleIdToken',
        'providerId': fireauth.idp.ProviderId.GOOGLE,
        'signInMethod': fireauth.idp.SignInMethod.GOOGLE
      },
      authCredential.toPlainObject());
  assertRpcHandlerVerifyAssertion({
    // requestUri should be http://localhost regardless of current URL.
    'requestUri': 'http://localhost',
    'postBody': 'id_token=googleIdToken&access_token=googleAccessToken&provi' +
        'derId=' + fireauth.idp.ProviderId.GOOGLE
  });
  var provider = new fireauth.GoogleAuthProvider();
  // Should not throw an error.
  assertNotThrows(function() {
    fireauth.AuthProvider.checkIfOAuthSupported(provider);
  });
  assertArrayEquals(['profile'], provider.getScopes());
  provider.addScope('scope1');
  assertArrayEquals(['profile', 'scope1'], provider.getScopes());
  provider.addScope('scope2');
  assertArrayEquals(['profile', 'scope1', 'scope2'], provider.getScopes());
  assertEquals(fireauth.idp.ProviderId.GOOGLE, provider['providerId']);
  assertTrue(provider['isOAuthProvider']);
  // Set OAuth custom parameters.
  provider.setCustomParameters({
    // Valid Google OAuth 2.0 parameters.
    'login_hint': 'user@example.com',
    'hd': 'example.com',
    'hl': 'fr',
    'prompt': 'consent',
    'include_granted_scopes': true,
    // Reserved parameters below should be filtered out.
    'client_id': 'CLIENT_ID',
    'response_type': 'token',
    'scope': 'scope1',
    'redirect_uri': 'https://www.evil.com',
    'state': 'STATE'
  });
  // Get custom parameters should only return the valid parameters.
  assertObjectEquals({
    'login_hint': 'user@example.com',
    'hd': 'example.com',
    'hl': 'fr',
    'prompt': 'consent',
    'include_granted_scopes': 'true'
  }, provider.getCustomParameters());
  // Modify custom parameters.
  provider.setCustomParameters({
    // Valid Google OAuth 2.0 parameters.
    'login_hint': 'user2@example.com'
  });
  // Parameters should be updated.
  assertObjectEquals({
    'login_hint': 'user2@example.com'
  }, provider.getCustomParameters());
  assertObjectEquals(
      authCredential.toPlainObject(),
      fireauth.AuthProvider.getCredentialFromResponse({
        'providerId': 'google.com',
        'oauthAccessToken': 'googleAccessToken',
        'oauthIdToken': 'googleIdToken'
      }).toPlainObject());
  // Test Auth credential from response with access token only.
  authCredential = fireauth.GoogleAuthProvider.credential(null,
      'googleAccessToken');
  assertObjectEquals(
      authCredential.toPlainObject(),
      fireauth.AuthProvider.getCredentialFromResponse({
        'providerId': 'google.com',
        'oauthAccessToken': 'googleAccessToken'
      }).toPlainObject());
  // Test Auth credential from response with ID token only.
  authCredential = fireauth.GoogleAuthProvider.credential('googleIdToken');
  assertObjectEquals(
      authCredential.toPlainObject(),
      fireauth.AuthProvider.getCredentialFromResponse({
        'providerId': 'google.com',
        'oauthIdToken': 'googleIdToken'
      }).toPlainObject());
}


function testGoogleAuthProvider_localization() {
  var provider = new fireauth.GoogleAuthProvider();
  // Set default language on provider.
  provider.setDefaultLanguage('fr');
  // Default language should be set as custom param.
  assertObjectEquals({
    'hl': 'fr'
  }, provider.getCustomParameters());
  // Set some other parameters without the provider's language.
  provider.setCustomParameters({
    'prompt': 'consent',
    'client_id': 'CLIENT_ID',
    'lang': 'ar',
    'locale': 'ar'
  });
  // The expected parameters include the provider's default language.
  assertObjectEquals({
    'prompt': 'consent',
    'hl': 'fr',
    'lang': 'ar',
    'locale': 'ar'
  }, provider.getCustomParameters());
  // Set custom parameters with the provider's language.
  provider.setCustomParameters({
    'hl': 'de'
  });
  // Default language should be overwritten.
  assertObjectEquals({
    'hl': 'de'
  }, provider.getCustomParameters());
  // Even after setting the default language, the non-default should still
  // apply.
  provider.setDefaultLanguage('fr');
  assertObjectEquals({
    'hl': 'de'
  }, provider.getCustomParameters());
  // Update custom parameters to not include a language field.
  provider.setCustomParameters({});
  // Default should apply again.
  assertObjectEquals({
    'hl': 'fr'
  }, provider.getCustomParameters());
  // Set default language to null.
  provider.setDefaultLanguage(null);
  // No language should be returned anymore.
  assertObjectEquals({}, provider.getCustomParameters());
}


function testGoogleAuthProvider_chainedMethods() {
  // Test that method chaining works.
  var provider = new fireauth.GoogleAuthProvider()
      .addScope('scope1')
      .addScope('scope2')
      .setCustomParameters({
        'login_hint': 'user@example.com'
      })
      .addScope('scope3');
  assertArrayEquals(['profile', 'scope1', 'scope2', 'scope3'],
      provider.getScopes());
  assertObjectEquals({
    'login_hint': 'user@example.com'
  }, provider.getCustomParameters());
}


function testGoogleAuthCredential_idTokenConstructor() {
  var authCredential = fireauth.GoogleAuthProvider.credential(
      'googleIdToken');
  assertEquals('googleIdToken', authCredential['idToken']);
  assertUndefined(authCredential['accessToken']);
}


function testGoogleAuthCredential_accessTokenConstructor() {
  var authCredential = fireauth.GoogleAuthProvider.credential(
      null, 'googleAccessToken');
  assertEquals('googleAccessToken', authCredential['accessToken']);
  assertUndefined(authCredential['idToken']);
}


function testGoogleAuthCredential_idAndAccessTokenConstructor() {
  var authCredential = fireauth.GoogleAuthProvider.credential(
      'googleIdToken', 'googleAccessToken');
  assertEquals('googleIdToken', authCredential['idToken']);
  assertEquals('googleAccessToken', authCredential['accessToken']);
}


function testGoogleAuthCredential_alternateConstructor() {
  // Only ID token.
  var authCredentialIdToken = fireauth.GoogleAuthProvider.credential(
      {'idToken': 'googleIdToken'});
  assertEquals('googleIdToken', authCredentialIdToken['idToken']);
  assertUndefined(authCredentialIdToken['accessToken']);
  assertObjectEquals(
      {
        'oauthIdToken': 'googleIdToken',
        'providerId': fireauth.idp.ProviderId.GOOGLE,
        'signInMethod': fireauth.idp.SignInMethod.GOOGLE
      },
      authCredentialIdToken.toPlainObject());

  // Only access token.
  var authCredentialAccessToken = fireauth.GoogleAuthProvider.credential(
      {'accessToken': 'googleAccessToken'});
  assertEquals('googleAccessToken', authCredentialAccessToken['accessToken']);
  assertUndefined(authCredentialAccessToken['idToken']);
  assertObjectEquals(
      {
        'oauthIdToken': 'googleIdToken',
        'providerId': fireauth.idp.ProviderId.GOOGLE,
        'signInMethod': fireauth.idp.SignInMethod.GOOGLE
      },
      authCredentialIdToken.toPlainObject());

  // Both tokens.
  var authCredentialBoth = fireauth.GoogleAuthProvider.credential(
      {'idToken': 'googleIdToken', 'accessToken': 'googleAccessToken'});
  assertEquals('googleAccessToken', authCredentialBoth['accessToken']);
  assertEquals('googleIdToken', authCredentialBoth['idToken']);
  assertObjectEquals(
      {
        'oauthIdToken': 'googleIdToken',
        'providerId': fireauth.idp.ProviderId.GOOGLE,
        'signInMethod': fireauth.idp.SignInMethod.GOOGLE
      },
      authCredentialIdToken.toPlainObject());

  // Neither token.
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.ARGUMENT_ERROR);
  var error = assertThrows(function() {
    fireauth.GoogleAuthProvider.credential({});
  });
  assertEquals(expectedError.code, error.code);
}


function testGoogleAuthCredential_linkToIdToken() {
  var authCredential = fireauth.GoogleAuthProvider.credential(
      'googleIdToken', 'googleAccessToken');
  authCredential.linkToIdToken(rpcHandler, 'myIdToken');
  assertRpcHandlerVerifyAssertionForLinking({
    // requestUri should be http://localhost regardless of current URL.
    'requestUri': 'http://localhost',
    'postBody': 'id_token=googleIdToken&access_token=googleAccessToken&provi' +
        'derId=' + fireauth.idp.ProviderId.GOOGLE,
    'idToken': 'myIdToken'
  });
}


function testGoogleAuthCredential_matchIdTokenWithUid() {
  // Mock idToken parsing.
  initializeIdTokenMocks('ID_TOKEN', '1234');

  var authCredential = fireauth.GoogleAuthProvider.credential(
      'googleIdToken', 'googleAccessToken');
  var p = authCredential.matchIdTokenWithUid(rpcHandler, '1234');
  assertRpcHandlerVerifyAssertionForExisting({
    // requestUri should be http://localhost regardless of current URL.
    'requestUri': 'http://localhost',
    'postBody': 'id_token=googleIdToken&access_token=googleAccessToken&provi' +
        'derId=' + fireauth.idp.ProviderId.GOOGLE
  });
  return p;
}


/**
 * Test Twitter Auth credential.
 */
function testTwitterAuthCredential() {
  assertEquals(
      fireauth.idp.ProviderId.TWITTER,
      fireauth.TwitterAuthProvider['PROVIDER_ID']);
  assertEquals(
      fireauth.idp.SignInMethod.TWITTER,
      fireauth.TwitterAuthProvider['TWITTER_SIGN_IN_METHOD']);
  var authCredential = fireauth.TwitterAuthProvider.credential(
      'twitterOauthToken', 'twitterOauthTokenSecret');
  assertEquals('twitterOauthToken', authCredential['accessToken']);
  assertEquals('twitterOauthTokenSecret', authCredential['secret']);
  assertEquals(fireauth.idp.ProviderId.TWITTER, authCredential['providerId']);
  assertEquals(
      fireauth.idp.SignInMethod.TWITTER, authCredential['signInMethod']);
  assertObjectEquals(
      {
        'oauthAccessToken': 'twitterOauthToken',
        'oauthTokenSecret': 'twitterOauthTokenSecret',
        'providerId': fireauth.idp.ProviderId.TWITTER,
        'signInMethod': fireauth.idp.SignInMethod.TWITTER
      },
      authCredential.toPlainObject());
  authCredential.getIdTokenProvider(rpcHandler);
  assertRpcHandlerVerifyAssertion({
    // requestUri should be http://localhost regardless of current URL.
    'requestUri': 'http://localhost',
    'postBody': 'access_token=twitterOauthToken&oauth_token_secret=twitter' +
        'OauthTokenSecret&providerId=' +
        fireauth.idp.ProviderId.TWITTER
  });
  var provider = new fireauth.TwitterAuthProvider();
  // Should not throw an error.
  assertNotThrows(function() {
    fireauth.AuthProvider.checkIfOAuthSupported(provider);
  });
  assertEquals(fireauth.idp.ProviderId.TWITTER, provider['providerId']);
  assertTrue(provider['isOAuthProvider']);
  // Set OAuth custom parameters.
  provider.setCustomParameters({
    'lang': 'es',
    // Reserved parameters below should be filtered out.
    'oauth_consumer_key': 'OAUTH_CONSUMER_KEY',
    'oauth_nonce': 'OAUTH_NONCE',
    'oauth_signature': 'OAUTH_SIGNATURE',
    'oauth_signature_method': 'HMAC-SHA1',
    'oauth_timestamp': '1318622958',
    'oauth_token': 'OAUTH_TOKEN',
    'oauth_version': '1.0'
  });
  // Get custom parameters should only return the valid parameters.
  assertObjectEquals({
    'lang': 'es'
  }, provider.getCustomParameters());
  // Modify custom parameters.
  provider.setCustomParameters({
    'lang': 'en'
  });
  // Parameters should be updated.
  assertObjectEquals({
    'lang': 'en'
  }, provider.getCustomParameters());
  // Test Auth credential from response.
  assertObjectEquals(
      authCredential.toPlainObject(),
      fireauth.AuthProvider.getCredentialFromResponse({
        'providerId': 'twitter.com',
        'oauthAccessToken': 'twitterOauthToken',
        'oauthTokenSecret': 'twitterOauthTokenSecret'
      }).toPlainObject());
}


function testTwitterAuthProvider_localization() {
  var provider = new fireauth.TwitterAuthProvider();
  // Set default language on provider.
  provider.setDefaultLanguage('fr');
  // Default language should be set as custom param.
  assertObjectEquals({
    'lang': 'fr'
  }, provider.getCustomParameters());
  // Set some other parameters without the provider's language.
  provider.setCustomParameters({
    'foo': 'bar',
    'oauth_consumer_key': 'OAUTH_CONSUMER_KEY',
    'locale': 'ar',
    'hl': 'ar'
  });
  // The expected parameters include the provider's default language.
  assertObjectEquals({
    'foo': 'bar',
    'lang': 'fr',
    'locale': 'ar',
    'hl': 'ar'
  }, provider.getCustomParameters());
  // Set custom parameters with the provider's language.
  provider.setCustomParameters({
    'lang': 'de',
  });
  // Default language should be overwritten.
  assertObjectEquals({
    'lang': 'de'
  }, provider.getCustomParameters());
  // Even after setting the default language, the non-default should still
  // apply.
  provider.setDefaultLanguage('fr');
  assertObjectEquals({
    'lang': 'de'
  }, provider.getCustomParameters());
  // Update custom parameters to not include a language field.
  provider.setCustomParameters({});
  // Default should apply again.
  assertObjectEquals({
    'lang': 'fr'
  }, provider.getCustomParameters());
  // Set default language to null.
  provider.setDefaultLanguage(null);
  // No language should be returned anymore.
  assertObjectEquals({}, provider.getCustomParameters());
}


function testTwitterAuthProvider_chainedMethods() {
  // Test that method chaining works.
  var provider = new fireauth.TwitterAuthProvider()
      .setCustomParameters({
        'lang': 'en'
      })
      .setCustomParameters({
        'lang': 'es'
      });
  assertObjectEquals({
    'lang': 'es'
  }, provider.getCustomParameters());
}


function testTwitterAuthCredential_tokenSecretConstructor() {
  var authCredential = fireauth.TwitterAuthProvider.credential(
      'twitterOauthToken', 'twitterOauthTokenSecret');
  assertEquals('twitterOauthToken', authCredential['accessToken']);
  assertEquals('twitterOauthTokenSecret', authCredential['secret']);
}


function testTwitterAuthCredential_alternateConstructor() {
  var authCredential = fireauth.TwitterAuthProvider.credential({
    'oauthToken': 'twitterOauthToken',
    'oauthTokenSecret': 'twitterOauthTokenSecret'
  });
  assertEquals('twitterOauthToken', authCredential['accessToken']);
  assertEquals('twitterOauthTokenSecret', authCredential['secret']);
  assertEquals(fireauth.idp.ProviderId.TWITTER, authCredential['providerId']);
  assertObjectEquals(
      {
        'oauthAccessToken': 'twitterOauthToken',
        'oauthTokenSecret': 'twitterOauthTokenSecret',
        'providerId': fireauth.idp.ProviderId.TWITTER,
        'signInMethod':fireauth.idp.SignInMethod.TWITTER
      },
      authCredential.toPlainObject());

  // Missing token or secret should be an error.
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.ARGUMENT_ERROR);
  var error = assertThrows(function() {
    fireauth.TwitterAuthProvider.credential({
      'oauthToken': 'twitterOauthToken'
    });
  });
  assertEquals(expectedError.code, error.code);

  error = assertThrows(function() {
    fireauth.TwitterAuthProvider.credential({
      'oauthTokenSecret': 'twitterOauthTokenSecret'
    });
  });
  assertEquals(expectedError.code, error.code);
}


/**
 * Test Email Password Auth credential.
 */
function testEmailAuthCredential() {
  assertEquals(
      fireauth.idp.ProviderId.PASSWORD,
      fireauth.EmailAuthProvider['PROVIDER_ID']);
  assertEquals(
      fireauth.idp.SignInMethod.EMAIL_PASSWORD,
      fireauth.EmailAuthProvider['EMAIL_PASSWORD_SIGN_IN_METHOD']);
  var authCredential = fireauth.EmailAuthProvider.credential(
      'user@example.com', 'password');
  assertObjectEquals(
      {
        'email': 'user@example.com',
        'password': 'password',
        'signInMethod': 'password'
      },
      authCredential.toPlainObject());
  assertEquals(fireauth.idp.ProviderId.PASSWORD, authCredential['providerId']);
  authCredential.getIdTokenProvider(rpcHandler);
  assertRpcHandlerVerifyPassword('user@example.com', 'password');
  var provider = new fireauth.EmailAuthProvider();
  // Should throw an invalid OAuth provider error.
  var error = assertThrows(function() {
    fireauth.AuthProvider.checkIfOAuthSupported(provider);
  });
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INVALID_OAUTH_PROVIDER);
  fireauth.common.testHelper.assertErrorEquals(expectedError, error);
  assertEquals(fireauth.idp.ProviderId.PASSWORD, provider['providerId']);
  assertFalse(provider['isOAuthProvider']);
}


function testEmailAuthCredential_linkToIdToken() {
  var authCredential = fireauth.EmailAuthProvider.credential(
      'foo@bar.com', '123123');
  authCredential.linkToIdToken(rpcHandler, 'myIdToken');
  assertRpcHandlerUpdateEmailAndPassword(
      'myIdToken', 'foo@bar.com', '123123');
}


function testEmailAuthCredentialWithEmailLink_linkToIdToken() {
  var authCredential = fireauth.EmailAuthProvider.credentialWithLink(
      'user@example.com', 'https://www.example.com?mode=signIn&oobCode=code');
  authCredential.linkToIdToken(rpcHandler, 'myIdToken');
  assertRpcHandlerEmailLinkSignInForLinking(
      'myIdToken', 'user@example.com', 'code');
}


function testEmailAuthCredential_matchIdTokenWithUid() {
  // Mock idToken parsing.
  initializeIdTokenMocks('ID_TOKEN', '1234');
  var authCredential = fireauth.EmailAuthProvider.credential(
      'user@example.com', 'password');
  var p = authCredential.matchIdTokenWithUid(rpcHandler, '1234');
  assertRpcHandlerVerifyPassword('user@example.com', 'password');
  return p;
}


function testEmailAuthCredentialWithEmailLink_matchIdTokenWithUid() {
  // Mock idToken parsing.
  initializeIdTokenMocks('ID_TOKEN', '1234');
  var authCredential = fireauth.EmailAuthProvider.credentialWithLink(
      'user@example.com', 'https://www.example.com?mode=signIn&oobCode=code');
  var p = authCredential.matchIdTokenWithUid(rpcHandler, '1234');
  assertRpcHandlerEmailLinkSignIn('user@example.com', 'code');
  return p;
}


/**
 * Test Email Link Auth credential.
 */
function testEmailAuthCredentialWithLink() {
  assertEquals(
      fireauth.idp.ProviderId.PASSWORD,
      fireauth.EmailAuthProvider['PROVIDER_ID']);
  assertEquals(
      fireauth.idp.SignInMethod.EMAIL_LINK,
      fireauth.EmailAuthProvider['EMAIL_LINK_SIGN_IN_METHOD']);
  var authCredential = fireauth.EmailAuthProvider.credentialWithLink(
      'user@example.com', 'https://www.example.com?mode=signIn&oobCode=code');
  assertObjectEquals(
      {
        'email': 'user@example.com',
        'password': 'code',
        'signInMethod': 'emailLink'
      },
      authCredential.toPlainObject());
  assertEquals(fireauth.idp.ProviderId.PASSWORD, authCredential['providerId']);
  assertEquals(
      fireauth.idp.SignInMethod.EMAIL_LINK, authCredential['signInMethod']);
  authCredential.getIdTokenProvider(rpcHandler);
  assertRpcHandlerEmailLinkSignIn('user@example.com', 'code');
  var provider = new fireauth.EmailAuthProvider();
  // Should throw an invalid OAuth provider error.
  var error = assertThrows(function() {
    fireauth.AuthProvider.checkIfOAuthSupported(provider);
  });
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.INVALID_OAUTH_PROVIDER);
  fireauth.common.testHelper.assertErrorEquals(expectedError, error);
  assertEquals(fireauth.idp.ProviderId.PASSWORD, provider['providerId']);
  assertFalse(provider['isOAuthProvider']);
}


function testEmailAuthCredentialWithLink_deepLink() {
  assertEquals(
      fireauth.idp.ProviderId.PASSWORD,
      fireauth.EmailAuthProvider['PROVIDER_ID']);
  assertEquals(
      fireauth.idp.SignInMethod.EMAIL_LINK,
      fireauth.EmailAuthProvider['EMAIL_LINK_SIGN_IN_METHOD']);
  var deepLink = 'https://www.example.com?mode=signIn&oobCode=code';
  var emailLink = 'https://example.app.goo.gl/?link=' +
      encodeURIComponent(deepLink);
  var authCredential = fireauth.EmailAuthProvider.credentialWithLink(
      'user@example.com', emailLink);
  assertObjectEquals(
      {
        'email': 'user@example.com',
        'password': 'code',
        'signInMethod': 'emailLink'
      },
      authCredential.toPlainObject());
  assertEquals(fireauth.idp.ProviderId.PASSWORD, authCredential['providerId']);
  assertEquals(
      fireauth.idp.SignInMethod.EMAIL_LINK, authCredential['signInMethod']);
  authCredential.getIdTokenProvider(rpcHandler);
  assertRpcHandlerEmailLinkSignIn('user@example.com', 'code');
  var provider = new fireauth.EmailAuthProvider();
  // Should throw an invalid OAuth provider error.
  var error = assertThrows(function() {
    fireauth.AuthProvider.checkIfOAuthSupported(provider);
  });
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.INVALID_OAUTH_PROVIDER);
  fireauth.common.testHelper.assertErrorEquals(expectedError, error);
  assertEquals(fireauth.idp.ProviderId.PASSWORD, provider['providerId']);
  assertFalse(provider['isOAuthProvider']);
}


function testEmailAuthCredentialWithLink_invalidLink_error() {
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.ARGUMENT_ERROR, 'Invalid email link!');
  var error = assertThrows(function() {
    fireauth.EmailAuthProvider.credentialWithLink(
        'user@example.com', 'invalidLink');
  });
  fireauth.common.testHelper.assertErrorEquals(expectedError, error);
}


function testEmailAuthProvider_getActionCodeFromSignInEmailLink() {
  var emailLink1 = 'https://www.example.com/action?mode=signIn&oobCode=oobCode';
  var emailLink2 = 'https://www.example.com/action?mode=verifyEmail&' +
                   'oobCode=oobCode';
  var emailLink3 = 'https://www.example.com/action?mode=signIn';
  var oobCode1 = fireauth.EmailAuthProvider
      .getActionCodeFromSignInEmailLink(emailLink1);
  assertEquals('oobCode', oobCode1);
  var oobCode2 = fireauth.EmailAuthProvider
      .getActionCodeFromSignInEmailLink(emailLink2);
  assertNull(oobCode2);
  var oobCode3 = fireauth.EmailAuthProvider
      .getActionCodeFromSignInEmailLink(emailLink3);
  assertNull(oobCode3);
}


function testEmailAuthProvider_getActionCodeFromSignInEmailLink_deepLink() {
  var deepLink1 = 'https://www.example.com/action?mode=signIn&oobCode=oobCode';
  var deepLink2 = 'https://www.example.com/action?mode=verifyEmail&' +
                   'oobCode=oobCode';
  var deepLink3 = 'https://www.example.com/action?mode=signIn';

  var emailLink1 = 'https://example.app.goo.gl/?link=' +
      encodeURIComponent(deepLink1);
  var emailLink2 = 'https://example.app.goo.gl/?link=' +
      encodeURIComponent(deepLink2);
  var emailLink3 = 'https://example.app.goo.gl/?link=' +
      encodeURIComponent(deepLink3);
  var emailLink4 = 'comexampleiosurl://google/link?deep_link_id=' +
      encodeURIComponent(deepLink1);

  var oobCode1 = fireauth.EmailAuthProvider
      .getActionCodeFromSignInEmailLink(emailLink1);
  assertEquals('oobCode', oobCode1);
  var oobCode2 = fireauth.EmailAuthProvider
      .getActionCodeFromSignInEmailLink(emailLink2);
  assertNull(oobCode2);
  var oobCode3 = fireauth.EmailAuthProvider
      .getActionCodeFromSignInEmailLink(emailLink3);
  assertNull(oobCode3);
  var oobCode4 = fireauth.EmailAuthProvider
      .getActionCodeFromSignInEmailLink(emailLink4);
  assertEquals('oobCode', oobCode4);
}


function testPhoneAuthProvider() {
  assertEquals(fireauth.PhoneAuthProvider['PROVIDER_ID'],
      fireauth.idp.ProviderId.PHONE);
  var provider = new fireauth.PhoneAuthProvider(auth);
  assertEquals(provider['providerId'], fireauth.idp.ProviderId.PHONE);
}


function testPhoneAuthProvider_noAuth() {
  stubs.set(firebase, 'auth', function() {
    throw new Error('app not initialized');
  });
  var error = assertThrows(function() {
    new fireauth.PhoneAuthProvider();
  });
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.ARGUMENT_ERROR);
  assertEquals(expectedError.code, error.code);
}


function testVerifyPhoneNumber() {
  var phoneNumber = '+16505550101';
  var recaptchaToken = 'theRecaptchaToken';
  var verificationId = 'theVerificationId';

  var applicationVerifier = {
    'type': 'recaptcha',
    'verify': function() {
      return goog.Promise.resolve(recaptchaToken);
    }
  };
  var expectedSendVerificationCodeRequest = {
    'phoneNumber': phoneNumber,
    'recaptchaToken': recaptchaToken
  };
  var auth = mockControl.createStrictMock(fireauth.Auth);
  var rpcHandler = mockControl.createStrictMock(fireauth.RpcHandler);
  auth.getRpcHandler().$once().$returns(rpcHandler);
  rpcHandler.sendVerificationCode(expectedSendVerificationCodeRequest)
      .$once()
      .$returns(goog.Promise.resolve(verificationId));

  mockControl.$replayAll();

  var provider = new fireauth.PhoneAuthProvider(auth);
  return provider.verifyPhoneNumber(phoneNumber, applicationVerifier)
      .then(function(actualVerificationId) {
        assertEquals(verificationId, actualVerificationId);
      });
}


function testVerifyPhoneNumber_reset_sendVerificationCodeTwice() {
  var phoneNumber = '+16505550101';
  var recaptchaToken1 = 'theRecaptchaToken1';
  var recaptchaToken2 = 'theRecaptchaToken2';
  var verificationId1 = 'theVerificationId1';
  var verificationId2 = 'theVerificationId2';
  var verify = mockControl.createFunctionMock('verify');
  var reset = mockControl.createFunctionMock('reset');
  verify().$once().$returns(goog.Promise.resolve(recaptchaToken1));
  reset().$once();
  verify().$once().$returns(goog.Promise.resolve(recaptchaToken2));
  reset().$once();

  // Everytime after reset being called, verifier returns a new token.
  var applicationVerifier = {
    'type': 'recaptcha',
    'verify': verify,
    'reset': reset
  };
  var expectedSendVerificationCodeRequest1 = {
    'phoneNumber': phoneNumber,
    'recaptchaToken': recaptchaToken1
  };
  var expectedSendVerificationCodeRequest2 = {
    'phoneNumber': phoneNumber,
    'recaptchaToken': recaptchaToken2
  };

  var auth = mockControl.createStrictMock(fireauth.Auth);
  var rpcHandler = mockControl.createStrictMock(fireauth.RpcHandler);
  auth.getRpcHandler().$times(2).$returns(rpcHandler);
  rpcHandler.sendVerificationCode(expectedSendVerificationCodeRequest1)
      .$once()
      .$returns(goog.Promise.resolve(verificationId1));
  rpcHandler.sendVerificationCode(expectedSendVerificationCodeRequest2)
      .$once()
      .$returns(goog.Promise.resolve(verificationId2));

  mockControl.$replayAll();

  var provider = new fireauth.PhoneAuthProvider(auth);
  return provider.verifyPhoneNumber(phoneNumber, applicationVerifier)
      .then(function(actualVerificationId1) {
        assertEquals(verificationId1, actualVerificationId1);
        return provider.verifyPhoneNumber(phoneNumber, applicationVerifier)
            .then(function(actualVerificationId2) {
              assertEquals(verificationId2, actualVerificationId2);
            });
      });
}


function testVerifyPhoneNumber_reset_sendVerificationCodeError() {
  var phoneNumber = '+16505550101';
  var recaptchaToken = 'theRecaptchaToken';
  var expectedError = 'something bad happened!!!';

  var applicationVerifier = {
    'type': 'recaptcha',
    'verify': function() {
      return goog.Promise.resolve(recaptchaToken);
    },
    'reset': goog.testing.recordFunction(function() {})
  };
  var expectedSendVerificationCodeRequest = {
    'phoneNumber': phoneNumber,
    'recaptchaToken': recaptchaToken
  };
  var auth = mockControl.createStrictMock(fireauth.Auth);
  var rpcHandler = mockControl.createStrictMock(fireauth.RpcHandler);
  auth.getRpcHandler().$once().$returns(rpcHandler);
  rpcHandler.sendVerificationCode(expectedSendVerificationCodeRequest)
      .$once()
      .$does(function() {
        return goog.Promise.reject(expectedError);
      });

  mockControl.$replayAll();

  var provider = new fireauth.PhoneAuthProvider(auth);
  return provider.verifyPhoneNumber(phoneNumber, applicationVerifier)
      .then(fail, function(error) {
        assertEquals(1, applicationVerifier.reset.getCallCount());
        assertEquals(expectedError, error);
      });
}


function testVerifyPhoneNumber_defaultAuthInstance() {
  // Tests that verifyPhoneNumber works when using the default Auth instance.
  var phoneNumber = '+16505550101';
  var recaptchaToken = 'theRecaptchaToken';
  var verificationId = 'theVerificationId';

  var applicationVerifier = {
    'type': 'recaptcha',
    'verify': function() {
      return goog.Promise.resolve(recaptchaToken);
    }
  };
  var expectedSendVerificationCodeRequest = {
    'phoneNumber': phoneNumber,
    'recaptchaToken': recaptchaToken
  };
  var auth = mockControl.createStrictMock(fireauth.Auth);
  var rpcHandler = mockControl.createStrictMock(fireauth.RpcHandler);
  stubs.set(firebase, 'auth', function() {
    return auth;
  });
  auth.getRpcHandler().$once().$returns(rpcHandler);
  rpcHandler.sendVerificationCode(expectedSendVerificationCodeRequest)
      .$once()
      .$returns(goog.Promise.resolve(verificationId));

  mockControl.$replayAll();

  var provider = new fireauth.PhoneAuthProvider();
  return provider.verifyPhoneNumber(phoneNumber, applicationVerifier)
      .then(function(actualVerificationId) {
        assertEquals(verificationId, actualVerificationId);
      });
}


function testVerifyPhoneNumber_notRecaptcha() {
  var applicationVerifier = {
    // The ApplicationVerifier type is not supported.
    'type': 'some-unsupported-type',
    'verify': function() {
      return goog.Promise.resolve('some assertion');
    }
  };
  var provider = new fireauth.PhoneAuthProvider(auth);
  return provider.verifyPhoneNumber('+16505550101', applicationVerifier)
      .then(fail, function(error) {
        var expectedError = new fireauth.AuthError(
            fireauth.authenum.Error.ARGUMENT_ERROR);
        assertEquals(expectedError.code, error.code);
      });
}


function testVerifyPhoneNumber_verifierReturnsUnexpectedType() {
  var applicationVerifier = {
    'type': 'recaptcha',
    'verify': function() {
      // The assertion is not a string.
      return goog.Promise.resolve(12345);
    }
  };
  var provider = new fireauth.PhoneAuthProvider(auth);
  return provider.verifyPhoneNumber('+16505550101', applicationVerifier)
      .then(fail, function(error) {
        var expectedError = new fireauth.AuthError(
            fireauth.authenum.Error.ARGUMENT_ERROR);
        assertEquals(expectedError.code, error.code);
      });
}


function testVerifyPhoneNumber_verifierThrowsError() {
  var expectedError = 'something bad happened!!!';
  var applicationVerifier = {
    'type': 'recaptcha',
    'verify': function() {
      // The verifier throws its own error.
      return goog.Promise.reject(expectedError);
    }
  };
  var provider = new fireauth.PhoneAuthProvider(auth);
  return provider.verifyPhoneNumber('+16505550101', applicationVerifier)
      .then(fail, function(error) {
        assertEquals(expectedError, error);
      });
}


function testPhoneAuthCredential_validateArguments() {
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INTERNAL_ERROR);
  var error;

  error = assertThrows(function() {
    fireauth.PhoneAuthCredential({verificationId: 'foo'});
  });
  fireauth.common.testHelper.assertErrorEquals(expectedError, error);

  error = assertThrows(function() {
    fireauth.PhoneAuthCredential({verificationCode: 'foo'});
  });
  fireauth.common.testHelper.assertErrorEquals(expectedError, error);

  error = assertThrows(function() {
    fireauth.PhoneAuthCredential({temporaryProof: 'foo'});
  });
  fireauth.common.testHelper.assertErrorEquals(expectedError, error);

  error = assertThrows(function() {
    fireauth.PhoneAuthCredential({phoneNumber: 'foo'});
  });
  fireauth.common.testHelper.assertErrorEquals(expectedError, error);

  error = assertThrows(function() {
    fireauth.PhoneAuthCredential({
      verificationCode: 'foo',
      phoneNumber: 'bar'
    });
  });
  fireauth.common.testHelper.assertErrorEquals(expectedError, error);

  error = assertThrows(function() {
    fireauth.PhoneAuthCredential({
      verificationCode: 'foo',
      temporaryProof: 'bar'
    });
  });
  fireauth.common.testHelper.assertErrorEquals(expectedError, error);
}


function testPhoneAuthCredential() {
  var verificationId = 'theVerificationId';
  var verificationCode = 'theVerificationCode';

  var credential = fireauth.PhoneAuthProvider.credential(
      verificationId, verificationCode);
  assertEquals(fireauth.idp.ProviderId.PHONE, credential['providerId']);
  assertEquals(fireauth.idp.SignInMethod.PHONE, credential['signInMethod']);
  assertEquals(
      fireauth.idp.SignInMethod.PHONE,
      fireauth.PhoneAuthProvider['PHONE_SIGN_IN_METHOD']);
  assertObjectEquals({
    'providerId': fireauth.idp.ProviderId.PHONE,
    'verificationId': verificationId,
    'verificationCode': verificationCode
  }, credential.toPlainObject());

  assertNull(
      fireauth.AuthProvider.getCredentialFromResponse({
        'providerId': 'phone'
      }));
}


function testPhoneAuthCredential_missingFieldsErrors() {
  var verificationId = 'theVerificationId';
  var verificationCode = 'theVerificationCode';

  var error = assertThrows(function() {
    fireauth.PhoneAuthProvider.credential('', verificationCode);
  });
  fireauth.common.testHelper.assertErrorEquals(
      new fireauth.AuthError(fireauth.authenum.Error.MISSING_SESSION_INFO),
      error);

  error = assertThrows(function() {
    fireauth.PhoneAuthProvider.credential(verificationId, '');
  });
  fireauth.common.testHelper.assertErrorEquals(
      new fireauth.AuthError(fireauth.authenum.Error.MISSING_CODE),
      error);

  error = assertThrows(function() {
    fireauth.PhoneAuthProvider.credential('', '');
  });
  fireauth.common.testHelper.assertErrorEquals(
      new fireauth.AuthError(fireauth.authenum.Error.MISSING_SESSION_INFO),
      error);
}


function testPhoneAuthCredential_getIdTokenProvider() {
  var verificationId = 'theVerificationId';
  var verificationCode = 'theVerificationCode';

  var expectedVerifyPhoneNumberRequest = {
    'sessionInfo': verificationId,
    'code': verificationCode
  };
  var verifyPhoneNumberResponse = {
   'idToken': 'myIdToken',
   'refreshToken': 'myRefreshToken',
   'expiresIn': '3600',
   'localId': 'myLocalId',
   'isNewUser': false,
   'phoneNumber': '+16505550101'
  };
  var rpcHandler = mockControl.createStrictMock(fireauth.RpcHandler);
  rpcHandler.verifyPhoneNumber(expectedVerifyPhoneNumberRequest).$once()
      .$returns(goog.Promise.resolve(verifyPhoneNumberResponse));

  mockControl.$replayAll();

  var credential = fireauth.PhoneAuthProvider.credential(
      verificationId, verificationCode);
  return credential.getIdTokenProvider(rpcHandler)
      .then(function(response) {
        assertObjectEquals(verifyPhoneNumberResponse, response);
      });
}


function testPhoneAuthCredential_linkToIdToken() {
  var verificationId = 'theVerificationId';
  var verificationCode = 'theVerificationCode';
  var idToken = 'myIdToken';

  var expectedVerifyPhoneNumberRequest = {
    'idToken': idToken,
    'sessionInfo': verificationId,
    'code': verificationCode
  };
  var verifyPhoneNumberResponse = {
   'idToken': 'myNewIdToken',
   'refreshToken': 'myRefreshToken',
   'expiresIn': '3600',
   'localId': 'myLocalId',
   'isNewUser': false,
   'phoneNumber': '+16505550101'
  };
  var rpcHandler = mockControl.createStrictMock(fireauth.RpcHandler);
  rpcHandler.verifyPhoneNumberForLinking(expectedVerifyPhoneNumberRequest)
      .$once()
      .$returns(goog.Promise.resolve(verifyPhoneNumberResponse));

  mockControl.$replayAll();

  var credential = fireauth.PhoneAuthProvider.credential(
      verificationId, verificationCode);
  return credential.linkToIdToken(rpcHandler, idToken)
      .then(function(response) {
        assertObjectEquals(verifyPhoneNumberResponse, response);
      });
}


function testPhoneAuthCredential_matchIdTokenWithUid() {
  var verificationId = 'theVerificationId';
  var verificationCode = 'theVerificationCode';
  var idToken = 'myIdToken';
  var uid = '1234';
  initializeIdTokenMocks(idToken, uid);

  var expectedVerifyPhoneNumberRequest = {
    'sessionInfo': verificationId,
    'code': verificationCode
  };
  var verifyPhoneNumberResponse = {
   'idToken': idToken,
   'refreshToken': 'myRefreshToken',
   'expiresIn': '3600',
   'localId': uid,
   'isNewUser': false,
   'phoneNumber': '+16505550101'
  };
  var rpcHandler = mockControl.createStrictMock(fireauth.RpcHandler);
  rpcHandler.verifyPhoneNumberForExisting(expectedVerifyPhoneNumberRequest)
      .$once()
      .$returns(goog.Promise.resolve(verifyPhoneNumberResponse));

  mockControl.$replayAll();

  var credential = fireauth.PhoneAuthProvider.credential(
      verificationId, verificationCode);
  return credential.matchIdTokenWithUid(rpcHandler, uid)
      .then(function(response) {
        assertObjectEquals(verifyPhoneNumberResponse, response);
      });
}


function testPhoneAuthCredential_matchIdTokenWithUid_mismatch() {
  var verificationId = 'theVerificationId';
  var verificationCode = 'theVerificationCode';
  var idToken = 'myIdToken';
  var passedUid = '5678';
  var uid = '1234';
  initializeIdTokenMocks(idToken, uid);

  var expectedVerifyPhoneNumberRequest = {
    'sessionInfo': verificationId,
    'code': verificationCode
  };
  var verifyPhoneNumberResponse = {
   'idToken': idToken,
   'refreshToken': 'myRefreshToken',
   'expiresIn': '3600',
   'localId': uid,
   'isNewUser': false,
   'phoneNumber': '+16505550101'
  };
  var rpcHandler = mockControl.createStrictMock(fireauth.RpcHandler);
  rpcHandler.verifyPhoneNumberForExisting(expectedVerifyPhoneNumberRequest)
      .$once()
      .$returns(goog.Promise.resolve(verifyPhoneNumberResponse));

  mockControl.$replayAll();

  var credential = fireauth.PhoneAuthProvider.credential(
      verificationId, verificationCode);
  return credential.matchIdTokenWithUid(rpcHandler, passedUid)
      .then(fail, function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.USER_MISMATCH),
            error);
      });
}


function testPhoneAuthCredential_temporaryProof() {
  var temporaryProof = 'theTempProof';
  var phoneNumber = '+16505550101';
  var credential = fireauth.AuthProvider.getCredentialFromResponse({
    'temporaryProof': temporaryProof,
    'phoneNumber': phoneNumber
  });

  assertEquals(fireauth.idp.ProviderId.PHONE, credential['providerId']);
  assertEquals(fireauth.idp.SignInMethod.PHONE, credential['signInMethod']);
  assertEquals(
      fireauth.idp.SignInMethod.PHONE,
      fireauth.PhoneAuthProvider['PHONE_SIGN_IN_METHOD']);
  assertObjectEquals({
    'providerId': fireauth.idp.ProviderId.PHONE,
    'temporaryProof': temporaryProof,
    'phoneNumber': phoneNumber
  }, credential.toPlainObject());
}


function testPhoneAuthCredential_temporaryProof_getIdTokenProvider() {
  var temporaryProof = 'theTempProof';
  var phoneNumber = '+16505550101';

  var expectedVerifyPhoneNumberRequest = {
    'temporaryProof': temporaryProof,
    'phoneNumber': phoneNumber
  };
  var verifyPhoneNumberResponse = {
   'idToken': 'myIdToken',
   'refreshToken': 'myRefreshToken',
   'expiresIn': '3600',
   'localId': 'myLocalId',
   'isNewUser': false,
   'phoneNumber': '+16505550101'
  };
  var rpcHandler = mockControl.createStrictMock(fireauth.RpcHandler);
  rpcHandler.verifyPhoneNumber(expectedVerifyPhoneNumberRequest).$once()
      .$returns(goog.Promise.resolve(verifyPhoneNumberResponse));

  mockControl.$replayAll();

  var credential = fireauth.AuthProvider.getCredentialFromResponse({
    'temporaryProof': temporaryProof,
    'phoneNumber': phoneNumber
  });
  return credential.getIdTokenProvider(rpcHandler)
      .then(function(response) {
        assertObjectEquals(verifyPhoneNumberResponse, response);
      });
}


function testPhoneAuthCredential_temporaryProof_linkToIdToken() {
  var temporaryProof = 'theTempProof';
  var phoneNumber = '+16505550101';
  var idToken = 'myIdToken';

  var expectedVerifyPhoneNumberRequest = {
    'idToken': idToken,
    'temporaryProof': temporaryProof,
    'phoneNumber': phoneNumber
  };
  var verifyPhoneNumberResponse = {
   'idToken': 'myNewIdToken',
   'refreshToken': 'myRefreshToken',
   'expiresIn': '3600',
   'localId': 'myLocalId',
   'isNewUser': false,
   'phoneNumber': '+16505550101'
  };
  var rpcHandler = mockControl.createStrictMock(fireauth.RpcHandler);
  rpcHandler.verifyPhoneNumberForLinking(expectedVerifyPhoneNumberRequest)
      .$once()
      .$returns(goog.Promise.resolve(verifyPhoneNumberResponse));

  mockControl.$replayAll();

  var credential = fireauth.AuthProvider.getCredentialFromResponse({
    'temporaryProof': temporaryProof,
    'phoneNumber': phoneNumber
  });
  return credential.linkToIdToken(rpcHandler, idToken)
      .then(function(response) {
        assertObjectEquals(verifyPhoneNumberResponse, response);
      });
}


function testPhoneAuthCredential_temporaryProof_matchIdTokenWithUid() {
  var temporaryProof = 'theTempProof';
  var phoneNumber = '+16505550101';
  var idToken = 'myIdToken';
  var uid = '1234';
  initializeIdTokenMocks(idToken, uid);

  var expectedVerifyPhoneNumberRequest = {
    'temporaryProof': temporaryProof,
    'phoneNumber': phoneNumber
  };
  var verifyPhoneNumberResponse = {
   'idToken': idToken,
   'refreshToken': 'myRefreshToken',
   'expiresIn': '3600',
   'localId': uid,
   'isNewUser': false,
   'phoneNumber': '+16505550101'
  };
  var rpcHandler = mockControl.createStrictMock(fireauth.RpcHandler);
  rpcHandler.verifyPhoneNumberForExisting(expectedVerifyPhoneNumberRequest)
      .$once()
      .$returns(goog.Promise.resolve(verifyPhoneNumberResponse));

  mockControl.$replayAll();

  var credential = fireauth.AuthProvider.getCredentialFromResponse({
    'temporaryProof': temporaryProof,
    'phoneNumber': phoneNumber
  });
  return credential.matchIdTokenWithUid(rpcHandler, uid)
      .then(function(response) {
        assertObjectEquals(verifyPhoneNumberResponse, response);
      });
}


function testPhoneAuthCredential_temporaryProof_matchIdTokenWithUid_mismatch() {
  var temporaryProof = 'theTempProof';
  var phoneNumber = '+16505550101';
  var idToken = 'myIdToken';
  var passedUid = '5678';
  var uid = '1234';
  initializeIdTokenMocks(idToken, uid);

  var expectedVerifyPhoneNumberRequest = {
    'temporaryProof': temporaryProof,
    'phoneNumber': phoneNumber
  };
  var verifyPhoneNumberResponse = {
   'idToken': idToken,
   'refreshToken': 'myRefreshToken',
   'expiresIn': '3600',
   'localId': uid,
   'isNewUser': false,
   'phoneNumber': '+16505550101'
  };
  var rpcHandler = mockControl.createStrictMock(fireauth.RpcHandler);
  rpcHandler.verifyPhoneNumberForExisting(expectedVerifyPhoneNumberRequest)
      .$once()
      .$returns(goog.Promise.resolve(verifyPhoneNumberResponse));

  mockControl.$replayAll();

  var credential = fireauth.AuthProvider.getCredentialFromResponse({
    'temporaryProof': temporaryProof,
    'phoneNumber': phoneNumber
  });
  return credential.matchIdTokenWithUid(rpcHandler, passedUid)
      .then(fail, function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.USER_MISMATCH),
            error);
      });
}


function testVerifyTokenResponseUid_match() {
  // Mock idToken parsing.
  initializeIdTokenMocks('ID_TOKEN', '1234');
  return fireauth.AuthCredential.verifyTokenResponseUid(
      goog.Promise.resolve(responseForIdToken), '1234');
}


function testVerifyTokenResponseUid_idTokenNotFound_mismatch() {
  // No ID token returned.
  var noIdTokenResponse = {};
  return fireauth.AuthCredential.verifyTokenResponseUid(
      goog.Promise.resolve(noIdTokenResponse), '1234')
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.USER_MISMATCH),
            error);
      });
}


function testVerifyTokenResponseUid_userFound_mismatch() {
  // Mock idToken parsing.
  initializeIdTokenMocks('ID_TOKEN', '1234');
  return fireauth.AuthCredential.verifyTokenResponseUid(
      // The UID does not match the ID token UID.
      goog.Promise.resolve(responseForIdToken), '5678')
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(
            new fireauth.AuthError(fireauth.authenum.Error.USER_MISMATCH),
            error);
      });
}


function testVerifyTokenResponseUid_passThroughError() {
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
  return fireauth.AuthCredential.verifyTokenResponseUid(
      goog.Promise.reject(expectedError), '1234')
      .thenCatch(function(error) {
        assertEquals(expectedError, error);
      });
}


function testVerifyTokenResponseUid_userNotFound() {
  // Confirm USER_DELETED error is translated to USER_MISMATCH.
  var error =
      new fireauth.AuthError(fireauth.authenum.Error.USER_DELETED);
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.USER_MISMATCH);
  return fireauth.AuthCredential.verifyTokenResponseUid(
      goog.Promise.reject(error), '1234')
      .thenCatch(function(error) {
        fireauth.common.testHelper.assertErrorEquals(expectedError, error);
      });
}
