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

import { FirebaseAuthTokenData } from '@firebase/auth-interop-types';
import { expect } from 'chai';
import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';

import { DataConnectOptions } from '../../src';
import {
  AuthTokenListener,
  AuthTokenProvider
} from '../../src/core/FirebaseAuthProvider';
import { initializeFetch } from '../../src/network/fetch';
import { RESTTransport } from '../../src/network/transport/rest';
chai.use(chaiAsPromised);
const options: DataConnectOptions = {
  connector: 'c',
  location: 'l',
  projectId: 'p',
  service: 's'
};
const INITIAL_TOKEN = 'initial token';
class FakeAuthProvider implements AuthTokenProvider {
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

function getFakeFetchImpl(data: unknown, status: number): sinon.SinonStub {
  return sinon.stub().returns(
    Promise.resolve({
      json: () => {
        return Promise.resolve({ data, errors: [] });
      },
      status
    } as Response)
  );
}

describe('Cache', () => {
  let fakeFetchImpl: sinon.SinonStub;
  afterEach(() => {
    fakeFetchImpl.resetHistory();
  });
  it('PLAYGROUND', async () => {
    const data = {
      movies: []
    };
    fakeFetchImpl = getFakeFetchImpl(data, 200);
    initializeFetch(fakeFetchImpl);
    const authProvider = new FakeAuthProvider();
    const rt = new RESTTransport(options, undefined, undefined, authProvider);
    const fetchResult = await rt.invokeQuery('test', null);
    expect(fetchResult.data).to.equal({ data, errors: [] });
  });
});
