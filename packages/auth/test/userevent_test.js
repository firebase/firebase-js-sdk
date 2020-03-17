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
 * @fileoverview Tests for userevent.js
 */

goog.provide('fireauth.UserEventTest');

goog.require('fireauth.UserEvent');
goog.require('fireauth.UserEventType');
goog.require('goog.testing.jsunit');

goog.setTestOnly('fireauth.UserEventTest');


function testUserEvent() {
  var props = {
    a: 'foo',
    b: true,
    c: -1.5,
    d: {
      e: 'bar'
    }
  };
  var event = new fireauth.UserEvent(
      fireauth.UserEventType.TOKEN_CHANGED,
      props);
  assertEquals(fireauth.UserEventType.TOKEN_CHANGED, event.type);
  for (var key in props) {
    assertEquals(props[key], event[key]);
  }
}
