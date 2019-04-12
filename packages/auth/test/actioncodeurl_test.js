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
 * @fileoverview Tests for actioncodeurl.js.
 */

goog.provide('fireauth.ActionCodeUrlTest');

goog.require('fireauth.ActionCodeUrl');
goog.require('goog.testing.jsunit');

goog.setTestOnly();


function testActionCodeUrl_success() {
  var url = 'https://www.example.com/finishSignIn?' +
            'oobCode=CODE&mode=signIn&apiKey=API_KEY&state=bla';
  var actionCodeUrl = new fireauth.ActionCodeUrl(url);
  assertEquals('signIn', actionCodeUrl.getMode());
  assertEquals('CODE', actionCodeUrl.getCode());
  assertEquals('API_KEY', actionCodeUrl.getApiKey());
}


function testActionCodeUrl_success_portNumberInUrl() {
  var url = 'https://www.example.com:8080/finishSignIn?' +
            'oobCode=CODE&mode=signIn&apiKey=API_KEY&state=bla';
  var actionCodeUrl = new fireauth.ActionCodeUrl(url);
  assertEquals('signIn', actionCodeUrl.getMode());
  assertEquals('CODE', actionCodeUrl.getCode());
  assertEquals('API_KEY', actionCodeUrl.getApiKey());
}


function testActionCodeUrl_success_hashParameters() {
  var url = 'https://www.example.com/finishSignIn?' +
            'oobCode=CODE1&mode=signIn&apiKey=API_KEY1&state=bla' +
            '#oobCode=CODE2&mode=signIn&apiKey=API_KEY2&state=bla';
  var actionCodeUrl = new fireauth.ActionCodeUrl(url);
  assertEquals('signIn', actionCodeUrl.getMode());
  assertEquals('CODE1', actionCodeUrl.getCode());
  assertEquals('API_KEY1', actionCodeUrl.getApiKey());
}


function testActionCodeUrl_emptyParameter() {
  var url = 'https://www.example.com/finishSignIn';
  var actionCodeUrl = new fireauth.ActionCodeUrl(url);
  assertNull(actionCodeUrl.getMode());
  assertNull(actionCodeUrl.getCode());
  assertNull(actionCodeUrl.getApiKey());
}
