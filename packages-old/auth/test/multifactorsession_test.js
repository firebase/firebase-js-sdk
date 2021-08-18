/**
 * @license
 * Copyright 2019 Google Inc.
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
 * @fileoverview Tests for multifactorsession.js
 */

goog.provide('fireauth.MultiFactorSessionTest');

goog.require('fireauth.AuthError');
goog.require('fireauth.MultiFactorSession');
goog.require('fireauth.authenum.Error');
goog.require('fireauth.common.testHelper');
goog.require('goog.testing.jsunit');

goog.setTestOnly('fireauth.MultiFactorSessionTest');


var jwt = fireauth.common.testHelper.createMockJwt();
var pendingCredential = 'MFA_PENDING_CREDENTIAL';


function testMultiFactorSession_idToken() {
  var session = new fireauth.MultiFactorSession(jwt);

  assertEquals(
      session.type, fireauth.MultiFactorSession.Type.ENROLL);
  assertObjectEquals(
      {
        'multiFactorSession': {
          'idToken': jwt
        }
      },
      session.toPlainObject());
  return session.getRawSession()
      .then(function(rawSession) {
        assertEquals(jwt, rawSession);
      });
}


function testMultiFactorSession_pendingCredential() {
  var session = new fireauth.MultiFactorSession(null, pendingCredential);

  assertEquals(
      session.type, fireauth.MultiFactorSession.Type.SIGN_IN);
  assertObjectEquals(
      {
        'multiFactorSession': {
          'pendingCredential': pendingCredential
        }
      },
      session.toPlainObject());
  return session.getRawSession()
      .then(function(rawSession) {
        assertEquals(pendingCredential, rawSession);
      });
}


function testMultiFactorSession_missingRawSession() {
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INTERNAL_ERROR,
      'Internal assert: no raw session string available');

  var error = assertThrows(function() {
    return new fireauth.MultiFactorSession(null, null);
  });

  fireauth.common.testHelper.assertErrorEquals(
      expectedError,
      error);
}


function testMultiFactorSession_undeterminedSessionType() {
  var expectedError = new fireauth.AuthError(
      fireauth.authenum.Error.INTERNAL_ERROR,
      'Internal assert: unable to determine the session type');

  var error = assertThrows(function() {
    return new fireauth.MultiFactorSession(jwt, pendingCredential);
  });

  fireauth.common.testHelper.assertErrorEquals(
      expectedError,
      error);
}


function testMultiFactorSession_fromPlainObject_valid() {
  var enrollSession = new fireauth.MultiFactorSession(jwt, null);
  var signInSession = new fireauth.MultiFactorSession(null, pendingCredential);
  var enrollSessionObject = {
    'multiFactorSession': {
      'idToken': jwt
    }
  };
  var signInSessionObject = {
    'multiFactorSession': {
      'pendingCredential': pendingCredential
    }
  };

  assertObjectEquals(
      enrollSession,
      fireauth.MultiFactorSession.fromPlainObject(enrollSessionObject));
  assertObjectEquals(
      signInSession,
      fireauth.MultiFactorSession.fromPlainObject(signInSessionObject));
}


function testMultiFactorSession_fromPlainObject_invalid() {
  assertNull(
      fireauth.MultiFactorSession.fromPlainObject(null));
  assertNull(
      fireauth.MultiFactorSession.fromPlainObject({}));
  assertNull(
      fireauth.MultiFactorSession.fromPlainObject({
        'idToken': jwt
      }));
  assertNull(
      fireauth.MultiFactorSession.fromPlainObject({
        'pendingCredential': pendingCredential
      }));
  assertNull(
      fireauth.MultiFactorSession.fromPlainObject({
        'multiFactorSession': {}
      }));
  assertNull(
      fireauth.MultiFactorSession.fromPlainObject({
        'multiFactorSession': {
          'idToken': ''
        }
      }));
  assertNull(
      fireauth.MultiFactorSession.fromPlainObject({
        'multiFactorSession': {
          'pendingCredential': ''
        }
      }));
}
