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
 * @fileoverview Tests for idp.js
 */

goog.provide('fireauth.idpTest');

goog.require('fireauth.idp');
goog.require('goog.testing.jsunit');

goog.setTestOnly('fireauth.idpTest');


function testGetIdpSetting_unknown() {
  var settings = fireauth.idp.getIdpSettings('unknown');
  assertNull(settings);
  assertArrayEquals(
      [],
      fireauth.idp.getReservedOAuthParams('unknown'));
  settings = fireauth.idp.getIdpSettings('password');
  assertArrayEquals(
      [],
      fireauth.idp.getReservedOAuthParams('password'));
  assertNull(settings);
  assertArrayEquals(
      [],
      fireauth.idp.getReservedOAuthParams('anonymous'));
}


function testGetIdpSetting_google() {
  var settings = fireauth.idp.getIdpSettings('google.com');
  assertObjectEquals(fireauth.idp.Settings.GOOGLE, settings);
  assertArrayEquals(
      ['client_id', 'response_type', 'scope', 'redirect_uri', 'state'],
      fireauth.idp.getReservedOAuthParams('google.com'));
}


function testGetIdpSetting_facebook() {
  var settings = fireauth.idp.getIdpSettings('facebook.com');
  assertObjectEquals(fireauth.idp.Settings.FACEBOOK, settings);
  assertArrayEquals(
      ['client_id', 'response_type', 'scope', 'redirect_uri', 'state'],
      fireauth.idp.getReservedOAuthParams('facebook.com'));
}


function testGetIdpSetting_github() {
  var settings = fireauth.idp.getIdpSettings('github.com');
  assertObjectEquals(fireauth.idp.Settings.GITHUB, settings);
  assertArrayEquals(
      ['client_id', 'response_type', 'scope', 'redirect_uri', 'state'],
      fireauth.idp.getReservedOAuthParams('github.com'));
}


function testGetIdpSetting_twitter() {
  var settings = fireauth.idp.getIdpSettings('twitter.com');
  assertObjectEquals(fireauth.idp.Settings.TWITTER, settings);
  assertArrayEquals(
      ['oauth_consumer_key', 'oauth_nonce', 'oauth_signature',
       'oauth_signature_method', 'oauth_timestamp', 'oauth_token',
       'oauth_version'],
      fireauth.idp.getReservedOAuthParams('twitter.com'));
}


function testIsSaml() {
  assertTrue(fireauth.idp.isSaml('saml.provider'));
  assertTrue(fireauth.idp.isSaml('saml.'));
  assertFalse(fireauth.idp.isSaml('saMl.provider'));
  assertFalse(fireauth.idp.isSaml(null));
  assertFalse(fireauth.idp.isSaml(undefined));
  for (var key in fireauth.idp.ProviderId) {
    assertFalse(fireauth.idp.isSaml(fireauth.idp.ProviderId[key]));
  }
  assertFalse(fireauth.idp.isSaml('generic.com'));
  assertFalse(fireauth.idp.isSaml('asaml.b'));
}
