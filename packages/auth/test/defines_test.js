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
 * @fileoverview Tests for defines.js.
 */

goog.provide('fireauth.constantsTest');

goog.require('fireauth.constants');
goog.require('goog.testing.jsunit');

goog.setTestOnly('fireauth.constantsTest');


function testGetEndpointConfig() {
  var productionEndpoint = fireauth.constants.Endpoint.PRODUCTION;
  var stagingEndpoint = fireauth.constants.Endpoint.STAGING;
  var testEndpoint = fireauth.constants.Endpoint.TEST;
  assertObjectEquals(
      {
        'firebaseEndpoint': productionEndpoint.firebaseAuthEndpoint,
        'secureTokenEndpoint': productionEndpoint.secureTokenEndpoint
      },
      fireauth.constants.getEndpointConfig(
          fireauth.constants.Endpoint.PRODUCTION.id));
  assertObjectEquals(
      {
        'firebaseEndpoint': stagingEndpoint.firebaseAuthEndpoint,
        'secureTokenEndpoint': stagingEndpoint.secureTokenEndpoint
      },
      fireauth.constants.getEndpointConfig(
          fireauth.constants.Endpoint.STAGING.id));
  assertObjectEquals(
      {
        'firebaseEndpoint': testEndpoint.firebaseAuthEndpoint,
        'secureTokenEndpoint': testEndpoint.secureTokenEndpoint
      },
      fireauth.constants.getEndpointConfig(
          fireauth.constants.Endpoint.TEST.id));
  assertNull(fireauth.constants.getEndpointConfig());
  assertNull(fireauth.constants.getEndpointConfig(null));
  assertNull(fireauth.constants.getEndpointConfig(undefined));
  assertNull(fireauth.constants.getEndpointConfig('invalid'));
}


function testGetEndpointId() {
  assertEquals(
      fireauth.constants.Endpoint.PRODUCTION.id,
      fireauth.constants.getEndpointId(
          fireauth.constants.Endpoint.PRODUCTION.id));
  assertEquals(
      fireauth.constants.Endpoint.STAGING.id,
      fireauth.constants.getEndpointId(
          fireauth.constants.Endpoint.STAGING.id));
  assertEquals(
      fireauth.constants.Endpoint.TEST.id,
      fireauth.constants.getEndpointId(
          fireauth.constants.Endpoint.TEST.id));
  assertUndefined(fireauth.constants.getEndpointId());
  assertUndefined(fireauth.constants.getEndpointId(null));
  assertUndefined(fireauth.constants.getEndpointId(undefined));
  assertUndefined(fireauth.constants.getEndpointId('invalid'));
}
