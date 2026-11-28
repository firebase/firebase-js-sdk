/**
 * @license
 * Copyright 2026 Google LLC
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

import { DataConnectOptions } from '../../src/api/DataConnect';
import { Code } from '../../src/core/error';
import {
  DataConnectResponse,
  DataConnectResponseWithMaxAge,
  SubscribeObserver
} from '../../src/network';
import { DataConnectTransportManager } from '../../src/network/manager';
import { RESTTransport } from '../../src/network/rest';
import { AbstractDataConnectStreamTransport } from '../../src/network/stream/streamTransport';
import { WebSocketTransport } from '../../src/network/stream/websocket';

/** Interface that exposes private fields of stream transport for testing purposes. */
interface StreamTransportWithInternals {
  onStreamClose(code: number, reason: string): void;
  rejectAllRequests(code: string, reason: string): void;
}

/** Interface that exposes private fields of TransportManager for testing purposes. */
interface ManagerWithInternals {
  invokeQuery<Data, Variables>(
    queryName: string,
    body?: Variables
  ): Promise<DataConnectResponseWithMaxAge<Data>>;
  invokeMutation<Data, Variables>(
    queryName: string,
    body?: Variables
  ): Promise<DataConnectResponse<Data>>;
  invokeSubscribe<Data, Variables>(
    observer: SubscribeObserver<Data>,
    queryName: string,
    body?: Variables
  ): void;
  invokeUnsubscribe<Variables>(queryName: string, body?: Variables): void;
  useEmulator(host: string, port?: number, sslEnabled?: boolean): void;
  onAuthTokenChanged: (token: string | null) => void;
  restTransport: RESTTransport;
  streamTransport?: AbstractDataConnectStreamTransport;
  initStreamTransport(): AbstractDataConnectStreamTransport;
  executeShouldUseStream(): boolean;
}

