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

import { EventEmitter } from 'events';

import { Metadata, status } from '@grpc/grpc-js';

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
    expect(connection.mockStub.lastMetadata?.get('x-goog-api-key')).toEqual([
      'grpc-connection-test-api-key'
    ]);
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
    ).toEqual(['console']);
    expect(connection.mockStub.lastMetadata?.get('x-custom-header')).toEqual([
      'val'
    ]);
  });

  describe('stub options', () => {
    it('sets default flow control window size to 256kb if not specified', () => {
      const spyConstructor = vi.fn();
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

      expect(spyConstructor).toHaveBeenCalledTimes(1);
      const options = spyConstructor.mock.calls[0][2];
      expect(options).toEqual({
        'grpc-node.flow_control_window': 256 * 1024,
        'grpc.max_receive_message_length': 17 * 1024 * 1024,
        'grpc.max_send_message_length': 17 * 1024 * 1024
      });
    });

    it('passes custom flow control window size if specified', () => {
      const spyConstructor = vi.fn();
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

      expect(spyConstructor).toHaveBeenCalledTimes(1);
      const options = spyConstructor.mock.calls[0][2];
      expect(options).toEqual({
        'grpc-node.flow_control_window': 512 * 1024,
        'grpc.max_receive_message_length': 17 * 1024 * 1024,
        'grpc.max_send_message_length': 17 * 1024 * 1024
      });
    });
  });

  describe('terminate()', () => {
    const flushAsync = (): Promise<void> =>
      new Promise(resolve => setImmediate(resolve));
    const channelClosedError = {
      code: status.UNAVAILABLE,
      message: '14 UNAVAILABLE: Channel closed before call started'
    };
    const createConnectionWithStub = (FirestoreStub: unknown): GrpcConnection =>
      new GrpcConnection(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { google: { firestore: { v1: { Firestore: FirestoreStub } } } } as any,
        testDatabaseInfo
      );

    it('ignores in-flight invokeStreamingRPC sync/async errors, data, and end events during and after terminate()', async () => {
      const streams = [new EventEmitter(), new EventEmitter()];
      let callIndex = 0;
      const conn = createConnectionWithStub(
        class {
          RunAggregationQuery(): EventEmitter {
            return streams[callIndex++];
          }
          close(): void {
            streams[0].emit('error', channelClosedError);
            process.nextTick(() => {
              streams[1].emit('data', { result: {} });
              streams[1].emit('end');
              streams[1].emit('error', channelClosedError);
            });
          }
        }
      );

      let settled = false;
      const markSettled = (): void => {
        settled = true;
      };
      void conn
        .invokeStreamingRPC(
          'RunAggregationQuery',
          ResourcePath.emptyPath(),
          {},
          null,
          null
        )
        .then(markSettled, markSettled);
      void conn
        .invokeStreamingRPC(
          'RunAggregationQuery',
          ResourcePath.emptyPath(),
          {},
          null,
          null,
          /*expectedResponseCount=*/ 1
        )
        .then(markSettled, markSettled);

      conn.terminate();
      await flushAsync();
      expect(settled).toBe(false);
    });

    it('ignores in-flight invokeRPC error and success callbacks during and after terminate()', async () => {
      const callbacks: Array<(err: unknown, resp?: unknown) => void> = [];
      const conn = createConnectionWithStub(
        class {
          Commit(
            _req: unknown,
            _metadata: Metadata,
            callback: (err: unknown, resp?: unknown) => void
          ): void {
            callbacks.push(callback);
          }
          close(): void {
            callbacks[0]?.(channelClosedError);
            process.nextTick(() => {
              callbacks[1]?.(undefined, { writeResults: [] });
            });
          }
        }
      );

      let settled = false;
      const markSettled = (): void => {
        settled = true;
      };
      void conn
        .invokeRPC('Commit', ResourcePath.emptyPath(), {}, null, null)
        .then(markSettled, markSettled);
      void conn
        .invokeRPC('Commit', ResourcePath.emptyPath(), {}, null, null)
        .then(markSettled, markSettled);

      conn.terminate();
      await flushAsync();
      expect(settled).toBe(false);
    });

    it('closes active stub once and does not recreate a stub for RPCs or streams after terminate()', async () => {
      const closeSpy = vi.fn();
      let constructorCalls = 0;
      const conn = createConnectionWithStub(
        class {
          constructor() {
            constructorCalls += 1;
          }
          Commit(
            _req: unknown,
            _metadata: Metadata,
            callback: (err: unknown, resp?: unknown) => void
          ): void {
            callback(undefined, {});
          }
          close(): void {
            closeSpy();
          }
        }
      );

      await conn.invokeRPC('Commit', ResourcePath.emptyPath(), {}, null, null);
      expect(constructorCalls).toBe(1);

      conn.terminate();
      conn.terminate();
      expect(closeSpy).toHaveBeenCalledTimes(1);

      let settled = false;
      const markSettled = (): void => {
        settled = true;
      };
      void conn
        .invokeRPC('Commit', ResourcePath.emptyPath(), {}, null, null)
        .then(markSettled, markSettled);
      void conn
        .invokeStreamingRPC(
          'RunAggregationQuery',
          ResourcePath.emptyPath(),
          {},
          null,
          null
        )
        .then(markSettled, markSettled);

      let streamOpened = false;
      const stream = conn.openStream('Listen', null, null);
      stream.onOpen(() => {
        streamOpened = true;
      });
      stream.send({});
      stream.close();

      await new Promise(resolve => setTimeout(resolve, 0));
      expect(constructorCalls).toBe(1);
      expect(settled).toBe(false);
      expect(streamOpened).toBe(false);
    });
  });
});
