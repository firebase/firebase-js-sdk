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
 * @fileoverview Tests for error_app.js and error_auth.js.
 */

goog.provide('fireauth.errorTest');

goog.require('fireauth.AuthError');
goog.require('fireauth.AuthErrorWithCredential');
goog.require('fireauth.AuthProvider');
goog.require('fireauth.FacebookAuthProvider');
goog.require('fireauth.GoogleAuthProvider');
goog.require('fireauth.InvalidOriginError');
goog.require('fireauth.authenum.Error');
goog.require('goog.object');
goog.require('goog.string.format');
goog.require('goog.testing.jsunit');

goog.setTestOnly('fireauth.errorTest');


var now = new Date();


function testAuthError() {
  var error = new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
  assertEquals('auth/internal-error', error['code']);
  assertEquals('An internal error has occurred.', error['message']);
  // Test toJSON().
  assertObjectEquals({
    code: error['code'],
    message: error['message']
  }, error.toJSON());
  // Make sure JSON.stringify works and uses underlying toJSON.
  assertEquals(JSON.stringify(error), JSON.stringify(error.toJSON()));
}


function testAuthError_serverResponse_defaultMessage() {
  var serverResponse = {
    'mfaInfo': {
      'mfaEnrollmentId': 'ENROLLMENT_UID1',
      'enrolledAt': now.toISOString(),
      'phoneInfo': '+16505551234'
    },
    'mfaPendingCredential': 'PENDING_CREDENTIAL',
    // Credential returned.
    'providerId': 'google.com',
    'oauthAccessToken': 'googleAccessToken',
    'oauthIdToken': 'googleIdToken',
    'oauthExpireIn': 3600,
    // Additional user info data.
    'rawUserInfo': '{"kind":"plus#person","displayName":"John Doe",' +
        '"name":{"givenName":"John","familyName":"Doe"}}'
  };
  var error = new fireauth.AuthError(
      fireauth.authenum.Error.MFA_REQUIRED, null, serverResponse);

  assertEquals('auth/multi-factor-auth-required', error['code']);
  assertEquals(
      fireauth.AuthError.MESSAGES_[fireauth.authenum.Error.MFA_REQUIRED],
      error['message']);
  assertObjectEquals(serverResponse, error.serverResponse);
  // Test toJSON().
  assertObjectEquals({
    code: error['code'],
    message: error['message'],
    serverResponse: error.serverResponse
  }, error.toJSON());
  // Make sure JSON.stringify works and uses underlying toJSON.
  assertEquals(JSON.stringify(error), JSON.stringify(error.toJSON()));

  // Confirm toPlainObject behavior.
  assertObjectEquals(error.toJSON(), error.toPlainObject());

  // Confirm fromPlainObject behavior.
  assertObjectEquals(
      error,
      fireauth.AuthError.fromPlainObject(error.toPlainObject()));
}


function testAuthError_serverResponse_customMessage() {
  var serverResponse = {
    'mfaInfo': {
      'mfaEnrollmentId': 'ENROLLMENT_UID1',
      'enrolledAt': now.toISOString(),
      'phoneInfo': '+16505551234'
    },
    'mfaPendingCredential': 'PENDING_CREDENTIAL',
    // Credential returned.
    'providerId': 'google.com',
    'oauthAccessToken': 'googleAccessToken',
    'oauthIdToken': 'googleIdToken',
    'oauthExpireIn': 3600,
    // Additional user info data.
    'rawUserInfo': '{"kind":"plus#person","displayName":"John Doe",' +
        '"name":{"givenName":"John","familyName":"Doe"}}'
  };
  var error = new fireauth.AuthError(
      fireauth.authenum.Error.MFA_REQUIRED,
      'custom message',
      serverResponse);

  assertEquals('auth/multi-factor-auth-required', error['code']);
  assertEquals('custom message', error['message']);
  assertObjectEquals(serverResponse, error.serverResponse);
  // Test toJSON().
  assertObjectEquals({
    code: error['code'],
    message: error['message'],
    serverResponse: error.serverResponse
  }, error.toJSON());
  // Make sure JSON.stringify works and uses underlying toJSON.
  assertEquals(JSON.stringify(error), JSON.stringify(error.toJSON()));

  // Confirm toPlainObject behavior.
  assertObjectEquals(error.toJSON(), error.toPlainObject());

  // Confirm fromPlainObject behavior.
  assertObjectEquals(
      error,
      fireauth.AuthError.fromPlainObject(error.toPlainObject()));
}


