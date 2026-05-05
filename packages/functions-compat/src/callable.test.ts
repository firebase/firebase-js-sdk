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
import { FunctionsError, FunctionsErrorCode } from '@firebase/functions';
import { createTestService } from '../test/utils';
import firebase, { FirebaseApp } from '@firebase/app-compat';

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
    expect((e as FunctionsError).code).to.equal(code);
    expect((e as FunctionsError).message).to.equal(message);
    expect((e as FunctionsError).details).to.deep.equal(details);
  }
  if (!failed) {
    expect(false, 'Promise should have failed.').to.be.true;
  }
}

describe('Firebase Functions > Call', () => {
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

    const func = functions.httpsCallable('dataTestv2');
    const result = await func(data);

    expect(result.data).to.deep.equal({
      message: 'stub response',
      code: 42,
      long: 420
    });
  });

  it('scalars', async () => {
    const functions = createTestService(app, region);
    const func = functions.httpsCallable('scalarTestv2');
    const result = await func(17);
    expect(result.data).to.equal(76);
  });

  it('null', async () => {
    const functions = createTestService(app, region);
    const func = functions.httpsCallable('nullTestv2');
    let result = await func(null);
    expect(result.data).to.be.null;

    // Test with void arguments version.
    result = await func();
    expect(result.data).to.be.null;
  });

  it('missing result', async () => {
    const functions = createTestService(app, region);
    const func = functions.httpsCallable('missingResultTestv2');
    await expectError(
      func(),
      'functions/internal',
      'Response is missing data field.'
    );
  });

  it('unhandled error', async () => {
    const functions = createTestService(app, region);
    const func = functions.httpsCallable('unhandledErrorTestv2');
    await expectError(func(), 'functions/internal', 'internal');
  });

  it('unknown error', async () => {
    const functions = createTestService(app, region);
    const func = functions.httpsCallable('unknownErrorTestv2');
    await expectError(func(), 'functions/internal', 'internal');
  });

  it('explicit error', async () => {
    const functions = createTestService(app, region);
    const func = functions.httpsCallable('explicitErrorTestv2');
    await expectError(func(), 'functions/out-of-range', 'explicit nope', {
      start: 10,
      end: 20,
      long: 30
    });
  });

  it('http error', async () => {
    const functions = createTestService(app, region);
    const func = functions.httpsCallable('httpErrorTestv2');
    await expectError(func(), 'functions/invalid-argument', 'invalid-argument');
  });

  it('timeout', async () => {
    const functions = createTestService(app, region);
    const func = functions.httpsCallable('timeoutTestv2', { timeout: 10 });
    await expectError(
      func(),
      'functions/deadline-exceeded',
      'deadline-exceeded'
    );
  });
});