describe('DataConnectTransportManager', () => {
  let manager: ManagerWithInternals;
  const options: DataConnectOptions = {
    projectId: 'test-project',
    location: 'us-central1',
    connector: 'test-connector',
    service: 'test-service'
  };

  beforeEach(() => {
    manager = new DataConnectTransportManager(
      options
    ) as unknown as ManagerWithInternals;
  });

  interface TestVariables {
    key: string;
  }
  const queryName1 = 'testQuery1';
  // const queryName2 = 'testQuery2';
  const mutationName1 = 'testMutation1';
  const variables1: TestVariables = { key: 'one' };
  // const variables2: TestVariables = { key: 'two' };

  interface TestData {
    value: number;
  }
  const testResponse = { data: { value: 1 } } as DataConnectResponse<TestData>;

  const expectedError = new Error('stream error');

  describe('stream transport initialization', () => {
    it('initStreamTransport should initialize stream transport only once', () => {
      expect(manager.streamTransport).toBeUndefined();

      const transport1 = manager.initStreamTransport();
      expect(transport1).toBeDefined();
      expect(manager.streamTransport).toBe(transport1);

      const transport2 = manager.initStreamTransport();
      expect(transport2).toBe(transport1);
    });
  });

  describe('default transport routing', () => {
    interface StubRestTransport {
      invokeQuery: ReturnType<typeof vi.fn>;
      invokeMutation: ReturnType<typeof vi.fn>;
      invokeSubscribe: ReturnType<typeof vi.fn>;
      invokeUnsubscribe: ReturnType<typeof vi.fn>;
      useEmulator: ReturnType<typeof vi.fn>;
      onAuthTokenChanged: ReturnType<typeof vi.fn>;
    }
    interface StubStreamTransport extends StubRestTransport {
      hasActiveSubscriptions: boolean;
    }
    let stubRestTransport: StubRestTransport;
    let stubStreamTransport: StubStreamTransport;
    let initStreamStub: ReturnType<typeof vi.spyOn>;
    beforeEach(() => {
      stubRestTransport = {
        invokeQuery: vi.fn(),
        invokeMutation: vi.fn(),
        invokeSubscribe: vi.fn(),
        invokeUnsubscribe: vi.fn(),
        useEmulator: vi.fn(),
        onAuthTokenChanged: vi.fn()
      };
      stubStreamTransport = {
        invokeQuery: vi.fn(),
        invokeMutation: vi.fn(),
        invokeSubscribe: vi.fn(),
        invokeUnsubscribe: vi.fn(),
        useEmulator: vi.fn(),
        onAuthTokenChanged: vi.fn(),
        hasActiveSubscriptions: false
      };
      manager.restTransport = stubRestTransport as unknown as RESTTransport;
      initStreamStub = vi
        .spyOn(manager, 'initStreamTransport')
        .mockImplementation(() => {
          manager.streamTransport =
            stubStreamTransport as unknown as AbstractDataConnectStreamTransport;
          return stubStreamTransport as unknown as AbstractDataConnectStreamTransport;
        });
    });

    it('stream transport should not be initialized by default', () => {
      expect(manager.streamTransport).toBeUndefined();
      expect(initStreamStub).not.toHaveBeenCalled();
    });

    it('invokeQuery should route to REST by default and not initialize stream transport', async () => {
      stubRestTransport.invokeQuery.mockResolvedValue(testResponse);
      await manager.invokeQuery<TestData, TestVariables>(
        queryName1,
        variables1
      );
      expect(stubRestTransport.invokeQuery).toHaveBeenCalledWith(
        queryName1,
        variables1
      );
      expect(manager.streamTransport).toBeUndefined();
      expect(initStreamStub).not.toHaveBeenCalled();
    });

    it('invokeMutation should route to REST by default and not initialize stream transport', async () => {
      stubRestTransport.invokeMutation.mockResolvedValue(testResponse);
      await manager.invokeMutation<TestData, TestVariables>(
        mutationName1,
        variables1
      );
      expect(stubRestTransport.invokeMutation).toHaveBeenCalledWith(
        mutationName1,
        variables1
      );
      expect(manager.streamTransport).toBeUndefined();
      expect(initStreamStub).not.toHaveBeenCalled();
    });

    it('invokeSubscribe should route to streaming by default and initialize stream transport', () => {
      const observer: SubscribeObserver<TestData> = {
        onData: () => {},
        onDisconnect: () => {},
        onError: () => {}
      };
      manager.invokeSubscribe<TestData, TestVariables>(
        observer,
        queryName1,
        variables1
      );
      expect(stubRestTransport.invokeSubscribe).not.toHaveBeenCalled();
      expect(stubStreamTransport.invokeSubscribe).toHaveBeenCalledWith(
        observer,
        queryName1,
        variables1
      );
      expect(manager.streamTransport).toBeDefined();
      expect(initStreamStub).toHaveBeenCalled();
    });

    it('invokeUnsubscribe should route to streaming by default when stream transport is already initialized and not initialize stream transport', () => {
      manager.invokeUnsubscribe(queryName1, variables1);
      expect(manager.streamTransport).toBeUndefined();
      expect(initStreamStub).not.toHaveBeenCalled();
      expect(stubRestTransport.invokeUnsubscribe).not.toHaveBeenCalled();
      expect(stubStreamTransport.invokeUnsubscribe).not.toHaveBeenCalled();

      manager.initStreamTransport();
      manager.invokeUnsubscribe(queryName1, variables1);
      expect(stubRestTransport.invokeUnsubscribe).not.toHaveBeenCalled();
      expect(stubStreamTransport.invokeUnsubscribe).toHaveBeenCalledWith(
        queryName1,
        variables1
      );
    });

    it('useEmulator should route to REST and streaming', () => {
      manager.initStreamTransport();

      manager.useEmulator('localhost', 9000, false);

      expect(stubRestTransport.useEmulator).toHaveBeenCalledTimes(1);
      expect(stubRestTransport.useEmulator).toHaveBeenCalledWith(
        'localhost',
        9000,
        false
      );
      expect(stubStreamTransport.useEmulator).toHaveBeenCalledTimes(1);
      expect(stubStreamTransport.useEmulator).toHaveBeenCalledWith(
        'localhost',
        9000,
        false
      );
    });

    it('onAuthTokenChanged should route to REST and streaming', () => {
      manager.initStreamTransport();

      manager.onAuthTokenChanged('new-token');

      expect(stubRestTransport.onAuthTokenChanged).toHaveBeenCalledTimes(1);
      expect(stubRestTransport.onAuthTokenChanged).toHaveBeenCalledWith(
        'new-token'
      );
      expect(stubStreamTransport.onAuthTokenChanged).toHaveBeenCalledTimes(1);
      expect(stubStreamTransport.onAuthTokenChanged).toHaveBeenCalledWith(
        'new-token'
      );
    });
  });

  describe('dynamic transport routing', () => {
    it('executeShouldUseStream should return false if streamTransport is not initialized', () => {
      expect(manager.executeShouldUseStream()).toBe(false);
    });

    it('executeShouldUseStream should return true only when all stream conditions are met', () => {
      const streamTransport = manager.initStreamTransport();

      // Default state: not ready, no subs, no pending close
      const streamIsReadyStub = vi
        .spyOn(streamTransport, 'streamIsReady', 'get')
        .mockReturnValue(false);
      const hasActiveSubscriptionsStub = vi
        .spyOn(streamTransport, 'hasActiveSubscriptions', 'get')
        .mockReturnValue(false);
      const isPendingCloseStub = vi
        .spyOn(streamTransport, 'isPendingClose', 'get')
        .mockReturnValue(false);

      expect(manager.executeShouldUseStream()).toBe(false);

      // make stream ready, but still no active subscriptions
      streamIsReadyStub.mockReturnValue(true);
      expect(manager.executeShouldUseStream()).toBe(false);

      // add active subscriptions
      hasActiveSubscriptionsStub.mockReturnValue(true);
      expect(manager.executeShouldUseStream()).toBe(true);

      // pending close overrides readiness / active subscriptions
      isPendingCloseStub.mockReturnValue(true);
      expect(manager.executeShouldUseStream()).toBe(false);
    });

    describe('invokeQuery dynamic routing', () => {
      it('invokeQuery should route to stream if executeShouldUseStream returns true', async () => {
        const streamTransport = manager.initStreamTransport();
        vi.spyOn(streamTransport, 'streamIsReady', 'get').mockReturnValue(true);
        vi.spyOn(streamTransport, 'isPendingClose', 'get').mockReturnValue(
          false
        );
        vi.spyOn(
          streamTransport,
          'hasActiveSubscriptions',
          'get'
        ).mockReturnValue(true);
        vi.spyOn(streamTransport, 'isUnableToConnect', 'get').mockReturnValue(
          false
        );

        const restSpy = vi.spyOn(manager.restTransport, 'invokeQuery');
        const streamSpy = vi
          .spyOn(streamTransport, 'invokeQuery')
          .mockResolvedValue(testResponse);

        await manager.invokeQuery(queryName1, variables1);

        expect(streamSpy).toHaveBeenCalledTimes(1);
        expect(streamSpy).toHaveBeenCalledWith(queryName1, variables1);
        expect(restSpy).not.toHaveBeenCalled();
      });

      it('invokeQuery should throw an error if stream transport throws an error and executeShouldUseStream remains true', async () => {
        const streamTransport = manager.initStreamTransport();
        vi.spyOn(streamTransport, 'streamIsReady', 'get').mockReturnValue(true);
        vi.spyOn(streamTransport, 'isPendingClose', 'get').mockReturnValue(
          false
        );
        vi.spyOn(
          streamTransport,
          'hasActiveSubscriptions',
          'get'
        ).mockReturnValue(true);
        vi.spyOn(streamTransport, 'isUnableToConnect', 'get').mockReturnValue(
          false
        );

        const streamStub = vi
          .spyOn(streamTransport, 'invokeQuery')
          .mockRejectedValue(expectedError);
        const restStub = vi
          .spyOn(manager.restTransport, 'invokeQuery')
          .mockResolvedValue(testResponse);

        await expect(
          manager.invokeQuery(queryName1, variables1)
        ).rejects.toThrow(expectedError);

        expect(streamStub).toHaveBeenCalledTimes(1);
        expect(streamStub).toHaveBeenCalledWith(queryName1, variables1);
        expect(restStub).not.toHaveBeenCalled();
      });

      it('invokeQuery should fallback to REST if stream transport throws an error and then executeShouldUseStream becomes false', async () => {
        const streamTransport = manager.initStreamTransport();
        vi.spyOn(streamTransport, 'streamIsReady', 'get').mockReturnValue(true);
        vi.spyOn(streamTransport, 'isPendingClose', 'get').mockReturnValue(
          false
        );
        vi.spyOn(
          streamTransport,
          'hasActiveSubscriptions',
          'get'
        ).mockReturnValue(true);
        const isUnableToConnectStub = vi
          .spyOn(streamTransport, 'isUnableToConnect', 'get')
          .mockReturnValue(false);

        const streamStub = vi
          .spyOn(streamTransport, 'invokeQuery')
          .mockImplementation(async () => {
            isUnableToConnectStub.mockReturnValue(true);
            throw expectedError;
          });
        const restStub = vi
          .spyOn(manager.restTransport, 'invokeQuery')
          .mockResolvedValue(testResponse);

        await manager.invokeQuery(queryName1, variables1);

        expect(streamStub).toHaveBeenCalledTimes(1);
        expect(streamStub).toHaveBeenCalledWith(queryName1, variables1);
        expect(restStub).toHaveBeenCalledTimes(1);
        expect(restStub).toHaveBeenCalledWith(queryName1, variables1);
      });
    });

    describe('invokeMutation dynamic routing', () => {
      it('invokeMutation should route to stream if executeShouldUseStream() returns true', async () => {
        const streamTransport = manager.initStreamTransport();
        vi.spyOn(streamTransport, 'streamIsReady', 'get').mockReturnValue(true);
        vi.spyOn(streamTransport, 'isPendingClose', 'get').mockReturnValue(
          false
        );
        vi.spyOn(
          streamTransport,
          'hasActiveSubscriptions',
          'get'
        ).mockReturnValue(true);
        vi.spyOn(streamTransport, 'isUnableToConnect', 'get').mockReturnValue(
          false
        );

        const restSpy = vi.spyOn(manager.restTransport, 'invokeMutation');
        const streamSpy = vi
          .spyOn(streamTransport, 'invokeMutation')
          .mockResolvedValue(testResponse);

        await manager.invokeMutation(mutationName1, variables1);

        expect(streamSpy).toHaveBeenCalledTimes(1);
        expect(streamSpy).toHaveBeenCalledWith(mutationName1, variables1);
        expect(restSpy).not.toHaveBeenCalled();
      });

      it('invokeMutation should throw an error if stream transport throws an error and executeShouldUseStream remains true', async () => {
        const streamTransport = manager.initStreamTransport();
        vi.spyOn(streamTransport, 'streamIsReady', 'get').mockReturnValue(true);
        vi.spyOn(streamTransport, 'isPendingClose', 'get').mockReturnValue(
          false
        );
        vi.spyOn(
          streamTransport,
          'hasActiveSubscriptions',
          'get'
        ).mockReturnValue(true);
        vi.spyOn(streamTransport, 'isUnableToConnect', 'get').mockReturnValue(
          false
        );

        const streamStub = vi
          .spyOn(streamTransport, 'invokeMutation')
          .mockRejectedValue(expectedError);
        const restStub = vi
          .spyOn(manager.restTransport, 'invokeMutation')
          .mockResolvedValue(testResponse);

        await expect(
          manager.invokeMutation(mutationName1, variables1)
        ).rejects.toThrow(expectedError);

        expect(streamStub).toHaveBeenCalledTimes(1);
        expect(streamStub).toHaveBeenCalledWith(mutationName1, variables1);
        expect(restStub).not.toHaveBeenCalled();
      });

      it('invokeMutation should fallback to REST if stream transport throws an error and then executeShouldUseStream becomes false', async () => {
        const streamTransport = manager.initStreamTransport();
        vi.spyOn(streamTransport, 'streamIsReady', 'get').mockReturnValue(true);
        vi.spyOn(streamTransport, 'isPendingClose', 'get').mockReturnValue(
          false
        );
        vi.spyOn(
          streamTransport,
          'hasActiveSubscriptions',
          'get'
        ).mockReturnValue(true);
        const isUnableToConnectStub = vi
          .spyOn(streamTransport, 'isUnableToConnect', 'get')
          .mockReturnValue(false);

        const streamStub = vi
          .spyOn(streamTransport, 'invokeMutation')
          .mockImplementation(async () => {
            isUnableToConnectStub.mockReturnValue(true);
            throw expectedError;
          });
        const restStub = vi
          .spyOn(manager.restTransport, 'invokeMutation')
          .mockResolvedValue(testResponse);

        await manager.invokeMutation(mutationName1, variables1);

        expect(streamStub).toHaveBeenCalledTimes(1);
        expect(streamStub).toHaveBeenCalledWith(mutationName1, variables1);
        expect(restStub).toHaveBeenCalledTimes(1);
        expect(restStub).toHaveBeenCalledWith(mutationName1, variables1);
      });

      it('invokeMutation should fallback to REST for all in-flight mutations if stream fails', async () => {
        const streamTransport = manager.initStreamTransport();
        vi.spyOn(streamTransport, 'streamIsReady', 'get').mockReturnValue(true);
        vi.spyOn(streamTransport, 'isPendingClose', 'get').mockReturnValue(
          false
        );
        vi.spyOn(
          streamTransport,
          'hasActiveSubscriptions',
          'get'
        ).mockReturnValue(true);
        const isUnableToConnectStub = vi
          .spyOn(streamTransport, 'isUnableToConnect', 'get')
          .mockReturnValue(false);

        let rejectStream!: (reason: unknown) => void;
        const streamPromise = new Promise((_, reject) => {
          rejectStream = reject;
        });

        const streamStub = vi
          .spyOn(streamTransport, 'invokeMutation')
          .mockReturnValue(
            streamPromise as unknown as Promise<DataConnectResponse<unknown>>
          );

        const restStub = vi
          .spyOn(manager.restTransport, 'invokeMutation')
          .mockResolvedValue(testResponse);

        const p1 = manager.invokeMutation(mutationName1, variables1);
        const p2 = manager.invokeMutation('mutation2', { key: 'two' });

        // Verify both called stream transport and are pending
        expect(streamStub).toHaveBeenCalledTimes(2);
        expect(restStub).not.toHaveBeenCalled();

        // Mark stream as failed BEFORE resolving/rejecting to trigger fallback
        isUnableToConnectStub.mockReturnValue(true);

        // Fail the stream
        rejectStream(expectedError);

        await Promise.all([p1, p2]);

        expect(restStub).toHaveBeenCalledTimes(2);
      });
    });

    describe('invokeSubscribe dynamic routing', () => {
      it('invokeSubscribe should throw an error if isUnableToConnect is true', () => {
        const observer: SubscribeObserver<TestData> = {
          onData: () => {},
          onDisconnect: () => {},
          onError: () => {}
        };
        const streamTransport = manager.initStreamTransport();
        vi.spyOn(streamTransport, 'isUnableToConnect', 'get').mockReturnValue(
          true
        );

        const streamStub = vi
          .spyOn(streamTransport, 'invokeSubscribe')
          .mockImplementation(() => {});
        const restStub = vi
          .spyOn(manager.restTransport, 'invokeSubscribe')
          .mockImplementation(() => {});

        expect(() =>
          manager.invokeSubscribe(observer, queryName1, variables1)
        ).toThrow('Subscriptions are unavailable');

        expect(streamStub).not.toHaveBeenCalled();
        expect(restStub).not.toHaveBeenCalled();
      });
    });
  });

  describe('disconnects', () => {
    it('subscriber onDisconnect should be called when stream fails during active subscription', async () => {
      const observer: SubscribeObserver<TestData> = {
        onData: vi.fn(),
        onDisconnect: vi.fn(),
        onError: vi.fn()
      };
      const streamTransport = manager.initStreamTransport();
      vi.spyOn(streamTransport, 'streamIsReady', 'get').mockReturnValue(true);
      vi.spyOn(streamTransport, 'isPendingClose', 'get').mockReturnValue(false);
      vi.spyOn(
        streamTransport,
        'hasActiveSubscriptions',
        'get'
      ).mockReturnValue(true);
      vi.spyOn(streamTransport, 'isUnableToConnect', 'get').mockReturnValue(
        false
      );

      // Add observer directly to tracking map to verify onDisconnect propagation
      const transportWithInternals = streamTransport as unknown as {
        subscribeObservers: Map<string, SubscribeObserver<TestData>>;
      };
      transportWithInternals.subscribeObservers = new Map([['1', observer]]);

      // rejectAllRequests simulates a disconnect without reconnects!
      (
        streamTransport as unknown as StreamTransportWithInternals
      ).rejectAllRequests(
        Code.OTHER,
        'Stream disconnected with code 1006: Abnormal Closure'
      );

      expect(observer.onDisconnect).toHaveBeenCalledTimes(1);
      expect(observer.onDisconnect).toHaveBeenCalledWith(
        Code.OTHER,
        'Stream disconnected with code 1006: Abnormal Closure'
      );
    });

    describe('idle timeout', () => {
      let streamTransport: WebSocketTransport;
      let restInvokeQuerySpy: ReturnType<typeof vi.spyOn>;

      const IDLE_CONNECTION_TIMEOUT_MS = 15 * 1000; // 15 seconds, copied from real implementation

      beforeEach(() => {
        vi.useFakeTimers();
        streamTransport = manager.initStreamTransport() as WebSocketTransport;
        const streamTransportPublic = streamTransport as unknown as {
          openConnection(): Promise<void>;
          sendMessage(payload: unknown): Promise<void>;
        };
        vi.spyOn(streamTransportPublic, 'openConnection').mockResolvedValue();
        vi.spyOn(streamTransportPublic, 'sendMessage').mockResolvedValue();
        vi.spyOn(streamTransport, 'streamIsReady', 'get').mockReturnValue(true);
        restInvokeQuerySpy = vi
          .spyOn(manager.restTransport, 'invokeQuery')
          .mockResolvedValue(testResponse);
      });

      it('should route to REST during idle timeout and disconnect after grace period', async () => {
        const observer: SubscribeObserver<TestData> = {
          onData: () => {},
          onDisconnect: () => {},
          onError: () => {}
        };

        manager.invokeSubscribe(observer, queryName1, variables1);
        expect(manager.executeShouldUseStream()).toBe(true);

        manager.invokeUnsubscribe(queryName1, variables1);
        expect(manager.executeShouldUseStream()).toBe(false);

        // without active streams, should route to REST
        restInvokeQuerySpy.mockClear();
        await manager.invokeQuery(queryName1, variables1);
        expect(restInvokeQuerySpy).toHaveBeenCalledTimes(1);

        expect(manager.streamTransport).toBeDefined();

        await vi.advanceTimersByTimeAsync(IDLE_CONNECTION_TIMEOUT_MS + 100);
        expect(manager.streamTransport).toBeUndefined();
      });

      it('should route to REST after stream automatically closes', async () => {
        const observer: SubscribeObserver<TestData> = {
          onData: () => {},
          onDisconnect: () => {},
          onError: () => {}
        };

        manager.invokeSubscribe(observer, queryName1, variables1);
        manager.invokeUnsubscribe(queryName1, variables1);

        await vi.advanceTimersByTimeAsync(IDLE_CONNECTION_TIMEOUT_MS + 100);
        expect(manager.streamTransport).toBeUndefined();

        restInvokeQuerySpy.mockClear();
        await manager.invokeQuery(queryName1, variables1);
        expect(restInvokeQuerySpy).toHaveBeenCalledTimes(1);
      });

      it('should route back to stream after reconnect', async () => {
        const observer: SubscribeObserver<TestData> = {
          onData: () => {},
          onDisconnect: () => {},
          onError: () => {}
        };

        manager.invokeSubscribe(observer, queryName1, variables1);
        manager.invokeUnsubscribe(queryName1, variables1);

        await vi.advanceTimersByTimeAsync(IDLE_CONNECTION_TIMEOUT_MS + 100);
        expect(manager.streamTransport).toBeUndefined();

        manager.invokeSubscribe(observer, queryName1, variables1);
        const newStreamTransport = manager.streamTransport!;
        const newStreamTransportPublic = newStreamTransport as unknown as {
          openConnection(): Promise<void>;
          sendMessage(payload: unknown): Promise<void>;
        };
        vi.spyOn(
          newStreamTransportPublic,
          'openConnection'
        ).mockResolvedValue();
        vi.spyOn(newStreamTransportPublic, 'sendMessage').mockResolvedValue();
        vi.spyOn(newStreamTransport, 'streamIsReady', 'get').mockReturnValue(
          true
        );
        const streamExecuteQueryStub = vi
          .spyOn(newStreamTransport, 'invokeQuery')
          .mockResolvedValue(testResponse);
        await manager.invokeQuery(queryName1, variables1);
        expect(streamExecuteQueryStub).toHaveBeenCalledTimes(1);
        expect(restInvokeQuerySpy).not.toHaveBeenCalled();
      });
    });
  });
});
