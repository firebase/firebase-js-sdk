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
 * @fileoverview Tests for oauthhelperstate.js
 */

goog.provide('fireauth.OAuthHelperStateTest');

goog.require('fireauth.AuthEvent');
goog.require('fireauth.OAuthHelperState');
goog.require('goog.testing.jsunit');

goog.setTestOnly('fireauth.OAuthHelperStateTest');


var state;
var state2;
var state3;
var state4;
var state5;
var state6;
var stateObject;
var stateObject2;
var stateObject3;
var stateObject4;
var stateObject5;
var stateObject6;


function setUp() {
  state = new fireauth.OAuthHelperState(
      'API_KEY',
      'APP_NAME',
      fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP,
      null,
      'http://www.example.com/redirect',
      '3.0.0');
  state2 = new fireauth.OAuthHelperState(
      'API_KEY',
      'APP_NAME',
      fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP,
      '12345678');
  state3 = new fireauth.OAuthHelperState(
      'API_KEY',
      'APP_NAME',
      fireauth.AuthEvent.Type.SIGN_IN_VIA_REDIRECT,
      '12345678',
      null,
      '3.6.0',
      'Test App',
      'com.example.android',
      null,
      't',
      ['firebaseui', 'angularfire']);
  state4 = new fireauth.OAuthHelperState(
      'API_KEY',
      'APP_NAME',
      fireauth.AuthEvent.Type.SIGN_IN_VIA_REDIRECT,
      '12345678',
      null,
      '3.6.0',
      'Test App',
      null,
      'com.example.ios',
      's');
  // State with OAuth client ID.
  state5 = new fireauth.OAuthHelperState(
      'API_KEY',
      'APP_NAME',
      fireauth.AuthEvent.Type.SIGN_IN_VIA_REDIRECT,
      '12345678',
      null,
      '3.6.0',
      'Test App',
      null,
      'com.example.ios',
      null,
      null,
      '123456.apps.googleusercontent.com');
  // State with SHA-1 cert.
  state6 = new fireauth.OAuthHelperState(
      'API_KEY',
      'APP_NAME',
      fireauth.AuthEvent.Type.SIGN_IN_VIA_REDIRECT,
      '12345678',
      null,
      '3.6.0',
      'Test App',
      'com.example.android',
      null,
      null,
      null,
      null,
      'SHA_1_ANDROID_CERT');
  stateObject = {
    'apiKey': 'API_KEY',
    'appName': 'APP_NAME',
    'type': fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP,
    'redirectUrl': 'http://www.example.com/redirect',
    'eventId': null,
    'clientVersion': '3.0.0',
    'displayName': null,
    'apn': null,
    'ibi': null,
    'eid': null,
    'fw': [],
    'clientId': null,
    'sha1Cert': null
  };
  stateObject2 = {
    'apiKey': 'API_KEY',
    'appName': 'APP_NAME',
    'type': fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP,
    'redirectUrl': null,
    'eventId': '12345678',
    'clientVersion': null,
    'displayName': null,
    'apn': null,
    'ibi': null,
    'eid': null,
    'fw': [],
    'clientId': null,
    'sha1Cert': null
  };
  stateObject3 = {
    'apiKey': 'API_KEY',
    'appName': 'APP_NAME',
    'type': fireauth.AuthEvent.Type.SIGN_IN_VIA_REDIRECT,
    'redirectUrl': null,
    'eventId': '12345678',
    'clientVersion': '3.6.0',
    'displayName': 'Test App',
    'apn': 'com.example.android',
    'ibi': null,
    'eid': 't',
    'fw': ['firebaseui', 'angularfire'],
    'clientId': null,
    'sha1Cert': null
  };
  stateObject4 = {
    'apiKey': 'API_KEY',
    'appName': 'APP_NAME',
    'type': fireauth.AuthEvent.Type.SIGN_IN_VIA_REDIRECT,
    'redirectUrl': null,
    'eventId': '12345678',
    'clientVersion': '3.6.0',
    'displayName': 'Test App',
    'apn': null,
    'ibi': 'com.example.ios',
    'eid': 's',
    'fw': [],
    'clientId': null,
    'sha1Cert': null
  };
  stateObject5 = {
    'apiKey': 'API_KEY',
    'appName': 'APP_NAME',
    'type': fireauth.AuthEvent.Type.SIGN_IN_VIA_REDIRECT,
    'redirectUrl': null,
    'eventId': '12345678',
    'clientVersion': '3.6.0',
    'displayName': 'Test App',
    'apn': null,
    'ibi': 'com.example.ios',
    'eid': null,
    'fw': [],
    'clientId': '123456.apps.googleusercontent.com',
    'sha1Cert': null
  };
  stateObject6 = {
    'apiKey': 'API_KEY',
    'appName': 'APP_NAME',
    'type': fireauth.AuthEvent.Type.SIGN_IN_VIA_REDIRECT,
    'redirectUrl': null,
    'eventId': '12345678',
    'clientVersion': '3.6.0',
    'displayName': 'Test App',
    'apn': 'com.example.android',
    'ibi': null,
    'eid': null,
    'fw': [],
    'clientId': null,
    'sha1Cert': 'SHA_1_ANDROID_CERT'
  };
}