function testAuthError_errorTranslation_match() {
  var error = new fireauth.AuthError(fireauth.authenum.Error.USER_DELETED);
  // Translate USER_DELETED to USER_MISMATCH.
  var translatedError = fireauth.AuthError.translateError(
      error,
      fireauth.authenum.Error.USER_DELETED,
      fireauth.authenum.Error.USER_MISMATCH);
  var expectedError =
      new fireauth.AuthError(fireauth.authenum.Error.USER_MISMATCH);
  // Expected new error should be returned.
  assertEquals(
      JSON.stringify(expectedError), JSON.stringify(translatedError.toJSON()));
}


function testAuthError_errorTranslation_mismatch() {
  var error = new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
  // Translate USER_DELETED to USER_MISMATCH.
  var translatedError = fireauth.AuthError.translateError(
      error,
      fireauth.authenum.Error.USER_DELETED,
      fireauth.authenum.Error.USER_MISMATCH);
  // Same error should be returned.
  assertEquals(error, translatedError);
}


function testAuthErrorWithCredential() {
  var credential = fireauth.FacebookAuthProvider.credential('ACCESS_TOKEN');
  var error = new fireauth.AuthErrorWithCredential(
      fireauth.authenum.Error.NEED_CONFIRMATION,
      {
        email: 'user@example.com',
        credential: credential
      },
      'Account already exists, please confirm and link.');

  assertEquals('user@example.com', error['email']);
  assertUndefined(error['phoneNumber']);
  assertEquals('auth/account-exists-with-different-credential', error['code']);
  assertEquals(credential, error['credential']);
  assertEquals(
      'Account already exists, please confirm and link.', error['message']);
  // Test toJSON().
  assertObjectEquals(
      {
        code: error['code'],
        message: error['message'],
        email: 'user@example.com',
        providerId: 'facebook.com',
        oauthAccessToken: 'ACCESS_TOKEN',
        signInMethod: fireauth.FacebookAuthProvider['FACEBOOK_SIGN_IN_METHOD']
      },
      error.toJSON());
  assertEquals(JSON.stringify(error), JSON.stringify(error.toJSON()));
}


function testInvalidOriginError() {
  // HTTP origin.
  var error = new fireauth.InvalidOriginError('http://www.example.com');
  assertEquals('auth/unauthorized-domain', error['code']);
  assertEquals(
      'This domain (www.example.com) is not authorized to run this operation' +
      '. Add it to the OAuth redirect domains list in the Firebase console -' +
      '> Auth section -> Sign in method tab.',
      error['message']);
  // File origin.
  var error2 = new fireauth.InvalidOriginError('file://path/index.html');
  assertEquals(
      'auth/operation-not-supported-in-this-environment', error2['code']);
  assertEquals(
      'This operation is not supported in the environment this application i' +
      's running on. "location.protocol" must be http, https or chrome-exten' +
      'sion and web storage must be enabled.',
      error2['message']);
  // Test toJSON().
  assertObjectEquals({
    code: error['code'],
    message: error['message']
  }, error.toJSON());
  assertEquals(JSON.stringify(error), JSON.stringify(error.toJSON()));
  // Chrome extension origin.
  error3 = new fireauth.InvalidOriginError('chrome-extension://1234567890');
  assertEquals('auth/unauthorized-domain', error3['code']);
  assertEquals(
      'This chrome extension ID (chrome-extension://1234567890) is not autho' +
      'rized to run this operation. Add it to the OAuth redirect domains lis' +
      't in the Firebase console -> Auth section -> Sign in method tab.',
      error3['message']);
}


