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
import { expect } from 'chai';
import * as sinon from 'sinon';
import { FirebaseApp } from '@firebase/app-types';
import { _FirebaseApp } from '@firebase/app-types/private';
import { HttpsError, FunctionsErrorCode } from '@firebase/functions-types';
import firebase from '@firebase/app';
import '@firebase/messaging';
import { Service } from '../../src/api/service';

export const TEST_PROJECT = require('../../../../config/project.json');

// Chai doesn't handle Error comparisons in a useful way.
// https://github.com/chaijs/chai/issues/608
async function expectError(
  promise: Promise<any>,
  code: FunctionsErrorCode,
  message: string,
  details?: any
) {
  let failed = false;
  try {
    await promise;
  } catch (e) {
    failed = true;
    expect(e.code).to.equal(code);
    expect(e.message).to.equal(message);
    expect(e.details).to.deep.equal(details);
  }
  if (!failed) {
    expect(false, 'Promise should have failed.');
  }
}

describe('Firebase Functions > Call', () => {
  let app: FirebaseApp;
  let functions: Service;

  before(() => {
    const projectId = TEST_PROJECT.projectId;
    const messagingSenderId = 'messaging-sender-id';
    const region = 'us-central1';
    try {
      app = firebase.app('TEST-APP');
    } catch (e) {
      app = firebase.initializeApp(
        { projectId, messagingSenderId },
        'TEST-APP'
      );
    }
    functions = new Service(app, region);
  });

  // TODO(klimt): Move this to the cross-platform tests and delete this file,
  // once instance id works there.
  it('instance id', async () => {
    if (!('serviceWorker' in navigator)) {
      // Current platform does not support messaging, skip test.
      return;
    }

    // Stub out the messaging method get an instance id token.
    const messaging = firebase.messaging(app);
    const stub = sinon
      .stub(messaging, 'getToken')
      .returns(Promise.resolve('iid'));

    const func = functions.httpsCallable('instanceIdTest');
    const result = await func({});
    expect(result.data).to.deep.equal({});

    expect(stub.callCount).to.equal(1);
    stub.restore();
  });
});