function tearDown() {
  state = null;
  state2 = null;
  state3 = null;
  state4 = null;
  state5 = null;
  state6 = null;
  stateObject = null;
  stateObject2 = null;
  stateObject3 = null;
  stateObject4 = null;
  stateObject5 = null;
  stateObject6 = null;
}


function testOAuthHelperState() {
  // Check state.
  assertEquals('API_KEY', state.getApiKey());
  assertEquals('APP_NAME', state.getAppName());
  assertEquals(fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP, state.getType());
  assertEquals('http://www.example.com/redirect', state.getRedirectUrl());
  assertEquals('3.0.0', state.getClientVersion());
  assertNull(state.getEventId());
  assertNull(state.getDisplayName());
  assertNull(state.getApn());
  assertNull(state.getIbi());
  assertNull(state.getEndpointId());
  assertArrayEquals([], state.getFrameworks());
  assertNull(state.getClientId());
  assertNull(state.getSha1Cert());
  // Check state2.
  assertEquals('12345678', state2.getEventId());
  assertNull(state2.getClientVersion());
  assertNull(state2.getRedirectUrl());
  assertNull(state2.getDisplayName());
  assertNull(state2.getApn());
  assertNull(state2.getIbi());
  assertNull(state2.getEndpointId());
  assertArrayEquals([], state2.getFrameworks());
  assertNull(state2.getClientId());
  assertNull(state2.getSha1Cert());
  // Check state3.
  assertEquals(state3.getDisplayName(), 'Test App');
  assertEquals(state3.getApn(), 'com.example.android');
  assertNull(state3.getIbi());
  assertEquals('t', state3.getEndpointId());
  assertArrayEquals(['firebaseui', 'angularfire'], state3.getFrameworks());
  assertNull(state3.getClientId());
  assertNull(state3.getSha1Cert());
  // Check state4.
  assertEquals(state4.getDisplayName(), 'Test App');
  assertNull(state4.getApn());
  assertEquals(state4.getIbi(), 'com.example.ios');
  assertEquals('s', state4.getEndpointId());
  assertArrayEquals([], state4.getFrameworks());
  assertNull(state4.getClientId());
  assertNull(state4.getSha1Cert());
  // Check state5.
  assertNull(state4.getApn());
  assertEquals(state4.getIbi(), 'com.example.ios');
  assertNull(state2.getEndpointId());
  assertArrayEquals([], state4.getFrameworks());
  assertEquals('123456.apps.googleusercontent.com', state5.getClientId());
  assertNull(state5.getSha1Cert());
  // Check state6.
  assertEquals(state3.getApn(), 'com.example.android');
  assertNull(state3.getIbi());
  assertNull(state2.getEndpointId());
  assertArrayEquals([], state4.getFrameworks());
  assertNull(state6.getClientId());
  assertEquals('SHA_1_ANDROID_CERT', state6.getSha1Cert());
}


function testOAuthHelperState_toPlainObject() {
  assertObjectEquals(
      stateObject,
      state.toPlainObject());
  assertObjectEquals(
      stateObject2,
      state2.toPlainObject());
  assertObjectEquals(
      stateObject3,
      state3.toPlainObject());
  assertObjectEquals(
      stateObject4,
      state4.toPlainObject());
  assertObjectEquals(
      stateObject5,
      state5.toPlainObject());
  assertObjectEquals(
      stateObject6,
      state6.toPlainObject());
}


function testOAuthHelperState_fromPlainObject() {
  assertObjectEquals(
      state,
      fireauth.OAuthHelperState.fromPlainObject(stateObject));
  assertObjectEquals(
      state2,
      fireauth.OAuthHelperState.fromPlainObject(stateObject2));
  assertObjectEquals(
      state3,
      fireauth.OAuthHelperState.fromPlainObject(stateObject3));
  assertObjectEquals(
      state4,
      fireauth.OAuthHelperState.fromPlainObject(stateObject4));
  assertObjectEquals(
      state5,
      fireauth.OAuthHelperState.fromPlainObject(stateObject5));
  assertObjectEquals(
      state6,
      fireauth.OAuthHelperState.fromPlainObject(stateObject6));
  assertNull(fireauth.OAuthHelperState.fromPlainObject({}));
}
