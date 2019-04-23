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
 * @fileoverview Tests for authevent.js
 */

goog.provide('fireauth.AuthEventTest');

goog.require('fireauth.AuthError');
goog.require('fireauth.AuthEvent');
goog.require('fireauth.authenum.Error');
goog.require('goog.testing.jsunit');

goog.setTestOnly('fireauth.AuthEventTest');


var authEvent;
var authEvent2;
var authEventObject;
var authEventObject2;
var popupType = [
  fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP,
  fireauth.AuthEvent.Type.LINK_VIA_POPUP,
  fireauth.AuthEvent.Type.REAUTH_VIA_POPUP
];
var redirectType = [
  fireauth.AuthEvent.Type.SIGN_IN_VIA_REDIRECT,
  fireauth.AuthEvent.Type.LINK_VIA_REDIRECT,
  fireauth.AuthEvent.Type.REAUTH_VIA_REDIRECT
];


function setUp() {
  authEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP,
      null,
      'http://www.example.com/#oauthResponse',
      'SESSION_ID',
      null,
      'POST_BODY');
  authEvent2 = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.SIGN_IN_VIA_REDIRECT,
      '12345678',
      null,
      null,
      new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR));
  authEventObject = {
    'type': 'signInViaPopup',
    'eventId': null,
    'urlResponse': 'http://www.example.com/#oauthResponse',
    'sessionId': 'SESSION_ID',
    'error': null,
    'postBody': 'POST_BODY'
  };
  authEventObject2 = {
    'type': 'signInViaRedirect',
    'eventId': '12345678',
    'urlResponse': null,
    'sessionId': null,
    'error': {
      'code': fireauth.AuthError.ERROR_CODE_PREFIX +
          fireauth.authenum.Error.INTERNAL_ERROR,
      'message': 'An internal error has occurred.'
    },
    'postBody': null
  };
}


function tearDown() {
  authEvent = null;
  authEvent2 = null;
  authEventObject = null;
  authEventObject2 = null;
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


function testAuthEvent_isRedirect() {
  // Popup types should return false.
  for (var i = 0; i < popupType.length; i++) {
    assertFalse(fireauth.AuthEvent.isRedirect(
        new fireauth.AuthEvent(
            popupType[i],
            null,
            'http://www.example.com/#oauthResponse',
            'SESSION_ID')));
  }
  // Unknown event type should return false.
  assertFalse(fireauth.AuthEvent.isRedirect(
      new fireauth.AuthEvent(
          fireauth.AuthEvent.Type.UNKNOWN,
          null,
          null,
          null,
          new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR))));
  // verifyApp event type should return false.
  assertFalse(fireauth.AuthEvent.isRedirect(
      new fireauth.AuthEvent(
          fireauth.AuthEvent.Type.VERIFY_APP,
          null,
          'http://www.example.com/#oauthResponse',
          'blank')));
  // Redirect types should return true.
  for (var i = 0; i < redirectType.length; i++) {
    assertTrue(fireauth.AuthEvent.isRedirect(
        new fireauth.AuthEvent(
            redirectType[i],
            null,
            'http://www.example.com/#oauthResponse',
            'SESSION_ID')));
  }
}


function testAuthEvent_isPopup() {
  // Popup types should return true.
  for (var i = 0; i < popupType.length; i++) {
    assertTrue(fireauth.AuthEvent.isPopup(
        new fireauth.AuthEvent(
            popupType[i],
            null,
            'http://www.example.com/#oauthResponse',
            'SESSION_ID')));
  }
  // Unknown event type should return false.
  assertFalse(fireauth.AuthEvent.isPopup(
      new fireauth.AuthEvent(
          fireauth.AuthEvent.Type.UNKNOWN,
          null,
          null,
          null,
          new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR))));
  // verifyApp event type should return false.
  assertFalse(fireauth.AuthEvent.isPopup(
      new fireauth.AuthEvent(
          fireauth.AuthEvent.Type.VERIFY_APP,
          null,
          'http://www.example.com/#oauthResponse',
          'blank')));
  // Redirect types should return false.
  for (var i = 0; i < redirectType.length; i++) {
    assertFalse(fireauth.AuthEvent.isPopup(
        new fireauth.AuthEvent(
            redirectType[i],
            null,
            'http://www.example.com/#oauthResponse',
            'SESSION_ID')));
  }
}


function testAuthEvent_error() {
  try {
    new fireauth.AuthEvent(
        fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP);
    fail('Auth event requires either an error or a URL response.');
  } catch(error) {
    assertErrorEquals(
        new fireauth.AuthError(fireauth.authenum.Error.INVALID_AUTH_EVENT),
        error);
  }
  try {
    new fireauth.AuthEvent(
        fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP,
        '12345678',
        'http://www.example.com/#oauthResponse',
        'SESSION_ID',
        new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR));
    fail('Auth event cannot have a URL response and an error.');
  } catch(error) {
    assertErrorEquals(
        new fireauth.AuthError(fireauth.authenum.Error.INVALID_AUTH_EVENT),
        error);
  }
  try {
    new fireauth.AuthEvent(
        fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP,
        null,
        'http://www.example.com/#oauthResponse');
    fail('Auth event cannot have a URL response without a session ID.');
  } catch(error) {
    assertErrorEquals(
        new fireauth.AuthError(fireauth.authenum.Error.INVALID_AUTH_EVENT),
        error);
  }
}


function testAuthEvent() {
  var unknownEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.UNKNOWN,
      null,
      null,
      null,
      new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR));
  assertEquals('unknown', unknownEvent.getUid());

  assertEquals(
      fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP,
      authEvent.getType());
  assertEquals(
      'http://www.example.com/#oauthResponse', authEvent.getUrlResponse());
  assertEquals(
      'SESSION_ID', authEvent.getSessionId());
  assertEquals('POST_BODY', authEvent.getPostBody());
  assertNull(authEvent.getEventId());
  assertNull(authEvent.getError());
  assertFalse(authEvent.hasError());
  assertEquals('signInViaPopup-SESSION_ID', authEvent.getUid());

  assertEquals(
      fireauth.AuthEvent.Type.SIGN_IN_VIA_REDIRECT,
      authEvent2.getType());
  assertEquals('12345678', authEvent2.getEventId());
  assertErrorEquals(
      new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR),
      authEvent2.getError());
  assertTrue(authEvent2.hasError());
  assertNull(authEvent2.getPostBody());
  assertEquals('signInViaRedirect-12345678', authEvent2.getUid());
}


function testAuthEvent_toPlainObject() {
  assertObjectEquals(
      authEventObject,
      authEvent.toPlainObject());
  assertObjectEquals(
      authEventObject2,
      authEvent2.toPlainObject());
}


function testAuthEvent_fromPlainObject() {
  assertObjectEquals(
      authEvent,
      fireauth.AuthEvent.fromPlainObject(authEventObject));
  assertObjectEquals(
      authEvent2,
      fireauth.AuthEvent.fromPlainObject(authEventObject2));
  assertNull(fireauth.AuthEvent.fromPlainObject({}));
}