/**
 * The allowed characters in the error code, as per style guide.
 */
var ERROR_CODE_FORMAT = /^[a-z\-\/]+$/;


/**
 * Asserts that the error codes conform to the Firebase JS error format.
 * @param {!Object<string, string>} codes
 */
function assertErrorCodesHaveCorrectFormat(codes) {
  goog.object.forEach(codes, function(code) {
    var assertMessage = goog.string.format('Error code %s should only ' +
        'contain lower-case ASCII characters, forward slashes, and hyphens.',
        code);
    assertTrue(assertMessage, ERROR_CODE_FORMAT.test(code));
  });
}


function testAuthErrorCodeFormat() {
  assertErrorCodesHaveCorrectFormat(fireauth.authenum.Error);
}


function testAuthError_toPlainObject() {
  var authError = new fireauth.AuthError('error1', 'message1');
  var authErrorObject = {
    'code': 'auth/error1',
    'message': 'message1'
  };
  assertObjectEquals(
      authErrorObject,
      authError.toPlainObject());
}


function testInvalidOriginError_toPlainObject() {
  var invalidOriginError = new fireauth.InvalidOriginError(
      'http://www.example.com');
  var invalidOriginErrorObject = {
    'code': 'auth/unauthorized-domain',
    'message': invalidOriginError['message']
  };
  assertObjectEquals(
      invalidOriginErrorObject,
      invalidOriginError.toPlainObject());
}


function testAuthErrorWithCredential_toPlainObject() {
  var credential = fireauth.FacebookAuthProvider.credential('ACCESS_TOKEN');
  var error = new fireauth.AuthErrorWithCredential(
      fireauth.authenum.Error.NEED_CONFIRMATION,
      {
        email: 'user@example.com',
        credential: credential
      },
      'Account already exists, please confirm and link.');
  var errorObject = {
    'code': 'auth/account-exists-with-different-credential',
    'email': 'user@example.com',
    'message': 'Account already exists, please confirm and link.',
    'providerId': 'facebook.com',
    'oauthAccessToken': 'ACCESS_TOKEN',
    'signInMethod': fireauth.FacebookAuthProvider['FACEBOOK_SIGN_IN_METHOD']
  };
  assertObjectEquals(
      errorObject,
      error.toPlainObject());

  // Test with no credential and default message to be used.
  var error2 = new fireauth.AuthErrorWithCredential(
      fireauth.authenum.Error.NEED_CONFIRMATION,
      {
        email: 'user@example.com'
      },
      null);
  var errorObject2 = {
    'code': 'auth/account-exists-with-different-credential',
    'email': 'user@example.com',
    'message': 'An account already exists with the same email address but ' +
    'different sign-in credentials. Sign in using a provider associated wi' +
    'th this email address.'
  };
  assertObjectEquals(
      errorObject2,
      error2.toPlainObject());

  // Credential with ID Token.
  var credential3 = fireauth.GoogleAuthProvider.credential('ID_TOKEN');
  var error3 = new fireauth.AuthErrorWithCredential(
      fireauth.authenum.Error.EMAIL_EXISTS,
      {
        email: 'user@example.com',
        credential: credential3
      },
      'The email address is already in use by another account.');
  var errorObject3 = {
    'code': 'auth/email-already-in-use',
    'email': 'user@example.com',
    'message': 'The email address is already in use by another account.',
    'providerId': 'google.com',
    'oauthIdToken': 'ID_TOKEN',
    'signInMethod': fireauth.GoogleAuthProvider['GOOGLE_SIGN_IN_METHOD']
  };
  assertObjectEquals(
      errorObject3,
      error3.toPlainObject());

  // AuthErrorWithCredential with just a credential and no email or phoneNumber.
  var credential4 = fireauth.FacebookAuthProvider.credential('ACCESS_TOKEN');
  var error4 = new fireauth.AuthErrorWithCredential(
      fireauth.authenum.Error.CREDENTIAL_ALREADY_IN_USE,
      {
        credential: credential4
      },
      'This credential is already associated with a different user account.');
  var errorObject4 = {
    'code': 'auth/credential-already-in-use',
    'message': 'This credential is already associated with a different user ' +
        'account.',
    'providerId': 'facebook.com',
    'oauthAccessToken': 'ACCESS_TOKEN',
    'signInMethod': fireauth.FacebookAuthProvider['FACEBOOK_SIGN_IN_METHOD']
  };
  assertObjectEquals(
      errorObject4,
      error4.toPlainObject());

  // AuthErrorWithCredential with credential, email and tenant ID.
  var credential5 = fireauth.FacebookAuthProvider.credential('ACCESS_TOKEN');
  var error5 = new fireauth.AuthErrorWithCredential(
      fireauth.authenum.Error.CREDENTIAL_ALREADY_IN_USE,
      {
        email: 'user@example.com',
        credential: credential5,
        tenantId: 'TENANT_ID'
      },
      'This credential is already associated with a different user account.');
  var errorObject5 = {
    'code': 'auth/credential-already-in-use',
    'email': 'user@example.com',
    'message': 'This credential is already associated with a different user ' +
        'account.',
    'providerId': 'facebook.com',
    'oauthAccessToken': 'ACCESS_TOKEN',
    'signInMethod': fireauth.FacebookAuthProvider['FACEBOOK_SIGN_IN_METHOD'],
    'tenantId': 'TENANT_ID'
  };
  assertObjectEquals(
      errorObject5,
      error5.toPlainObject());
}


