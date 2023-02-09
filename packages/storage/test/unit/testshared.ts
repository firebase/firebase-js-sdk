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
import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';

use(chaiAsPromised);

import { FirebaseApp } from '@firebase/app-types';
import { CONFIG_STORAGE_BUCKET_KEY } from '../../src/implementation/constants';
import { StorageError } from '../../src/implementation/error';
import {
  Headers,
  Connection,
  ConnectionType
} from '../../src/implementation/connection';
import { newTestConnection, TestingConnection } from './connection';
import { FirebaseAuthInternalName } from '@firebase/auth-interop-types';
import {
  Provider,
  ComponentContainer,
  Component,
  ComponentType
} from '@firebase/component';
import { AppCheckInternalComponentName } from '@firebase/app-check-interop-types';
import { FirebaseStorageImpl } from '../../src/service';
import { Metadata } from '../../src/metadata';
import { injectTestConnection } from '../../src/platform/connection';

export const authToken = 'totally-legit-auth-token';
export const appCheckToken = 'totally-shady-token';
export const bucket = 'mybucket';
export const fakeApp = makeFakeApp();
export const fakeAuthProvider = makeFakeAuthProvider({
  accessToken: authToken
});
export const emptyAuthProvider = new Provider<FirebaseAuthInternalName>(
  'auth-internal',
  new ComponentContainer('storage-container')
);
export const fakeAppCheckTokenProvider = makeFakeAppCheckProvider({
  token: appCheckToken
});

export function makeFakeApp(bucketArg?: string): FirebaseApp {
  const app: any = {};
  app.options = {};
  if (bucketArg != null) {
    app.options[CONFIG_STORAGE_BUCKET_KEY] = bucketArg;
  } else {
    app.options[CONFIG_STORAGE_BUCKET_KEY] = bucket;
  }
  return app as FirebaseApp;
}

export function makeFakeAuthProvider(token: {
  accessToken: string;
}): Provider<FirebaseAuthInternalName> {
  const provider = new Provider(
    'auth-internal',
    new ComponentContainer('storage-container')
  );
  provider.setComponent(
    new Component(
      'auth-internal',
      () => {
        return {
          getToken: () => Promise.resolve(token)
        } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      },
      ComponentType.PRIVATE
    )
  );

  return provider as Provider<FirebaseAuthInternalName>;
}

export function makeFakeAppCheckProvider(tokenResult: {
  token: string;
}): Provider<AppCheckInternalComponentName> {
  const provider = new Provider(
    'app-check-internal',
    new ComponentContainer('storage-container')
  );
  provider.setComponent(
    new Component(
      'app-check-internal',
      () => {
        return {
          getToken: () => Promise.resolve(tokenResult)
        } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      },
      ComponentType.PRIVATE
    )
  );

  return provider as Provider<AppCheckInternalComponentName>;
}

/**
 * Returns something that looks like an fbs.XhrIo with the given headers
 * and status.
 */
export function fakeXhrIo<I extends ConnectionType = string>(
  headers: Headers,
  status: number = 200
): Connection<I> {
  const lower: Headers = {};
  for (const [key, value] of Object.entries(headers)) {
    lower[key.toLowerCase()] = value.toString();
  }

  const fakeConnection: any = {
    getResponseHeader(name: string): string {
      const lowerName = name.toLowerCase();
      if (lower.hasOwnProperty(lowerName)) {
        return lower[lowerName];
      } else {
        throw new Error('No such header ' + name);
      }
    },
    getStatus(): number {
      return status;
    }
  };

  return fakeConnection as Connection<I>;
}

