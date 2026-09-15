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
import * as sinon from 'sinon';

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
    'grpc-connection-test-api-key',
    { 'x-goog-firestore-api-requester': 'console', 'x-custom-header': 'val' }
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

  it('Passes custom headers from DatabaseInfo to the grpc stub', async () => {
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
      connection.mockStub.lastMetadata?.get('x-goog-firestore-api-requester')
    ).to.deep.equal(['console']);
    expect(
      connection.mockStub.lastMetadata?.get('x-custom-header')
    ).to.deep.equal(['val']);
  });

  describe('stub options', () => {
    it('sets default flow control window size to 256kb if not specified', () => {
      const spyConstructor = sinon.spy();
      const mockProtos = {
        google: {
          firestore: {
            v1: {
              Firestore: spyConstructor
            }
          }
        }
      };

      const dbInfo = new DatabaseInfo(
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
        'api-key'
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const conn = new GrpcConnection(mockProtos as any, dbInfo);
      // Trigger stub creation
      conn['ensureActiveStub']();

      expect(spyConstructor.calledOnce).to.be.true;
      const options = spyConstructor.firstCall.args[2];
      expect(options).to.deep.equal({
        'grpc-node.flow_control_window': 256 * 1024,
        'grpc.max_receive_message_length': 17 * 1024 * 1024,
        'grpc.max_send_message_length': 17 * 1024 * 1024
      });
    });

    it('passes custom flow control window size if specified', () => {
      const spyConstructor = sinon.spy();
      const mockProtos = {
        google: {
          firestore: {
            v1: {
              Firestore: spyConstructor
            }
          }
        }
      };

      const dbInfo = new DatabaseInfo(
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
        'api-key',
        /*_customHeaders=*/ undefined,
        /*grpcFlowControlWindow=*/ 512 * 1024
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const conn = new GrpcConnection(mockProtos as any, dbInfo);
      // Trigger stub creation
      conn['ensureActiveStub']();

      expect(spyConstructor.calledOnce).to.be.true;
      const options = spyConstructor.firstCall.args[2];
      expect(options).to.deep.equal({
        'grpc-node.flow_control_window': 512 * 1024,
        'grpc.max_receive_message_length': 17 * 1024 * 1024,
        'grpc.max_send_message_length': 17 * 1024 * 1024
      });
    });
  });
});
