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
import { expect } from 'chai';
import * as sinon from 'sinon';
import { FirebaseApp } from '@firebase/app-types-exp';
import { FunctionsErrorCode } from '@firebase/functions-types-exp';
import {
  Provider,
  ComponentContainer,
  Component,
  ComponentType
} from '@firebase/component';
import {
  FirebaseMessaging,
  FirebaseMessagingName
} from '@firebase/messaging-types';
import {
  FirebaseAuthInternal,
  FirebaseAuthInternalName
} from '@firebase/auth-interop-types';
import { makeFakeApp, createTestService } from '../test/utils';
import { httpsCallable } from './service';

// eslint-disable-next-line @typescript-eslint/no-require-imports
export const TEST_PROJECT = require('../../../config/project.json');

// Chai doesn't handle Error comparisons in a useful way.
// https://github.com/chaijs/chai/issues/608
async function expectError(
  promise: Promise<any>,
  code: FunctionsErrorCode,
  message: string,
  details?: any
): Promise<void> {
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
    expect(false, 'Promise should have failed.').to.be.true;
  }
}

describe('Firebase Functions > Call', () => {
  let app: FirebaseApp;
  const region = 'us-central1';

  before(() => {
    const useEmulator = !!process.env.FIREBASE_FUNCTIONS_EMULATOR_ORIGIN;
    const projectId = useEmulator
      ? 'functions-integration-test'
      : TEST_PROJECT.projectId;
    const messagingSenderId = 'messaging-sender-id';

    app = makeFakeApp({ projectId, messagingSenderId });
  });

  it('simple data', async () => {
    const functions = createTestService(app, region);
    // TODO(klimt): Should we add an API to create a "long" in JS?
    const data = {
      bool: true,
      int: 2,
      str: 'four',
      array: [5, 6],
      null: null
    };

    const func = httpsCallable(functions, 'dataTest');
    const result = await func(data);

    expect(result.data).to.deep.equal({
      message: 'stub response',
      code: 42,
      long: 420
    });
  });

  it('scalars', async () => {
    const functions = createTestService(app, region);
    const func = httpsCallable(functions, 'scalarTest');
    const result = await func(17);
    expect(result.data).to.equal(76);
  });

  it('token', async () => {
    // mock auth-internal service
    const authMock: FirebaseAuthInternal = ({
      getToken: async () => ({ accessToken: 'token' })
    } as unknown) as FirebaseAuthInternal;
    const authProvider = new Provider<FirebaseAuthInternalName>(
      'auth-internal',
      new ComponentContainer('test')
    );
    authProvider.setComponent(
      new Component('auth-internal', () => authMock, ComponentType.PRIVATE)
    );

    const functions = createTestService(app, region, authProvider);

    // Stub out the internals to get an auth token.
    const stub = sinon.stub(authMock, 'getToken').callThrough();
    const func = httpsCallable(functions, 'tokenTest');
    const result = await func({});
    expect(result.data).to.deep.equal({});

    expect(stub.callCount).to.equal(1);
    stub.restore();
  });

  it('instance id', async () => {
    // Should effectively skip this test in environments where messaging doesn't work.
    // (Node, IE)
    if (process || !('Notification' in self)) {
      console.log('No Notification API: skipping instance id test.');
      return;
    }
    // mock firebase messaging
    const messagingMock: FirebaseMessaging = ({
      getToken: async () => 'iid'
    } as unknown) as FirebaseMessaging;
    const messagingProvider = new Provider<FirebaseMessagingName>(
      'messaging',
      new ComponentContainer('test')
    );
    messagingProvider.setComponent(
      new Component('messaging', () => messagingMock, ComponentType.PRIVATE)
    );

    const functions = createTestService(
      app,
      region,
      undefined,
      messagingProvider
    );

    // Stub out the messaging method get an instance id token.
    const stub = sinon.stub(messagingMock, 'getToken').callThrough();
    sinon.stub(Notification, 'permission').value('granted');

    const func = httpsCallable(functions, 'instanceIdTest');
    const result = await func({});
    expect(result.data).to.deep.equal({});

    expect(stub.callCount).to.equal(1);
    stub.restore();
  });

  it('null', async () => {
    const functions = createTestService(app, region);
    const func = httpsCallable(functions, 'nullTest');
    let result = await func(null);
    expect(result.data).to.be.null;

    // Test with void arguments version.
    result = await func();
    expect(result.data).to.be.null;
  });

  it('missing result', async () => {
    const functions = createTestService(app, region);
    const func = httpsCallable(functions, 'missingResultTest');
    await expectError(func(), 'internal', 'Response is missing data field.');
  });

  it('unhandled error', async () => {
    const functions = createTestService(app, region);
    const func = httpsCallable(functions, 'unhandledErrorTest');
    await expectError(func(), 'internal', 'internal');
  });

  it('unknown error', async () => {
    const functions = createTestService(app, region);
    const func = httpsCallable(functions, 'unknownErrorTest');
    await expectError(func(), 'internal', 'internal');
  });

  it('explicit error', async () => {
    const functions = createTestService(app, region);
    const func = httpsCallable(functions, 'explicitErrorTest');
    await expectError(func(), 'out-of-range', 'explicit nope', {
      start: 10,
      end: 20,
      long: 30
    });
  });

  it('http error', async () => {
    const functions = createTestService(app, region);
    const func = httpsCallable(functions, 'httpErrorTest');
    await expectError(func(), 'invalid-argument', 'invalid-argument');
  });

  it('timeout', async () => {
    const functions = createTestService(app, region);
    const func = httpsCallable(functions, 'timeoutTest', { timeout: 10 });
    await expectError(func(), 'deadline-exceeded', 'deadline-exceeded');
  });
});
