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
import { FirebaseAuthInternal, FirebaseAuthTokenData } from '@firebase/auth-interop-types';
import { expect } from 'chai';
import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';

import { DataConnectOptions, QueryRef, queryRef, subscribe } from '../../src';
import {
  AuthTokenListener,
  AuthTokenProvider
} from '../../src/core/FirebaseAuthProvider';
import { initializeFetch } from '../../src/network/fetch';
import { RESTTransport } from '../../src/network/transport/rest';
import { initDatabase } from '../util';
chai.use(chaiAsPromised);
chai.use(sinonChai);
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

const fakeFetchImpl = sinon.stub().returns(
  Promise.resolve({
    json: () => {
      return Promise.resolve(json);
    },
    status: 401
  } as Response)
);
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
    initializeApp({
      projectId: 'p'
    });
  });
  afterEach(() => {
    fakeFetchImpl.resetHistory();
  });
  it('should call onComplete callback after subscribe is called', async () => {
    const taskListQuery = getPostsRef();
    const onCompleteUserStub = sinon.stub();
    const unsubscribe = subscribe(taskListQuery, {
      onNext: () => {},
      onComplete: onCompleteUserStub
    });
    expect(onCompleteUserStub).to.not.have.been.called;
    unsubscribe();
    expect(onCompleteUserStub).to.have.been.calledOnce;
  });
  it('should call onErr callback after a 401 occurs', async () => {
    const json = {};
    const throwErrorFakeImpl = sinon.stub().returns(
      Promise.resolve({
        json: () => {
          return Promise.resolve(json);
        },
        status: 401
      } as Response)
    );
    initializeFetch(throwErrorFakeImpl);
    const taskListQuery = getPostsRef();
    const onErrStub = sinon.stub();
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
    expect(onErrStub).not.to.have.been.called;
    await expect(promise).to.have.eventually.been.rejected;
    expect(onErrStub).to.have.been.calledOnce;
    unsubscribeFn!();
  });
  it('should call onErr callback after a graphql error occurs', async () => {
    const json = {
      errors: [{ something: 'abc' }]
    };
    const throwErrorFakeImpl = sinon.stub().returns(
      Promise.resolve({
        json: () => {
          return Promise.resolve(json);
        },
        status: 200
      } as Response)
    );
    initializeFetch(throwErrorFakeImpl);
    const taskListQuery = getPostsRef();
    const onErrStub = sinon.stub();
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
    expect(onErrStub).not.to.have.been.called;
    await expect(promise).to.have.eventually.been.rejected;
    expect(onErrStub).to.have.been.calledOnce;
    unsubscribeFn!();
    initializeFetch(globalThis.fetch);
  });
  it('[QUERY] should retry auth whenever the fetcher returns with unauthorized', async () => {
    initializeFetch(fakeFetchImpl);
    const authProvider = new FakeAuthProvider();
    const rt = new RESTTransport(options, undefined, undefined, authProvider);
    await expect(rt.invokeQuery('test', null)).to.eventually.be.rejectedWith(
      json.message
    );
    expect(fakeFetchImpl.callCount).to.eq(2);
  });
  it('[MUTATION] should retry auth whenever the fetcher returns with unauthorized', async () => {
    initializeFetch(fakeFetchImpl);
    const authProvider = new FakeAuthProvider();
    const rt = new RESTTransport(options, undefined, undefined, authProvider);
    await expect(rt.invokeMutation('test', null)).to.eventually.be.rejectedWith(
      json.message
    );
    expect(fakeFetchImpl.callCount).to.eq(2);
  });
  it("should not retry auth whenever the fetcher returns with unauthorized and the token doesn't change", async () => {
    initializeFetch(fakeFetchImpl);
    const authProvider = new FakeAuthProvider();
    const rt = new RESTTransport(options, undefined, undefined, authProvider);
    rt._setLastToken('initial token');
    await expect(
      rt.invokeQuery('test', null) as Promise<unknown>
    ).to.eventually.be.rejectedWith(json.message);
    expect(fakeFetchImpl.callCount).to.eq(1);
  });
});