/**
 * Binds ignoring types. Used to test calls involving improper arguments.
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export function bind(f: Function, ctx: any, ...args: any[]): () => void {
  return () => {
    f.apply(ctx, args);
  };
}

export function assertThrows(f: () => void, code: string): StorageError {
  let captured: StorageError | null = null;
  expect(() => {
    try {
      f();
    } catch (e) {
      captured = e as StorageError;
      throw e;
    }
  }).to.throw();
  // @ts-ignore Compiler does not know callback is invoked immediately and
  // thinks catch block is unreachable. This is an open TS issue:
  // https://github.com/microsoft/TypeScript/issues/11498
  expect(captured).to.be.an.instanceof(StorageError);
  // @ts-ignore See above.
  expect(captured.code).to.equal(code);
  // @ts-ignore See above.
  return captured as StorageError;
}

export function assertUint8ArrayEquals(
  arr1: Uint8Array,
  arr2: Uint8Array
): void {
  expect(arr1.length).to.equal(arr2.length);

  for (let i = 0; i < arr1.length; i++) {
    expect(arr1[i]).to.equal(arr2[i]);
  }
}

export function assertObjectIncludes(
  included: { [name: string]: any },
  obj: { [name: string]: any }
): void {
  for (const [key, value] of Object.entries(included)) {
    expect(value).to.deep.equal(obj[key]);
  }
}

const defaultFakeMetadata: Partial<Metadata> = { 'downloadTokens': ['a', 'b'] };

interface Response {
  status: number;
  body: string;
  headers: Headers;
}
export type RequestHandler = (
  url: string,
  method: string,
  body?: ArrayBufferView | Blob | string | null,
  headers?: Headers
) => Response;

export function storageServiceWithHandler(
  handler: RequestHandler,
  shouldResponseCb?: () => boolean
): FirebaseStorageImpl {
  function newSend(
    connection: TestingConnection,
    url: string,
    method: string,
    body?: ArrayBufferView | Blob | string | null,
    headers?: Headers
  ): void {
    const response = handler(url, method, body, headers);
    if (!shouldResponseCb || shouldResponseCb()) {
      connection.simulateResponse(
        response.status,
        response.body,
        response.headers
      );
    }
  }

  injectTestConnection(() => newTestConnection(newSend));
  return new FirebaseStorageImpl(
    {} as FirebaseApp,
    emptyAuthProvider,
    fakeAppCheckTokenProvider
  );
}

export function fakeServerHandler(
  fakeMetadata: Partial<Metadata> = defaultFakeMetadata
): RequestHandler {
  const stats: {
    [num: number]: {
      currentSize: number;
      finalSize: number;
    };
  } = {};

  let nextId: number = 0;

  function statusHeaders(status: string, existing?: Headers): Headers {
    if (existing) {
      existing['X-Goog-Upload-Status'] = status;
      return existing;
    } else {
      return { 'X-Goog-Upload-Status': status };
    }
  }

  function handler(
    url: string,
    method: string,
    content?: ArrayBufferView | Blob | string | null,
    headers?: Headers
  ): Response {
    method = method || 'GET';
    content = content || '';
    headers = headers || {};

    if (headers['X-Goog-Upload-Protocol'] === 'multipart') {
      return {
        status: 200,
        body: JSON.stringify(fakeMetadata),
        headers: statusHeaders('final')
      };
    }

    const contentLength =
      (content as Blob).size || (content as string).length || 0;

    if (headers['X-Goog-Upload-Protocol'] === 'resumable') {
      const thisId = nextId;
      nextId++;
      stats[thisId] = {
        currentSize: 0,
        finalSize: +headers['X-Goog-Upload-Header-Content-Length']
      };

      return {
        status: 200,
        body: '',
        headers: statusHeaders('active', {
          'X-Goog-Upload-URL': 'http://example.com?' + thisId
        })
      };
    }

    const matches = url.match(/^http:\/\/example\.com\?([0-9]+)$/);
    if (matches === null) {
      return { status: 400, body: '', headers: {} };
    }

    const id = +matches[1];
    if (!stats[id]) {
      return { status: 400, body: 'Invalid upload id', headers: {} };
    }

    if (headers['X-Goog-Upload-Command'] === 'query') {
      return {
        status: 200,
        body: '',
        headers: statusHeaders('active', {
          'X-Goog-Upload-Size-Received': stats[id].currentSize.toString()
        })
      };
    }

    const commands = (headers['X-Goog-Upload-Command'] as string)
      .split(',')
      .map(str => {
        return str.trim();
      });
    const isUpload = commands.indexOf('upload') !== -1;
    const isFinalize = commands.indexOf('finalize') !== -1;
    const stat = stats[id];

    if (isUpload) {
      const offset = +headers['X-Goog-Upload-Offset'];
      if (offset !== stat.currentSize) {
        return { status: 400, body: 'Uploading at wrong offset', headers: {} };
      }

      stat.currentSize += contentLength;
      if (stat.currentSize > stat.finalSize) {
        return { status: 400, body: 'Too many bytes', headers: {} };
      } else if (!isFinalize) {
        return { status: 200, body: '', headers: statusHeaders('active') };
      }
    }

    if (isFinalize) {
      const isDone = stat.currentSize === stat.finalSize;
      if (isDone) {
        return {
          status: 200,
          body: JSON.stringify(fakeMetadata),
          headers: statusHeaders('final')
        };
      } else {
        return {
          status: 400,
          body: 'finalize without the right # of bytes',
          headers: {}
        };
      }
    }

    return { status: 400, body: '', headers: {} };
  }
  return handler;
}

/**
 * Responds with a 503 for finalize.
 * @param fakeMetadata metadata to respond with for finalize
 * @returns a handler for requests
 */
