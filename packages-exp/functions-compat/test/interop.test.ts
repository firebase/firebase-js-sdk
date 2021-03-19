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
import {
  FunctionsErrorCode,
  httpsCallable as httpsCallableExp,
  useFunctionsEmulator as useFunctionsEmulatorExp
} from '@firebase/functions-exp';
import { createTestService } from '../test/utils';
import { firebase, FirebaseApp } from '@firebase/app-compat';

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
    // Errors coming from callable functions usually have the functions-exp
    // code in the message since it's thrown inside functions-exp.
    expect(e.code).to.match(new RegExp(`functions.*/${code}`));
    expect(e.message).to.equal(message);
    expect(e.details).to.deep.equal(details);
  }
  if (!failed) {
    expect(false, 'Promise should have failed.').to.be.true;
  }
}

describe('Firebase Functions Interop - exp functions work if given compat instance', () => {
  let app: FirebaseApp;
  const region = 'us-central1';

  before(() => {
    const useEmulator = !!process.env.HOST;
    const projectId = useEmulator
      ? 'functions-integration-test'
      : TEST_PROJECT.projectId;
    const messagingSenderId = 'messaging-sender-id';

    app = firebase.initializeApp({ projectId, messagingSenderId });
  });

  after(async () => {
    await app.delete();
  });

  it('httpsCallable: simple data', async () => {
    const functions = createTestService(app, region);
    // TODO(klimt): Should we add an API to create a "long" in JS?
    const data = {
      bool: true,
      int: 2,
      str: 'four',
      array: [5, 6],
      null: null
    };

    const func = httpsCallableExp(functions, 'dataTest');
    const result = await func(data);

    expect(result.data).to.deep.equal({
      message: 'stub response',
      code: 42,
      long: 420
    });
  });

  it('httpsCallable: scalars', async () => {
    const functions = createTestService(app, region);
    const func = httpsCallableExp(functions, 'scalarTest');
    const result = await func(17);
    expect(result.data).to.equal(76);
  });

  it('httpsCallable: null', async () => {
    const functions = createTestService(app, region);
    const func = httpsCallableExp(functions, 'nullTest');
    let result = await func(null);
    expect(result.data).to.be.null;

    // Test with void arguments version.
    result = await func();
    expect(result.data).to.be.null;
  });

  it('httpsCallable: missing result', async () => {
    const functions = createTestService(app, region);
    const func = httpsCallableExp(functions, 'missingResultTest');
    await expectError(func(), 'internal', 'Response is missing data field.');
  });

  it('httpsCallable: unhandled error', async () => {
    const functions = createTestService(app, region);
    const func = httpsCallableExp(functions, 'unhandledErrorTest');
    await expectError(func(), 'internal', 'internal');
  });

  it('httpsCallable: unknown error', async () => {
    const functions = createTestService(app, region);
    const func = httpsCallableExp(functions, 'unknownErrorTest');
    await expectError(func(), 'internal', 'internal');
  });

  it('httpsCallable: explicit error', async () => {
    const functions = createTestService(app, region);
    const func = httpsCallableExp(functions, 'explicitErrorTest');
    await expectError(func(), 'out-of-range', 'explicit nope', {
      start: 10,
      end: 20,
      long: 30
    });
  });

  it('httpsCallable: http error', async () => {
    const functions = createTestService(app, region);
    const func = httpsCallableExp(functions, 'httpErrorTest');
    await expectError(func(), 'invalid-argument', 'invalid-argument');
  });

  it('httpsCallable: timeout', async () => {
    const functions = createTestService(app, region);
    const func = httpsCallableExp(functions, 'timeoutTest', { timeout: 10 });
    await expectError(func(), 'deadline-exceeded', 'deadline-exceeded');
  });

  it('useFunctionsEmulator', async () => {
    const functions = createTestService(app, region);
    useFunctionsEmulatorExp(functions, 'myhost', 4000);
    expect((functions as any)._delegate.emulatorOrigin).to.equal(
      'http://myhost:4000'
    );
  });
});
