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
import { assert } from 'chai';
import { FirebaseApp } from '../../../src/app/firebase_app';
import * as constants from '../../../src/storage/implementation/constants';
import {
  Code,
  FirebaseStorageError
} from '../../../src/storage/implementation/error';
import * as objectUtils from '../../../src/storage/implementation/object';
import * as promiseimpl from '../../../src/storage/implementation/promise_external';
import * as type from '../../../src/storage/implementation/type';
import { Headers, XhrIo } from '../../../src/storage/implementation/xhrio';
import { XhrIoPool } from '../../../src/storage/implementation/xhriopool';
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
  assert.throws(() => {
    try {
      f();
    } catch (e) {
      captured = e;
      throw e;
    }
  }, FirebaseStorageError);
  assert.equal(captured.code, code);
  return captured as FirebaseStorageError;
}

export function assertUint8ArrayEquals(arr1: Uint8Array, arr2: Uint8Array) {
  assert.equal(arr1.length, arr2.length);

  for (let i = 0; i < arr1.length; i++) {
    assert.equal(arr1[i], arr2[i]);
  }
}

export function assertObjectIncludes(
  included: { [name: string]: any },
  obj: { [name: string]: any }
): void {
  objectUtils.forEach(included, function(key, val) {
    assert.deepEqual(val, obj[key]);
  });
}
