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
import { expect } from 'chai';
import * as sinon from 'sinon';
import { FirebaseApp } from '@firebase/app-types';
import { _FirebaseApp } from '@firebase/app-types/private';
import firebase from '@firebase/app';
import { Service } from '../../src/api/service';

/* eslint-disable import/no-duplicates */
import '@firebase/messaging';
import { isSupported } from '@firebase/messaging';

// eslint-disable-next-line @typescript-eslint/no-require-imports
export const TEST_PROJECT = require('../../../../config/project.json');

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
    if (!isSupported()) {
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
