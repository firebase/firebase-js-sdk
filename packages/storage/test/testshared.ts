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
import { FirebaseApp } from '@firebase/app-types';
import * as constants from '../src/implementation/constants';
import { Code, FirebaseStorageError } from '../src/implementation/error';
import * as type from '../src/implementation/type';
import { Headers, XhrIo } from '../src/implementation/xhrio';
import { XhrIoPool } from '../src/implementation/xhriopool';
import { SendHook, StringHeaders, TestingXhrIo } from './xhrio';

export const authToken = 'totally-legit-auth-token';
export const bucket = 'mybucket';
export const fakeApp = makeFakeApp({ accessToken: authToken });
export const fakeAppNoAuth = makeFakeApp(null);

export function makeFakeApp(token: {} | null, bucketArg?: string): FirebaseApp {
  const app: any = {};
  app.INTERNAL = {};
  app.INTERNAL.getToken = function() {
    return Promise.resolve(token);
  };
  app.options = {};
  if (type.isDef(bucketArg)) {
    app.options[constants.CONFIG_STORAGE_BUCKET_KEY] = bucketArg;
  } else {
    app.options[constants.CONFIG_STORAGE_BUCKET_KEY] = bucket;
  }
  return app as FirebaseApp;
}

export function makePool(sendHook: SendHook | null): XhrIoPool {
  const pool: any = {
    createXhrIo() {
      return new TestingXhrIo(sendHook);
    }
  };
  return pool as XhrIoPool;
}

/**
 * Returns something that looks like an fbs.XhrIo with the given headers
 * and status.
 */
export function fakeXhrIo(headers: Headers, status: number = 200): XhrIo {
  const lower: StringHeaders = {};
  for (const [key, value] of Object.entries(headers)) {
    lower[key.toLowerCase()] = value.toString();
  }

  const fakeXhrIo: any = {
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

  return fakeXhrIo as XhrIo;
}

/**
 * Binds ignoring types. Used to test calls involving improper arguments.
 */
export function bind(f: Function, ctx: any, ...args: any[]): () => void {
  return () => {
    f.apply(ctx, args);
  };
}

export function assertThrows(f: () => void, code: Code): FirebaseStorageError {
  let captured: FirebaseStorageError | null = null;
  expect(() => {
    try {
      f();
    } catch (e) {
      captured = e;
      throw e;
    }
  }).to.throw();
  // @ts-ignore Compiler does not know callback is invoked immediately and
  // thinks catch block is unreachable. This is an open TS issue:
  // https://github.com/microsoft/TypeScript/issues/11498
  expect(captured).to.be.an.instanceof(FirebaseStorageError);
  // @ts-ignore See above.
  expect(captured.code).to.equal(code);
  // @ts-ignore See above.
  return captured as FirebaseStorageError;
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
