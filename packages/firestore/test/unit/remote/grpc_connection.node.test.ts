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

    it('ignores in-flight invokeStreamingRPC errors emitted synchronously during terminate()', async () => {
      const stream = new EventEmitter();
      const mockProtos = {
        google: {
          firestore: {
            v1: {
              Firestore: class {
                RunAggregationQuery(): EventEmitter {
                  return stream;
                }
                close(): void {
                  stream.emit('error', {
                    code: status.UNAVAILABLE,
                    message:
                      '14 UNAVAILABLE: Channel closed before call started'
                  });
                }
              }
            }
          }
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const conn = new GrpcConnection(mockProtos as any, testDatabaseInfo);
      let settled = false;
      void conn
        .invokeStreamingRPC(
          'RunAggregationQuery',
          ResourcePath.emptyPath(),
          {},
          null,
          null
        )
        .then(
          () => {
            settled = true;
          },
          () => {
            settled = true;
          }
        );

      conn.terminate();
      await flushAsync();
      expect(settled).toBe(false);
    });

    it('ignores in-flight invokeStreamingRPC data, end, and async nextTick errors after terminate()', async () => {
      const stream = new EventEmitter();
      const mockProtos = {
        google: {
          firestore: {
            v1: {
              Firestore: class {
                RunAggregationQuery(): EventEmitter {
                  return stream;
                }
                close(): void {
                  process.nextTick(() => {
                    stream.emit('data', { result: {} });
                    stream.emit('end');
                    stream.emit('error', {
                      code: status.UNAVAILABLE,
                      message:
                        '14 UNAVAILABLE: Channel closed before call started'
                    });
                  });
                }
              }
            }
          }
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const conn = new GrpcConnection(mockProtos as any, testDatabaseInfo);
      let settled = false;
      void conn
        .invokeStreamingRPC(
          'RunAggregationQuery',
          ResourcePath.emptyPath(),
          {},
          null,
          null,
          /*expectedResponseCount=*/ 1
        )
        .then(
          () => {
            settled = true;
          },
          () => {
            settled = true;
          }
        );

      conn.terminate();
      await flushAsync();
      expect(settled).toBe(false);
    });

    it('ignores in-flight invokeRPC error and success callbacks during and after terminate()', async () => {
      const callbacks: Array<(err: unknown, resp?: unknown) => void> = [];
      const mockProtos = {
        google: {
          firestore: {
            v1: {
              Firestore: class {
                Commit(
                  _req: unknown,
                  _metadata: Metadata,
                  callback: (err: unknown, resp?: unknown) => void
                ): void {
                  callbacks.push(callback);
                }
                close(): void {
                  // Synchronous error callback during close()
                  callbacks[0]?.({
                    code: status.UNAVAILABLE,
                    message:
                      '14 UNAVAILABLE: Channel closed before call started'
                  });
                  // Asynchronous success and error callbacks after close()
                  process.nextTick(() => {
                    callbacks[1]?.(undefined, { writeResults: [] });
                    callbacks[2]?.({
                      code: status.UNAVAILABLE,
                      message:
                        '14 UNAVAILABLE: Channel closed before call started'
                    });
                  });
                }
              }
            }
          }
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const conn = new GrpcConnection(mockProtos as any, testDatabaseInfo);
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
      const mockProtos = {
        google: {
          firestore: {
            v1: {
              Firestore: class {
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
            }
          }
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const conn = new GrpcConnection(mockProtos as any, testDatabaseInfo);

      // 1. Initial RPC creates the stub.
      await conn.invokeRPC('Commit', ResourcePath.emptyPath(), {}, null, null);
      expect(constructorCalls).toBe(1);

      // 2. terminate() closes and clears the cached stub; repeated terminate() is a no-op.
      conn.terminate();
      conn.terminate();
      expect(closeSpy).toHaveBeenCalledTimes(1);

      // 3. Subsequent RPCs and openStream() do not construct a second stub or settle.
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

      await new Promise(resolve => setTimeout(resolve, 10));
      expect(constructorCalls).toBe(1);
      expect(settled).toBe(false);
      expect(streamOpened).toBe(false);
    });
  });
});