export function fake503ForFinalizeServerHandler(
  fakeMetadata: Partial<Metadata> = defaultFakeMetadata
): RequestHandler {
  const stats: {
    [num: number]: {
      currentSize: number;
      finalSize: number;
    };
  } = {};

  let nextId: number = 0;

  function statusHeaders(status: string, existing?: Headers): Headers {
    if (existing) {
      existing['X-Goog-Upload-Status'] = status;
      return existing;
    } else {
      return { 'X-Goog-Upload-Status': status };
    }
  }

  function handler(
    url: string,
    method: string,
    content?: ArrayBufferView | Blob | string | null,
    headers?: Headers
  ): Response {
    method = method || 'GET';
    content = content || '';
    headers = headers || {};

    // const contentLength =
    // (content as Blob).size || (content as string).length || 0;
    if (headers['X-Goog-Upload-Protocol'] === 'resumable') {
      const thisId = nextId;
      nextId++;
      stats[thisId] = {
        currentSize: 0,
        finalSize: +headers['X-Goog-Upload-Header-Content-Length']
      };

      return {
        status: 200,
        body: '',
        headers: statusHeaders('active', {
          'X-Goog-Upload-URL': 'http://example.com?' + thisId
        })
      };
    }

    const matches = url.match(/^http:\/\/example\.com\?([0-9]+)$/);
    if (matches === null) {
      return { status: 400, body: '', headers: {} };
    }

    const id = +matches[1];
    if (!stats[id]) {
      return { status: 400, body: 'Invalid upload id', headers: {} };
    }

    if (headers['X-Goog-Upload-Command'] === 'query') {
      return {
        status: 200,
        body: '',
        headers: statusHeaders('active', {
          'X-Goog-Upload-Size-Received': stats[id].finalSize.toString()
        })
      };
    }

    const commands = (headers['X-Goog-Upload-Command'] as string)
      .split(',')
      .map(str => {
        return str.trim();
      });
    const isFinalize = commands.indexOf('finalize') !== -1;

    if (isFinalize) {
      return {
        status: 503,
        body: JSON.stringify(fakeMetadata),
        headers: statusHeaders('final')
      };
    } else {
      return {
        status: 200,
        body: JSON.stringify(fakeMetadata),
        headers: statusHeaders('active')
      };
    }
  }
  return handler;
}

/**
 * Responds with a 503 for upload.
 * @param fakeMetadata metadata to respond with for query
 * @returns a handler for requests
 */
export function fake503ForUploadServerHandler(
  fakeMetadata: Partial<Metadata> = defaultFakeMetadata,
  cb?: () => void
): RequestHandler {
  const stats: {
    [num: number]: {
      currentSize: number;
      finalSize: number;
    };
  } = {};

  let nextId: number = 0;

  function statusHeaders(status: string, existing?: Headers): Headers {
    if (existing) {
      existing['X-Goog-Upload-Status'] = status;
      return existing;
    } else {
      return { 'X-Goog-Upload-Status': status };
    }
  }

  function handler(
    url: string,
    method: string,
    content?: ArrayBufferView | Blob | string | null,
    headers?: Headers
  ): Response {
    method = method || 'GET';
    content = content || '';
    headers = headers || {};

    // const contentLength =
    // (content as Blob).size || (content as string).length || 0;
    if (headers['X-Goog-Upload-Protocol'] === 'resumable') {
      const thisId = nextId;
      nextId++;
      stats[thisId] = {
        currentSize: 0,
        finalSize: +headers['X-Goog-Upload-Header-Content-Length']
      };

      return {
        status: 200,
        body: '',
        headers: statusHeaders('active', {
          'X-Goog-Upload-URL': 'http://example.com?' + thisId
        })
      };
    }

    const matches = url.match(/^http:\/\/example\.com\?([0-9]+)$/);
    if (matches === null) {
      return { status: 400, body: '', headers: {} };
    }

    const id = +matches[1];
    if (!stats[id]) {
      return { status: 400, body: 'Invalid upload id', headers: {} };
    }

    if (headers['X-Goog-Upload-Command'] === 'query') {
      return {
        status: 200,
        body: '',
        headers: statusHeaders('active', {
          'X-Goog-Upload-Size-Received': stats[id].currentSize.toString()
        })
      };
    }

    const commands = (headers['X-Goog-Upload-Command'] as string)
      .split(',')
      .map(str => {
        return str.trim();
      });
    const isUpload = commands.indexOf('upload') !== -1;

    if (isUpload) {
      if (cb) {
        cb();
      }
      return {
        status: 503,
        body: JSON.stringify(fakeMetadata),
        headers: statusHeaders('active')
      };
    } else {
      return {
        status: 200,
        body: JSON.stringify(fakeMetadata),
        headers: statusHeaders('final')
      };
    }
  }
  return handler;
}

export function fakeOneShot503ServerHandler(
  fakeMetadata: Partial<Metadata> = defaultFakeMetadata
): RequestHandler {
  function statusHeaders(status: string, existing?: Headers): Headers {
    if (existing) {
      existing['X-Goog-Upload-Status'] = status;
      return existing;
    } else {
      return { 'X-Goog-Upload-Status': status };
    }
  }

  function handler(
    url: string,
    method: string,
    content?: ArrayBufferView | Blob | string | null,
    headers?: Headers
  ): Response {
    method = method || 'GET';
    content = content || '';
    headers = headers || {};

    return {
      status: 503,
      body: JSON.stringify(fakeMetadata),
      headers: statusHeaders('final')
    };
  }
  return handler;
}