function testAuthErrorWithCredential_fromPlainObject() {
  var credential = fireauth.FacebookAuthProvider.credential('ACCESS_TOKEN');
  var error = new fireauth.AuthErrorWithCredential(
      fireauth.authenum.Error.NEED_CONFIRMATION,
      {
        email: 'user@example.com',
        credential: credential
      },
      'Account already exists, please confirm and link.');
  var errorObject = {
    'code': 'auth/account-exists-with-different-credential',
    'email': 'user@example.com',
    'message': 'Account already exists, please confirm and link.',
    'providerId': 'facebook.com',
    'oauthAccessToken': 'ACCESS_TOKEN'
  };
  var errorObject2 = {
    'email': 'user@example.com',
    'providerId': 'facebook.com',
    'oauthAccessToken': 'ACCESS_TOKEN'
  };
  var internalError = new fireauth.AuthError(
      fireauth.authenum.Error.INTERNAL_ERROR);
  var needConfirmationError = new fireauth.AuthError(
      fireauth.authenum.Error.NEED_CONFIRMATION);
  // Empty response will return an invalid error.
  assertNull(fireauth.AuthErrorWithCredential.fromPlainObject({}));
  // Response with no error code is invalid.
  assertNull(fireauth.AuthErrorWithCredential.fromPlainObject(errorObject2));
  // Regular error.
  assertObjectEquals(
      internalError,
      fireauth.AuthErrorWithCredential.fromPlainObject(
          {'code': 'auth/internal-error'}));
  // Confirmation error with no credential or email will return a regular error.
  assertObjectEquals(
      needConfirmationError,
      fireauth.AuthErrorWithCredential.fromPlainObject(
          {'code': 'auth/account-exists-with-different-credential'}));
  // Auth email credential error.
  assertObjectEquals(
      error,
      fireauth.AuthErrorWithCredential.fromPlainObject(errorObject));

  // Credential with ID token.
  var credential3 = fireauth.GoogleAuthProvider.credential('ID_TOKEN');
  var error3 = new fireauth.AuthErrorWithCredential(
      fireauth.authenum.Error.CREDENTIAL_ALREADY_IN_USE,
      {
        email: 'user@example.com',
        credential: credential3
      },
      'This credential is already associated with a different user account.');
  var errorObject3 = {
    'code': 'auth/credential-already-in-use',
    'email': 'user@example.com',
    'message': 'This credential is already associated with a different user ' +
    'account.',
    'providerId': 'google.com',
    'oauthIdToken': 'ID_TOKEN'
  };
  var errorObject3NoPrefix = {
    'code': 'credential-already-in-use',
    'email': 'user@example.com',
    'message': 'This credential is already associated with a different user ' +
    'account.',
    'providerId': 'google.com',
    'oauthIdToken': 'ID_TOKEN'
  };
  assertObjectEquals(
      error3,
      fireauth.AuthErrorWithCredential.fromPlainObject(errorObject3));
  // If the error code prefix is missing.
  assertObjectEquals(
      error3,
      fireauth.AuthErrorWithCredential.fromPlainObject(errorObject3NoPrefix));

  // AuthErrorWithCredential with just a credential
  var credential4 = fireauth.FacebookAuthProvider.credential('ACCESS_TOKEN');
  var error4 = new fireauth.AuthErrorWithCredential(
      fireauth.authenum.Error.CREDENTIAL_ALREADY_IN_USE,
      {
        credential: credential4
      },
      'This credential is already associated with a different user account.');
  var errorObject4 = {
    'code': 'auth/credential-already-in-use',
    'message': 'This credential is already associated with a different user ' +
        'account.',
    'providerId': 'facebook.com',
    'oauthAccessToken': 'ACCESS_TOKEN'
  };
  var errorObject4NoPrefix = {
    'code': 'credential-already-in-use',
    'message': 'This credential is already associated with a different user ' +
        'account.',
    'providerId': 'facebook.com',
    'oauthAccessToken': 'ACCESS_TOKEN'
  };
  assertObjectEquals(
      error4,
      fireauth.AuthErrorWithCredential.fromPlainObject(errorObject4));
  // If the error code prefix is missing.
  assertObjectEquals(
      error4,
      fireauth.AuthErrorWithCredential.fromPlainObject(errorObject4NoPrefix));

  // AuthErrorWithCredential with credential, email and tenant ID.
  var credential5 = fireauth.FacebookAuthProvider.credential('ACCESS_TOKEN');
  var error5 = new fireauth.AuthErrorWithCredential(
      fireauth.authenum.Error.CREDENTIAL_ALREADY_IN_USE,
      {
        email: 'user@example.com',
        credential: credential5,
        tenantId: 'TENANT_ID'
      },
      'This credential is already associated with a different user account.');
  var errorObject5 = {
    'code': 'auth/credential-already-in-use',
    'email': 'user@example.com',
    'message': 'This credential is already associated with a different user ' +
        'account.',
    'providerId': 'facebook.com',
    'oauthAccessToken': 'ACCESS_TOKEN',
    'tenantId': 'TENANT_ID'
  };
  var errorObject5NoPrefix = {
    'code': 'credential-already-in-use',
    'email': 'user@example.com',
    'message': 'This credential is already associated with a different user ' +
        'account.',
    'providerId': 'facebook.com',
    'oauthAccessToken': 'ACCESS_TOKEN',
    'tenantId': 'TENANT_ID'
  };
  assertObjectEquals(
      error5,
      fireauth.AuthErrorWithCredential.fromPlainObject(errorObject5));
  // If the error code prefix is missing.
  assertObjectEquals(
      error5,
      fireauth.AuthErrorWithCredential.fromPlainObject(errorObject5NoPrefix));
}


