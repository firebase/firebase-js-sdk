/**
 * @license
 * Copyright 2025 Google LLC
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

import { Metadata } from '@grpc/grpc-js';
import { expect } from 'chai';

import { DatabaseId, DatabaseInfo } from '../../../src/core/database_info';
import { ResourcePath } from '../../../src/model/path';
import { GrpcConnection } from '../../../src/platform/node/grpc_connection';

export class TestGrpcConnection extends GrpcConnection {
  mockStub = {
    lastMetadata: null,
    mockRpc(
      req: unknown,
      metadata: Metadata,
      callback: (err: unknown, resp: unknown) => void
    ) {
      this.lastMetadata = metadata;
      callback(null, null);
    }
  } as {
    lastMetadata: null | Metadata;
    [index: string]: unknown;
  };

  protected ensureActiveStub(): unknown {
    return this.mockStub;
  }
}

describe('GrpcConnection', () => {
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
    /*isUsingEmulator=*/ false,
    'grpc-connection-test-api-key'
  );
  const connection = new TestGrpcConnection(
    { google: { firestore: { v1: {} } } },
    testDatabaseInfo
  );

  it('Passes the API Key from DatabaseInfo to the grpc stub', async () => {
    const request = {
      database: 'projects/testproject/databases/(default)',
      writes: []
    };
    await connection.invokeRPC(
      'mockRpc',
      ResourcePath.emptyPath(),
      request,
      null,
      null
    );
    expect(
      connection.mockStub.lastMetadata?.get('x-goog-api-key')
    ).to.deep.equal(['grpc-connection-test-api-key']);
  });
});
