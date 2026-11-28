/**
 * @license
 * Copyright 2024 Google LLC
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

import { initializeApp } from '@firebase/app';
import {
  FirebaseAuthInternal,
  FirebaseAuthTokenData
} from '@firebase/auth-interop-types';

import { DataConnectOptions, QueryRef, queryRef, subscribe } from '../../src';
import {
  AuthTokenListener,
  AuthTokenProvider
} from '../../src/core/FirebaseAuthProvider';
import { DataConnectTransportManager } from '../../src/network/manager';
import { initializeFetch, RESTTransport } from '../../src/network/rest';
import { initDatabase } from '../util';
const options: DataConnectOptions = {
  connector: 'c',
  location: 'l',
  projectId: 'p',
  service: 's'
};
const INITIAL_TOKEN = 'initial token';
class FakeAuthProvider implements AuthTokenProvider {
  getAuth(): FirebaseAuthInternal {
    throw new Error('Method not implemented.');
  }
  private token: string | null = INITIAL_TOKEN;
  addTokenChangeListener(listener: AuthTokenListener): void {}
  getToken(forceRefresh: boolean): Promise<FirebaseAuthTokenData | null> {
    if (!forceRefresh) {
      return Promise.resolve({ accessToken: this.token! });
    }
    return Promise.resolve({ accessToken: 'testToken' });
  }
  setToken(_token: string | null): void {
    this.token = _token;
  }
}
const json = {
  message: 'unauthorized'
};

const fakeFetchImpl = vi.fn();
interface PostVariables {
  testId: string;
}
const TEST_ID = crypto.randomUUID();
interface PostListResponse {
  posts: Post[];
}
interface Post {
  id: string;
  description: string;
}
function getPostsRef(): QueryRef<PostListResponse, PostVariables> {
  const dc = initDatabase();
  return queryRef<PostListResponse, PostVariables>(dc, 'ListPosts', {
    testId: TEST_ID
  });
}
describe('Queries', () => {
  beforeEach(() => {
    fakeFetchImpl.mockResolvedValue({
      json: () => {
        return Promise.resolve(json);
      },
      status: 401
    } as Response);
    initializeApp({
      projectId: 'p'
    });
    vi.spyOn(
      DataConnectTransportManager.prototype,
      'invokeSubscribe'
    ).mockReturnValue();
    vi.spyOn(
      DataConnectTransportManager.prototype,
      'invokeUnsubscribe'
    ).mockReturnValue();
  });
  afterEach(() => {
    initializeFetch(globalThis.fetch);
  });
  it('should call onComplete callback after subscribe is called', async () => {
    const taskListQuery = getPostsRef();
    const onCompleteUserStub = vi.fn();
    const unsubscribe = subscribe(taskListQuery, {
      onNext: () => {},
      onComplete: onCompleteUserStub
    });
    expect(onCompleteUserStub).not.toHaveBeenCalled();
    unsubscribe();
    expect(onCompleteUserStub).toHaveBeenCalledTimes(1);
  });
  it('should call onErr callback after a 401 occurs', async () => {
    const json = {};
    const throwErrorFakeImpl = vi.fn().mockReturnValue(
      Promise.resolve({
        json: () => {
          return Promise.resolve(json);
        },
        status: 401
      } as Response)
    );
    initializeFetch(throwErrorFakeImpl);
    const taskListQuery = getPostsRef();
    const onErrStub = vi.fn();
    let unsubscribeFn: (() => void) | null = null;
    const promise = new Promise((resolve, reject) => {
      unsubscribeFn = subscribe(taskListQuery, {
        onNext: () => {
          resolve(null);
        },
        onComplete: () => {},
        onErr: err => {
          onErrStub();
          reject(err);
        }
      });
    });
    expect(onErrStub).not.toHaveBeenCalled();
    await expect(promise).rejects.toThrow();
    expect(onErrStub).toHaveBeenCalledTimes(1);
    unsubscribeFn!();
  });
  it('should call onErr callback after a graphql error occurs', async () => {
    const json = {
      errors: [{ something: 'abc' }]
    };
    const throwErrorFakeImpl = vi.fn().mockReturnValue(
      Promise.resolve({
        json: () => {
          return Promise.resolve(json);
        },
        status: 200
      } as Response)
    );
    initializeFetch(throwErrorFakeImpl);
    const taskListQuery = getPostsRef();
    const onErrStub = vi.fn();
    let unsubscribeFn: (() => void) | null = null;
    const promise = new Promise((resolve, reject) => {
      unsubscribeFn = subscribe(taskListQuery, {
        onNext: () => {
          resolve(null);
        },
        onComplete: () => {},
        onErr: err => {
          onErrStub();
          reject(err);
        }
      });
    });
    expect(onErrStub).not.toHaveBeenCalled();
    await expect(promise).rejects.toThrow();
    expect(onErrStub).toHaveBeenCalledTimes(1);
    unsubscribeFn!();
    initializeFetch(globalThis.fetch);
  });
  it('[QUERY] should retry auth whenever the fetcher returns with unauthorized', async () => {
    initializeFetch(fakeFetchImpl);
    const authProvider = new FakeAuthProvider();
    const rt = new RESTTransport(options, undefined, undefined, authProvider);
    await expect(rt.invokeQuery('test', null)).rejects.toThrow(json.message);
    expect(fakeFetchImpl.mock.calls.length).toBe(2);
  });
  it('[MUTATION] should retry auth whenever the fetcher returns with unauthorized', async () => {
    initializeFetch(fakeFetchImpl);
    const authProvider = new FakeAuthProvider();
    const rt = new RESTTransport(options, undefined, undefined, authProvider);
    await expect(rt.invokeMutation('test', null)).rejects.toThrow(json.message);
    expect(fakeFetchImpl.mock.calls.length).toBe(2);
  });
  it("should not retry auth whenever the fetcher returns with unauthorized and the token doesn't change", async () => {
    initializeFetch(fakeFetchImpl);
    const authProvider = new FakeAuthProvider();
    const rt = new RESTTransport(options, undefined, undefined, authProvider);
    rt._setLastToken('initial token');
    await expect(
      rt.invokeQuery('test', null) as Promise<unknown>
    ).rejects.toThrow(json.message);
    expect(fakeFetchImpl.mock.calls.length).toBe(1);
  });
});