function testAuthErrorWithCredential_oauthCredential_idTokenNonce() {
  var email = 'user@example.com';
  var credential = fireauth.AuthProvider.getCredentialFromResponse({
    // Subset of server response.
    'oauthIdToken': 'OIDC_ID_TOKEN',
    'providerId': 'oidc.provider',
    // Injected by rpcHandler.
    'nonce': 'NONCE'
  });
  var error = new fireauth.AuthErrorWithCredential(
      fireauth.authenum.Error.CREDENTIAL_ALREADY_IN_USE,
      {
        email: email,
        credential: credential
      });

  assertEquals('auth/credential-already-in-use', error['code']);
  assertEquals(email, error['email']);
  assertEquals(credential, error['credential']);

  var errorObject = {
    'code': 'auth/credential-already-in-use',
    'email': email,
    'oauthIdToken': 'OIDC_ID_TOKEN',
    'providerId': 'oidc.provider',
    'nonce': 'NONCE'
  };
  assertObjectEquals(
      error,
      fireauth.AuthErrorWithCredential.fromPlainObject(errorObject));
}


function testAuthErrorWithCredential_oauthCredential_pendingToken() {
  var email = 'user@example.com';
  var credential = fireauth.AuthProvider.getCredentialFromResponse({
    // Subset of server response.
    'oauthIdToken': 'OIDC_ID_TOKEN',
    'pendingToken': 'PENDING_TOKEN',
    'providerId': 'oidc.provider'
  });
  var error = new fireauth.AuthErrorWithCredential(
      fireauth.authenum.Error.CREDENTIAL_ALREADY_IN_USE,
      {
        email: email,
        credential: credential
      });

  assertEquals('auth/credential-already-in-use', error['code']);
  assertEquals(email, error['email']);
  assertEquals(credential, error['credential']);

  var errorObject = {
    'code': 'auth/credential-already-in-use',
    'email': email,
    'oauthIdToken': 'OIDC_ID_TOKEN',
    'pendingToken': 'PENDING_TOKEN',
    'providerId': 'oidc.provider'
  };
  assertObjectEquals(
      error,
      fireauth.AuthErrorWithCredential.fromPlainObject(errorObject));
}


