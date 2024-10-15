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
import { FirebaseAuthTokenData } from '@firebase/auth-interop-types';
import { expect } from 'chai';
import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import {
  DataConnectOptions,
  getDataConnect,
  MUTATION_STR,
  QUERY_STR,
  QueryRef
} from '../../src';
import { Code, DataConnectError } from '../../src/core/error';
import {
  AuthTokenListener,
  AuthTokenProvider
} from '../../src/core/FirebaseAuthProvider';
import { QueryManager } from '../../src/core/QueryManager';
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

describe('Query Manager Tests', () => {
  it('should refuse to make requests to execute non-query operations', async () => {
    const authProvider = new FakeAuthProvider();
    const rt = new RESTTransport(options, undefined, undefined, authProvider);
    const qm = new QueryManager(rt);
    const app = initializeApp({ projectId: 'p' });
    const dc = getDataConnect(app, {
      connector: 'c',
      location: 'l',
      service: 's'
    });

    const mutationRef: QueryRef<string, string> = {
      name: 'm',
      variables: 'v',
      dataConnect: dc,
      refType: MUTATION_STR as 'query'
    };

    const queryRef: QueryRef<string, string> = {
      name: 'm',
      variables: 'v',
      dataConnect: dc,
      refType: QUERY_STR
    };

    const error = new DataConnectError(
      Code.INVALID_ARGUMENT,
      `ExecuteQuery can only execute query operation`
    );

    expect(() => qm.executeQuery(mutationRef)).to.throw(error.message);
    expect(() => qm.executeQuery(queryRef)).to.not.throw(error.message);
  });
});
