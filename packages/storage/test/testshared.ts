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
import { FirebaseApp } from '@firebase/app';
import * as constants from '../src/implementation/constants';
import {
  Code,
  FirebaseStorageError
} from '../src/implementation/error';
import * as objectUtils from '../src/implementation/object';
import * as promiseimpl from '../src/implementation/promise_external';
import * as type from '../src/implementation/type';
import { Headers, XhrIo } from '../src/implementation/xhrio';
import { XhrIoPool } from '../src/implementation/xhriopool';
import { SendHook, StringHeaders, TestingXhrIo } from './xhrio';

export const authToken = 'totally-legit-auth-token';
export const bucket = 'mybucket';
export const fakeApp = makeFakeApp({ accessToken: authToken });
export const fakeAppNoAuth = makeFakeApp(null);

export function makeFakeApp(
  token: Object | null,
  bucket_arg?: string
): FirebaseApp {
  const app: any = {};
  app.INTERNAL = {};
  app.INTERNAL.getToken = function() {
    return promiseimpl.resolve(token);
  };
  app.options = {};
  if (type.isDef(bucket_arg)) {
    app.options[constants.configOption] = bucket_arg;
  } else {
    app.options[constants.configOption] = bucket;
  }
  return app as FirebaseApp;
}

export function makePool(sendHook: SendHook): XhrIoPool {
  const pool: any = {
    createXhrIo: function() {
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
  objectUtils.forEach(headers, function(key: string, val: string | number) {
    lower[key.toLowerCase()] = val.toString();
  });

  const fakeXhrIo: any = {
    getResponseHeader: function(name: string): string {
      const lowerName = name.toLowerCase();
      if (objectUtils.contains(lower, lowerName)) {
        return lower[lowerName];
      } else {
        throw new Error('No such header ' + name);
      }
    },
    getStatus: function(): number {
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
  expect(captured).to.be.an.instanceof(FirebaseStorageError);  
  expect(captured.code).to.equal(code);
  return captured as FirebaseStorageError;
}

export function assertUint8ArrayEquals(arr1: Uint8Array, arr2: Uint8Array) {
  expect(arr1.length).to.equal(arr2.length);

  for (let i = 0; i < arr1.length; i++) {
    expect(arr1[i]).to.equal(arr2[i]);
  }
}

export function assertObjectIncludes(
  included: { [name: string]: any },
  obj: { [name: string]: any }
): void {
  objectUtils.forEach(included, function(key, val) {
    expect(val).to.deep.equal(obj[key]);
  });
}
