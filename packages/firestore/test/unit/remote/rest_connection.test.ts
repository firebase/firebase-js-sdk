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

import { AppCheckToken, OAuthToken, Token } from '../../../src/api/credentials';
import { User } from '../../../src/auth/user';
import { DatabaseId, DatabaseInfo } from '../../../src/core/database_info';
import { SDK_VERSION } from '../../../src/core/version';
import { ResourcePath } from '../../../src/model/path';
import { Stream } from '../../../src/remote/connection';
import { RestConnection } from '../../../src/remote/rest_connection';
import { Code, FirestoreError } from '../../../src/util/error';
import { Indexable } from '../../../src/util/misc';
import { StringMap } from '../../../src/util/types';

export class TestRestConnection extends RestConnection {
  lastUrl: string = '';
  lastHeaders: StringMap = {};
  lastRequestBody: unknown = {};
  nextResponse = Promise.resolve<unknown>({});

  openStream<Req, Resp>(
    rpcName: string,
    authToken: Token | null,
    appCheckToken: Token | null
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
    this.lastRequestBody = body as unknown as Indexable;
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
    /*forceLongPolling=*/ false,
    /*autoDetectLongPolling=*/ false,
    /*longPollingOptions=*/ {},
    /*useFetchStreams=*/ false,
    /*isUsingEmulator=*/ false
  );
  const connection = new TestRestConnection(testDatabaseInfo);

  it('url uses from path', async () => {
    await connection.invokeRPC(
      'Commit',
      new ResourcePath(
        'projects/testproject/databases/(default)/documents'.split('/')
      ),
      {},
      null,
      null
    );
    expect(connection.lastUrl).to.equal(
      'http://example.com/v1/projects/testproject/databases/(default)/documents:commit'
    );
  });

  it('merges headers', async () => {
    await connection.invokeRPC(
      'RunQuery',
      new ResourcePath(
        'projects/testproject/databases/(default)/documents/foo'.split('/')
      ),
      {},
      new OAuthToken('owner', User.UNAUTHENTICATED),
      new AppCheckToken('some-app-check-token')
    );
    expect(connection.lastHeaders).to.deep.equal({
      'Authorization': 'Bearer owner',
      'Content-Type': 'text/plain',
      'X-Firebase-GMPID': 'test-app-id',
      'X-Goog-Api-Client': `gl-js/ fire/${SDK_VERSION}`,
      'x-firebase-appcheck': 'some-app-check-token',
      'x-goog-request-params': 'project_id=testproject',
      'google-cloud-resource-prefix': 'projects/testproject/databases/(default)'
    });
  });

  it('empty app check token is not added to headers', async () => {
    await connection.invokeRPC(
      'RunQuery',
      new ResourcePath(
        'projects/testproject/databases/(default)/documents/foo'.split('/')
      ),
      {},
      null,
      new AppCheckToken('')
    );
    expect(connection.lastHeaders).to.deep.equal({
      'Content-Type': 'text/plain',
      'X-Firebase-GMPID': 'test-app-id',
      'X-Goog-Api-Client': `gl-js/ fire/${SDK_VERSION}`,
      'x-goog-request-params': 'project_id=testproject',
      'google-cloud-resource-prefix': 'projects/testproject/databases/(default)'
      // Note: AppCheck token should not exist here.
    });
  });

  it('returns success', async () => {
    connection.nextResponse = Promise.resolve({ response: true });
    const response = await connection.invokeRPC(
      'RunQuery',
      new ResourcePath(
        'projects/testproject/databases/(default)/documents/coll'.split('/')
      ),
      {},
      null,
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
        new ResourcePath(
          'projects/testproject/databases/(default)/documents/coll'.split('/')
        ),
        {},
        null,
        null
      )
    ).to.be.eventually.rejectedWith(error);
  });
});
