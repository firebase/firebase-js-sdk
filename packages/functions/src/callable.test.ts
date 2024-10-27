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
import { FirebaseApp } from '@firebase/app';
import { FunctionsErrorCodeCore } from './public-types';
import {
  Provider,
  ComponentContainer,
  Component,
  ComponentType
} from '@firebase/component';
import {
  MessagingInternal,
  MessagingInternalComponentName
} from '@firebase/messaging-interop-types';
import {
  FirebaseAuthInternal,
  FirebaseAuthInternalName
} from '@firebase/auth-interop-types';
import {
  FirebaseAppCheckInternal,
  AppCheckInternalComponentName
} from '@firebase/app-check-interop-types';
import { makeFakeApp, createTestService } from '../test/utils';
import { FunctionsService, httpsCallable } from './service';
import { FUNCTIONS_TYPE } from './constants';
import { FunctionsError } from './error';

// eslint-disable-next-line @typescript-eslint/no-require-imports
export const TEST_PROJECT = require('../../../config/project.json');

// Chai doesn't handle Error comparisons in a useful way.
// https://github.com/chaijs/chai/issues/608
async function expectError(
  promise: Promise<any>,
  code: FunctionsErrorCodeCore,
  message: string,
  details?: any
): Promise<void> {
  let failed = false;
  try {
    await promise;
  } catch (e) {
    failed = true;
    expect(e).to.be.instanceOf(FunctionsError);
    const error = e as FunctionsError;
    expect(error.code).to.equal(`${FUNCTIONS_TYPE}/${code}`);
    expect(error.message).to.equal(message);
    expect(error.details).to.deep.equal(details);
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

    const func = httpsCallable<
      Record<string, any>,
      { message: string; code: number; long: number }
    >(functions, 'dataTest');
    try {

      const result = await func(data);

      expect(result.data).to.deep.equal({
        message: 'stub response',
        code: 42,
        long: 420
      });
    } catch (err) {
      console.error(err)
    }

  });

  it('scalars', async () => {
    const functions = createTestService(app, region);
    const func = httpsCallable<number, number>(functions, 'scalarTest');
    const result = await func(17);
    expect(result.data).to.equal(76);
  });

  it('auth token', async () => {
    // mock auth-internal service
    const authMock: FirebaseAuthInternal = {
      getToken: async () => ({ accessToken: 'token' })
    } as unknown as FirebaseAuthInternal;
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

  it('app check token', async () => {
    const appCheckMock: FirebaseAppCheckInternal = {
      getToken: async () => ({ token: 'app-check-token' })
    } as unknown as FirebaseAppCheckInternal;
    const appCheckProvider = new Provider<AppCheckInternalComponentName>(
      'app-check-internal',
      new ComponentContainer('test')
    );
    appCheckProvider.setComponent(
      new Component(
        'app-check-internal',
        () => appCheckMock,
        ComponentType.PRIVATE
      )
    );
    const functions = createTestService(
      app,
      region,
      undefined,
      undefined,
      appCheckProvider
    );

    // Stub out the internals to get an app check token.
    const stub = sinon.stub(appCheckMock, 'getToken').callThrough();
    const func = httpsCallable(functions, 'appCheckTest');
    const result = await func({});
    expect(result.data).to.deep.equal({ token: 'app-check-token' });

    expect(stub.callCount).to.equal(1);
    stub.restore();
  });

  it('app check limited use token', async () => {
    const appCheckMock: FirebaseAppCheckInternal = {
      getLimitedUseToken: async () => ({ token: 'app-check-single-use-token' })
    } as unknown as FirebaseAppCheckInternal;
    const appCheckProvider = new Provider<AppCheckInternalComponentName>(
      'app-check-internal',
      new ComponentContainer('test')
    );
    appCheckProvider.setComponent(
      new Component(
        'app-check-internal',
        () => appCheckMock,
        ComponentType.PRIVATE
      )
    );
    const functions = createTestService(
      app,
      region,
      undefined,
      undefined,
      appCheckProvider
    );

    // Stub out the internals to get an app check token.
    const stub = sinon.stub(appCheckMock, 'getLimitedUseToken').callThrough();
    const func = httpsCallable(functions, 'appCheckTest', {
      limitedUseAppCheckTokens: true
    });
    const result = await func({});
    expect(result.data).to.deep.equal({ token: 'app-check-single-use-token' });

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
    const messagingMock: MessagingInternal = {
      getToken: async () => 'iid'
    } as unknown as MessagingInternal;
    const messagingProvider = new Provider<MessagingInternalComponentName>(
      'messaging-internal',
      new ComponentContainer('test')
    );
    messagingProvider.setComponent(
      new Component(
        'messaging-internal',
        () => messagingMock,
        ComponentType.PRIVATE
      )
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

describe('Firebase Functions > Stream', () => {
  let app: FirebaseApp;
  let functions: FunctionsService;
  let mockFetch: sinon.SinonStub;
  const region = 'us-central1';

  beforeEach(() => {
    const useEmulator = !!process.env.FIREBASE_FUNCTIONS_EMULATOR_ORIGIN;
    const projectId = useEmulator
      ? 'functions-integration-test'
      : TEST_PROJECT.projectId;
    const messagingSenderId = 'messaging-sender-id';
    app = makeFakeApp({ projectId, messagingSenderId });
    functions = createTestService(app, region);
    mockFetch = sinon.stub(functions, 'fetchImpl' as any);
  });

  afterEach(() => {
    mockFetch.restore();
  })

  it('successfully streams data and resolves final result', async () => {
    const mockResponse = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"message":"Hello"}\n'));
        controller.enqueue(new TextEncoder().encode('data: {"message":"World"}\n'));
        controller.enqueue(new TextEncoder().encode('data: {"result":"Final Result"}\n'));
        controller.close();
      }
    });

    mockFetch.resolves({
      body: mockResponse,
      headers: new Headers({ 'Content-Type': 'text/event-stream' }),
      status: 200,
      statusText: 'OK',
    } as Response);

    const func = httpsCallable<Record<string, any>, string, string>(functions, 'streamTest');
    const streamResult = await func.stream({});

    const messages: string[] = [];
    for await (const message of streamResult.stream) {
      messages.push(message);
    }

    expect(messages).to.deep.equal(['Hello', 'World']);
    expect(await streamResult.data).to.equal('Final Result');
  });

  it('handles network errors', async () => {
    mockFetch.rejects(new Error('Network error'));

    const func = httpsCallable<Record<string, any>, string, string>(functions, 'errTest');
    const streamResult = await func.stream({});

    let errorThrown = false;
    try {
      for await (const _ of streamResult.stream) {
        // This should not execute
      }
    } catch (error: unknown) {
      errorThrown = true;
      expect((error as FunctionsError).code).to.equal(`${FUNCTIONS_TYPE}/internal`);
    }
    expect(errorThrown).to.be.true;
    expectError(streamResult.data, "internal", "Internal");
  });

  it('handles server-side errors', async () => {
    const mockResponse = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"error":{"status":"INVALID_ARGUMENT","message":"Invalid input"}}\n'));
        controller.close();
      }
    });

    mockFetch.resolves({
      body: mockResponse,
      headers: new Headers({ 'Content-Type': 'text/event-stream' }),
      status: 200,
      statusText: 'OK',
    } as Response);

    const func = httpsCallable<Record<string, any>, string, string>(functions, 'stream');
    const streamResult = await func.stream({});

    let errorThrown = false;
    try {
      for await (const _ of streamResult.stream) {
        // This should not execute
      }
    } catch (error) {
      errorThrown = true;
      expect((error as FunctionsError).code).to.equal(`${FUNCTIONS_TYPE}/invalid-argument`);
      expect((error as FunctionsError).message).to.equal('Invalid input');
    }

    expect(errorThrown).to.be.true;
    expectError(streamResult.data, "invalid-argument", "Invalid input")
  });

  it('includes authentication and app check tokens in request headers', async () => {
    const authMock: FirebaseAuthInternal = {
      getToken: async () => ({ accessToken: 'auth-token' })
    } as unknown as FirebaseAuthInternal;
    const authProvider = new Provider<FirebaseAuthInternalName>(
      'auth-internal',
      new ComponentContainer('test')
    );
    authProvider.setComponent(
      new Component('auth-internal', () => authMock, ComponentType.PRIVATE)
    );
    const appCheckMock: FirebaseAppCheckInternal = {
      getToken: async () => ({ token: 'app-check-token' })
    } as unknown as FirebaseAppCheckInternal;
    const appCheckProvider = new Provider<AppCheckInternalComponentName>(
      'app-check-internal',
      new ComponentContainer('test')
    );
    appCheckProvider.setComponent(
      new Component(
        'app-check-internal',
        () => appCheckMock,
        ComponentType.PRIVATE
      )
    );

    const functions = createTestService(app, region, authProvider, undefined, appCheckProvider);
    const mockFetch = sinon.stub(functions, 'fetchImpl' as any);

    const mockResponse = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"result":"Success"}\n'));
        controller.close();
      }
    });

    mockFetch.resolves({
      body: mockResponse,
      headers: new Headers({ 'Content-Type': 'text/event-stream' }),
      status: 200,
      statusText: 'OK',
    } as Response);

    const func = httpsCallable<Record<string, any>, string, string>(functions, 'stream');
    await func.stream({});

    expect(mockFetch.calledOnce).to.be.true;
    const [_, options] = mockFetch.firstCall.args;
    expect(options.headers['Authorization']).to.equal('Bearer auth-token');
    expect(options.headers['Content-Type']).to.equal('application/json');
    expect(options.headers['Accept']).to.equal('text/event-stream');
  });

  it('aborts during initial fetch', async () => {
    const controller = new AbortController();

    // Create a fetch that rejects when aborted
    const fetchPromise = new Promise<Response>((_, reject) => {
      controller.signal.addEventListener('abort', () => {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        reject(error);
      });
    });
    mockFetch.returns(fetchPromise);

    const func = httpsCallable<Record<string, any>, string, string>(functions, 'streamTest');
    const streamPromise = func.stream({}, { signal: controller.signal });

    controller.abort();

    const streamResult = await streamPromise;

    // Verify fetch was called with abort signal
    expect(mockFetch.calledOnce).to.be.true;
    const [_, options] = mockFetch.firstCall.args;
    expect(options.signal).to.equal(controller.signal);

    // Verify stream iteration throws AbortError
    let errorThrown = false;
    try {
      for await (const _ of streamResult.stream) {
        // Should not execute
      }
    } catch (error) {
      errorThrown = true;
      expect((error as FunctionsError).code).to.equal(`${FUNCTIONS_TYPE}/cancelled`);
    }
    expect(errorThrown).to.be.true;
    expectError(streamResult.data, "cancelled", "Request was cancelled")
  });

  it('aborts during streaming', async () => {
    const controller = new AbortController();

    const mockResponse = new ReadableStream({
      async start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"message":"First"}\n'));
        // Add delay to simulate network latency
        await new Promise(resolve => setTimeout(resolve, 50));
        controller.enqueue(new TextEncoder().encode('data: {"message":"Second"}\n'));
        await new Promise(resolve => setTimeout(resolve, 50));
        controller.enqueue(new TextEncoder().encode('data: {"result":"Final"}\n'));
        controller.close();
      }
    });

    mockFetch.resolves({
      body: mockResponse,
      headers: new Headers({ 'Content-Type': 'text/event-stream' }),
      status: 200,
      statusText: 'OK',
    } as Response);

    const func = httpsCallable<Record<string, any>, string, string>(functions, 'streamTest');
    const streamResult = await func.stream({}, { signal: controller.signal });

    const messages: string[] = [];
    try {
      for await (const message of streamResult.stream) {
        messages.push(message);
        if (messages.length === 1) {
          // Abort after receiving first message
          controller.abort();
        }
      }
      throw new Error('Stream should have been aborted');
    } catch (error) {
      expect((error as FunctionsError).code).to.equal(`${FUNCTIONS_TYPE}/cancelled`);
    }
    expect(messages).to.deep.equal(['First']);
    expectError(streamResult.data, "cancelled", "Request was cancelled")
  });

  it('fails immediately with pre-aborted signal', async () => {
    mockFetch.callsFake((url: string, options: RequestInit) => {
      if (options.signal?.aborted) {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        return Promise.reject(error);
      }
      return Promise.resolve(new Response());
    });
    const func = httpsCallable<Record<string, any>, string, string>(functions, 'streamTest');
    const streamResult = await func.stream({}, { signal: AbortSignal.abort() });

    let errorThrown = false;
    try {
      for await (const _ of streamResult.stream) {
        // Should not execute
      }
    } catch (error) {
      errorThrown = true;
      expect((error as FunctionsError).code).to.equal(`${FUNCTIONS_TYPE}/cancelled`);
    }
    expect(errorThrown).to.be.true;
    expectError(streamResult.data, "cancelled", "Request was cancelled")
  });

  it('properly handles AbortSignal.timeout()', async () => {
    const timeoutMs = 50;
    const signal = AbortSignal.timeout(timeoutMs);

    mockFetch.callsFake(async (url: string, options: RequestInit) => {
      await new Promise((resolve, reject) => {
        options.signal?.addEventListener('abort', () => {
          const error = new Error('The operation was aborted');
          error.name = 'AbortError';
          reject(error);
        });
        setTimeout(resolve, timeoutMs * 3);
      });

      // If we get here, timeout didn't occur
      return new Response();
    });

    const func = httpsCallable<Record<string, any>, string, string>(functions, 'streamTest');
    const streamResult = await func.stream({}, { signal });

    try {
      for await (const message of streamResult.stream) {
        // Should not execute
      }
      throw new Error('Stream should have timed out');
    } catch (error) {
      expect((error as FunctionsError).code).to.equal(`${FUNCTIONS_TYPE}/cancelled`);
    }
    expectError(streamResult.data, "cancelled", "Request was cancelled")
  });
});
