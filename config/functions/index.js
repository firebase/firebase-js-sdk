/**
 * @license
 * Copyright 2017 Google LLC
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

const assert = require('assert');
const { onRequest, onCall } = require('firebase-functions/v2/https');

/*
 * These backend test helpers are copied from the iOS and Android SDKs, but are
 * not all implemented as tests in the JS SDK yet.
 */

exports.dataTestv2 = onRequest({ cors: true }, (request, response) => {
  assert.deepEqual(request.body, {
    data: {
      bool: true,
      int: 2,
      // TODO(klimt): Should we add an API for encoding longs?
      /*long: {
          value: '3',
          '@type': 'type.googleapis.com/google.protobuf.Int64Value',
        },*/
      str: 'four',
      array: [5, 6],
      null: null
    }
  });
  response.send({
    data: {
      message: 'stub response',
      code: 42,
      long: {
        value: '420',
        '@type': 'type.googleapis.com/google.protobuf.Int64Value'
      }
    }
  });
});

exports.scalarTestv2 = onRequest({ cors: true }, (request, response) => {
  assert.deepEqual(request.body, { data: 17 });
  response.send({ data: 76 });
});

exports.tokenTestv2 = onRequest({ cors: true }, (request, response) => {
  assert.equal(request.get('Authorization'), 'Bearer token');
  assert.deepEqual(request.body, { data: {} });
  response.send({ data: {} });
});

exports.instanceIdTestv2 = onRequest({ cors: true }, (request, response) => {
  assert.equal(request.get('Firebase-Instance-ID-Token'), 'iid');
  assert.deepEqual(request.body, { data: {} });
  response.send({ data: {} });
});

exports.appCheckTestv2 = onRequest({ cors: true }, (request, response) => {
  const token = request.get('X-Firebase-AppCheck');
  assert.equal(token !== undefined, true);
  assert.deepEqual(request.body, { data: {} });
  response.send({ data: { token } });
});

exports.nullTestv2 = onRequest({ cors: true }, (request, response) => {
  assert.deepEqual(request.body, { data: null });
  response.send({ data: null });
});

exports.missingResultTestv2 = onRequest({ cors: true }, (request, response) => {
  assert.deepEqual(request.body, { data: null });
  response.send({});
});

exports.unhandledErrorTestv2 = onRequest(
  { cors: true },
  (request, response) => {
    // Fail in a way that the client shouldn't see.
    throw 'nope';
  }
);

exports.unknownErrorTestv2 = onRequest({ cors: true }, (request, response) => {
  // Send an http error with a body with an explicit code.
  response.status(400).send({
    error: {
      status: 'THIS_IS_NOT_VALID',
      message: 'this should be ignored'
    }
  });
});

exports.explicitErrorTestv2 = onRequest({ cors: true }, (request, response) => {
  // Send an http error with a body with an explicit code.
  response.status(400).send({
    error: {
      status: 'OUT_OF_RANGE',
      message: 'explicit nope',
      details: {
        start: 10,
        end: 20,
        long: {
          value: '30',
          '@type': 'type.googleapis.com/google.protobuf.Int64Value'
        }
      }
    }
  });
});

exports.httpErrorTestv2 = onRequest({ cors: true }, (request, response) => {
  // Send an http error with no body.
  response.status(400).send();
});

exports.timeoutTestv2 = onRequest({ cors: true }, (request, response) => {
  // Wait for longer than 500ms.
  setTimeout(() => response.send({ data: true }), 500);
});

// Used by E2E test.
exports.callTestv2 = onCall(request => {
  return { word: 'hellooo' };
});