function testAuthErrorWithCredential_phoneCredential() {
  var temporaryProof = 'theTempProof';
  var phoneNumber = '+16505550101';
  var credential = fireauth.AuthProvider.getCredentialFromResponse({
    'temporaryProof': temporaryProof,
    'phoneNumber': phoneNumber
  });
  var error = new fireauth.AuthErrorWithCredential(
      fireauth.authenum.Error.CREDENTIAL_ALREADY_IN_USE,
      {
        phoneNumber: phoneNumber,
        credential: credential
      });

  assertEquals(phoneNumber, error['phoneNumber']);
  assertEquals(credential, error['credential']);
  assertUndefined(error['email']);
}


function testAuthErrorWithCredential_phoneCredential_fromPlainObject() {
  var temporaryProof = 'theTempProof';
  var phoneNumber = '+16505550101';
  var credential = fireauth.AuthProvider.getCredentialFromResponse({
    'temporaryProof': temporaryProof,
    'phoneNumber': phoneNumber
  });
  var error = new fireauth.AuthErrorWithCredential(
      fireauth.authenum.Error.CREDENTIAL_ALREADY_IN_USE,
      {
        phoneNumber: phoneNumber,
        credential: credential
      });
  var errorObject = {
    'code': 'auth/credential-already-in-use',
    'temporaryProof': temporaryProof,
    'phoneNumber': phoneNumber
  };
  assertObjectEquals(
      error,
      fireauth.AuthErrorWithCredential.fromPlainObject(errorObject));
}


function testAuthErrorWithCredential_phoneCredential_toPlainObject() {
  var temporaryProof = 'theTempProof';
  var phoneNumber = '+16505550101';
  var credential = fireauth.AuthProvider.getCredentialFromResponse({
    'temporaryProof': temporaryProof,
    'phoneNumber': phoneNumber
  });
  var error = new fireauth.AuthErrorWithCredential(
      fireauth.authenum.Error.CREDENTIAL_ALREADY_IN_USE,
      {
        phoneNumber: phoneNumber,
        credential: credential
      });
  var errorObject = {
    'code': 'auth/credential-already-in-use',
    'message': 'This credential is already associated with a different user ' +
        'account.',
    'temporaryProof': temporaryProof,
    'phoneNumber': phoneNumber,
    'providerId': 'phone'
  };
  assertObjectEquals(
      errorObject,
      error.toPlainObject());
}

