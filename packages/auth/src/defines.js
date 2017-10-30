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
 * @fileoverview Defines all common constants and enums used by firebase-auth.
 */

goog.provide('fireauth.constants');
goog.provide('fireauth.constants.AuthEventType');


/**
 * Enums for authentication operation types.
 * @enum {string}
 */
fireauth.constants.OperationType = {
  LINK: 'link',
  REAUTHENTICATE: 'reauthenticate',
  SIGN_IN: 'signIn'
};


/**
 * Events dispatched firebase.auth.Auth.
 * @enum {string}
 */
fireauth.constants.AuthEventType = {
  /** Dispatched when Firebase framework is changed. */
  FRAMEWORK_CHANGED: 'frameworkChanged',
  /** Dispatched when language code is changed. */
  LANGUAGE_CODE_CHANGED: 'languageCodeChanged'
};


/**
 * The settings of an Auth endpoint. The fields are:
 * <ul>
 * <li>firebaseAuthEndpoint: defines the Firebase Auth backend endpoint for
 *     specified endpoint type.</li>
 * <li>secureTokenEndpoint: defines the secure token backend endpoint for
 *     specified endpoint type.</li>
 * <li>id: defines the endpoint identifier.</li>
 * </ul>
 * @typedef {{
 *   firebaseAuthEndpoint: string,
 *   secureTokenEndpoint: string,
 *   id: string
 * }}
 */
fireauth.constants.EndpointSettings;


/**
 * The different endpoints for Firebase Auth backend.
 * @enum {!fireauth.constants.EndpointSettings}
 */
fireauth.constants.Endpoint = {
  PRODUCTION: {
    firebaseAuthEndpoint: 'https://www.googleapis.com/identitytoolkit/v3/' +
        'relyingparty/',
    secureTokenEndpoint: 'https://securetoken.googleapis.com/v1/token',
    id: 'p'
  },
  STAGING: {
    firebaseAuthEndpoint: 'https://staging-www.sandbox.googleapis.com/' +
        'identitytoolkit/v3/relyingparty/',
    secureTokenEndpoint: 'https://staging-securetoken.sandbox.googleapis.com' +
        '/v1/token',
    id: 's'
  },
  TEST: {
    firebaseAuthEndpoint: 'https://www-googleapis-test.sandbox.google.com/' +
        'identitytoolkit/v3/relyingparty/',
    secureTokenEndpoint: 'https://test-securetoken.sandbox.googleapis.com/v1' +
        '/token',
    id: 't'
  }
};


/**
 * Returns the endpoint specific RpcHandler configuration.
 * @param {?string=} opt_id The identifier of the endpoint type if available.
 * @return {?Object|undefined} The RpcHandler endpoint configuration object.
 */
fireauth.constants.getEndpointConfig = function(opt_id) {
  for (var endpointKey in fireauth.constants.Endpoint) {
    if (fireauth.constants.Endpoint[endpointKey].id === opt_id) {
      var endpoint = fireauth.constants.Endpoint[endpointKey];
      return {
        'firebaseEndpoint': endpoint.firebaseAuthEndpoint,
        'secureTokenEndpoint': endpoint.secureTokenEndpoint
      };
    }
  }
  return null;
};


/**
 * Returns the validated endpoint identifier. Undefined if the provided one is
 * invalid.
 * @param {?string=} opt_id The identifier of the endpoint type if available.
 * @return {string|undefined} The validated endpoint ID. If not valid,
 *     undefined.
 */
fireauth.constants.getEndpointId = function(opt_id) {
  if (opt_id && fireauth.constants.getEndpointConfig(opt_id)) {
    return opt_id;
  }
  return undefined;
};


/** @const {string|undefined} The current client endpoint. */
fireauth.constants.clientEndpoint = fireauth.constants.getEndpointId('__EID__');
