/**
 * @license
 * Copyright 2020 Google LLC
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
import { Stream } from '../../../src/remote/connection';
import { DatabaseId, DatabaseInfo } from '../../../src/core/database_info';
import { RestConnection } from '../../../src/remote/rest_connection';
import { Token } from '../../../src/api/credentials';
import { StringMap } from '../../../src/util/types';
import { Code, FirestoreError } from '../../../src/util/error';
import { User } from '../../../src/auth/user';
import { SDK_VERSION } from '../../../src/core/version';
import { Indexable } from '../../../src/util/misc';

export class TestRestConnection extends RestConnection {
  lastUrl: string = '';
  lastHeaders: StringMap = {};
  lastRequestBody: unknown = {};
  nextResponse = Promise.resolve<unknown>({});

  openStream<Req, Resp>(
    rpcName: string,
    token: Token | null
  ): Stream<Req, Resp> {
    throw new Error('Not Implemented');
  }

  protected performRPCRequest<Req, Resp>(
    rpcName: string,
    url: string,
    headers: StringMap,
    body: Req
  ): Promise<Resp> {
    this.lastUrl = url;
    this.lastRequestBody = (body as unknown) as Indexable;
    this.lastHeaders = headers;
    const response = this.nextResponse;
    this.nextResponse = Promise.resolve<unknown>({});
    return response as Promise<Resp>;
  }
}

describe('RestConnection', () => {
  const testDatabaseInfo = new DatabaseInfo(
    new DatabaseId('testproject'),
    'test-app-id',
    'persistenceKey',
    'example.com',
    /*ssl=*/ false,
    /*forceLongPolling=*/ false
  );
  const connection = new TestRestConnection(testDatabaseInfo);

  it('url uses from path', async () => {
    await connection.invokeRPC(
      'Commit',
      'projects/testproject/databases/(default)/documents',
      {},
      null
    );
    expect(connection.lastUrl).to.equal(
      'http://example.com/v1/projects/testproject/databases/(default)/documents:commit'
    );
  });

  it('merges headers', async () => {
    await connection.invokeRPC(
      'RunQuery',
      'projects/testproject/databases/(default)/documents/foo',
      {},
      {
        user: User.UNAUTHENTICATED,
        type: 'OAuth',
        authHeaders: { 'Authorization': 'Bearer owner' }
      }
    );
    expect(connection.lastHeaders).to.deep.equal({
      'Authorization': 'Bearer owner',
      'Content-Type': 'text/plain',
      'X-Firebase-GMPID': 'test-app-id',
      'X-Goog-Api-Client': `gl-js/ fire/${SDK_VERSION}`
    });
  });

  it('returns success', async () => {
    connection.nextResponse = Promise.resolve({ response: true });
    const response = await connection.invokeRPC(
      'RunQuery',
      'projects/testproject/databases/(default)/documents/coll',
      {},
      null
    );
    expect(response).to.deep.equal({ response: true });
  });

  it('returns error', () => {
    const error = new FirestoreError(Code.UNKNOWN, 'Test exception');
    connection.nextResponse = Promise.reject(error);
    return expect(
      connection.invokeRPC(
        'RunQuery',
        'projects/testproject/databases/(default)/documents/coll',
        {},
        null
      )
    ).to.be.eventually.rejectedWith(error);
  });
});
