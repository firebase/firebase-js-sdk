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

import { deleteApp, FirebaseApp, initializeApp } from '@firebase/app';

import {
  Code,
  DataConnect,
  DataConnectResponse,
  DataConnectResponseWithMaxAge,
  executeMutation,
  executeQuery,
  getDataConnect,
  mutationRef,
  QueryRef,
  queryRef,
  QueryResult,
  subscribe,
  SubscribeObserver
} from '../../src';
import { DataConnectTransportManager } from '../../src/network/manager';
import { RESTTransport } from '../../src/network/rest';
import { AbstractDataConnectStreamTransport } from '../../src/network/stream/streamTransport';
import { DataConnectStreamRequest } from '../../src/network/stream/wire';

import { MockWebSocket } from './testUtils';

/** Interface that exposes private fields of DataConnect for testing purposes. */
interface DataConnectWithInternals {
  _queryManager: QueryManagerWithInternals;
}

/** Interface that exposes private fields of QueryManager for testing purposes. */
interface QueryManagerWithInternals {
  transport: ManagerWithInternals;
  preferCacheResults<Data, Variables>(
    queryRef: QueryRef<Data, Variables>,
    allowStale: boolean
  ): Promise<QueryResult<Data, Variables>>;
  updateSSR<Data, Variables>(updatedData: QueryResult<Data, Variables>): void;
  waitForQueuedWrites(): Promise<void>;
}

/** Interface that exposes private fields of TransportManager for testing purposes. */
interface ManagerWithInternals {
  streamTransport?: StreamTransportWithInternals;
  restTransport: RESTTransport;
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
  initStreamTransport(): AbstractDataConnectStreamTransport;
}

/** Interface that exposes private fields of AbstractDataConnectStreamTransport for testing purposes. */
interface StreamTransportWithInternals {
  sendMessage<Variables>(
    requestBody: DataConnectStreamRequest<Variables>
  ): Promise<void>;
  invokeQuery<Data, Variables>(
    queryName: string,
    body?: Variables
  ): Promise<DataConnectResponseWithMaxAge<Data>>;
  isUnableToConnect: boolean;
  connection?: MockWebSocket;
  hasActiveSubscriptions: boolean;
  streamIsReady: boolean;
}

interface StubStreamTransport {
  invokeQuery: ReturnType<typeof vi.fn>;
  invokeMutation: ReturnType<typeof vi.fn>;
  invokeSubscribe: ReturnType<typeof vi.fn>;
  invokeUnsubscribe: ReturnType<typeof vi.fn>;
  useEmulator: ReturnType<typeof vi.fn>;
  onAuthTokenChanged: ReturnType<typeof vi.fn>;
  hasActiveSubscriptions: boolean;
}

describe('Streaming & Query Layer Integration', () => {
  let dc: DataConnect;
  let app: FirebaseApp;
  let stubStreamTransport: StubStreamTransport;
  let initStreamTransportStub: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stubStreamTransport = {
      invokeQuery: vi.fn(),
      invokeMutation: vi.fn(),
      invokeSubscribe: vi.fn(),
      invokeUnsubscribe: vi.fn(),
      useEmulator: vi.fn(),
      onAuthTokenChanged: vi.fn(),
      hasActiveSubscriptions: false
    };

    initStreamTransportStub = vi
      .spyOn(
        DataConnectTransportManager.prototype as unknown as ManagerWithInternals,
        'initStreamTransport'
      )
      .mockImplementation(function (this: ManagerWithInternals) {
        this.streamTransport =
          stubStreamTransport as unknown as StreamTransportWithInternals;
        return stubStreamTransport as unknown as AbstractDataConnectStreamTransport;
      });

    app = initializeApp({ projectId: 'p', appId: 'a' }, 'n');
    dc = getDataConnect(app, {
      connector: 'c',
      location: 'l',
      service: 's'
    });
    dc.setInitialized();
  });

  afterEach(async () => {
    await dc._delete();
    await deleteApp(app);
  });

  const testVariables = { foo: 'bar' };
  type TestVariables = typeof testVariables;
  const testData = { abc: 'xyz' };
  type TestData = typeof testData;

  const queryName = 'testQuery';

  describe('using stream via user-facing API', () => {
    it('executeQuery / executeMutation should not initialize stream', async () => {
      const q = queryRef<TestData, TestVariables>(dc, queryName, testVariables);
      const m = mutationRef<TestData, TestVariables>(
        dc,
        queryName,
        testVariables
      );

      executeQuery(q).catch(() => {});
      expect(initStreamTransportStub).not.toHaveBeenCalled();
      executeMutation(m).catch(() => {});
      expect(initStreamTransportStub).not.toHaveBeenCalled();
    });

    it('subscribe should initialize stream', async () => {
      const q = queryRef<TestData, TestVariables>(dc, queryName, testVariables);
      subscribe(q, () => {});
      expect(initStreamTransportStub).toHaveBeenCalledTimes(1);
      expect(stubStreamTransport.invokeSubscribe).toHaveBeenCalledTimes(1);
    });

    it('query layer should call invokeUnsubscribe on last unsubscribe', async () => {
      const onNextSpy1 = vi.fn();
      const onNextSpy2 = vi.fn();
      const onNextSpy3 = vi.fn();
      const q = queryRef<TestData, TestVariables>(dc, queryName, testVariables);

      const unsub1 = subscribe(q, onNextSpy1);
      const unsub2 = subscribe(q, onNextSpy2);
      const unsub3 = subscribe(q, onNextSpy3);

      unsub1();
      expect(stubStreamTransport.invokeUnsubscribe).not.toHaveBeenCalled();
      unsub2();
      expect(stubStreamTransport.invokeUnsubscribe).not.toHaveBeenCalled();
      unsub3();
      expect(stubStreamTransport.invokeUnsubscribe).toHaveBeenCalledTimes(1);
      expect(stubStreamTransport.invokeUnsubscribe).toHaveBeenCalledWith(
        queryName,
        testVariables
      );
    });

    it('executeQuery should use stream when stream is active', async () => {
      const q = queryRef<TestData, TestVariables>(dc, queryName, testVariables);

      stubStreamTransport.invokeQuery.mockResolvedValue({
        data: testData,
        errors: [],
        extensions: {}
      });

      // stub preferCacheResults to avoid race condition where subscribe calls invokeQuery asynchronously
      vi.spyOn(
        (dc as unknown as DataConnectWithInternals)._queryManager,
        'preferCacheResults'
      ).mockResolvedValue({ data: testData, source: 'CACHE' } as QueryResult<
        TestData,
        TestVariables
      >);

      // open a subscription to activate the stream
      subscribe(q, { onNext: () => {} });

      // force hasActiveSubscriptions and streamIsReady to true so TransportManager routes to stream
      (
        stubStreamTransport as unknown as StreamTransportWithInternals
      ).hasActiveSubscriptions = true;
      (
        stubStreamTransport as unknown as StreamTransportWithInternals
      ).streamIsReady = true;

      // reset history because subscribe might have triggered calls before stub was active or otherwise
      stubStreamTransport.invokeQuery.mockClear();

      const result = await executeQuery(q, { fetchPolicy: 'SERVER_ONLY' });

      expect(stubStreamTransport.invokeQuery).toHaveBeenCalledTimes(1);
      expect(stubStreamTransport.invokeQuery).toHaveBeenCalledWith(
        queryName,
        testVariables
      );
      expect(result.data).toEqual(testData);
    });

    it('executeMutation should use stream when stream is active', async () => {
      const m = mutationRef<TestData, TestVariables>(
        dc,
        'testMutation',
        testVariables
      );
      const q = queryRef<TestData, TestVariables>(dc, queryName, testVariables);

      // open a subscription to activate the stream
      subscribe(q, { onNext: () => {} });

      // force hasActiveSubscriptions and streamIsReady to true so TransportManager routes to stream
      (
        stubStreamTransport as unknown as StreamTransportWithInternals
      ).hasActiveSubscriptions = true;
      (
        stubStreamTransport as unknown as StreamTransportWithInternals
      ).streamIsReady = true;

      stubStreamTransport.invokeMutation.mockResolvedValue({
        data: testData,
        errors: [],
        extensions: {}
      });

      const result = await executeMutation(m);

      expect(stubStreamTransport.invokeMutation).toHaveBeenCalledTimes(1);
      expect(stubStreamTransport.invokeMutation).toHaveBeenCalledWith(
        'testMutation',
        testVariables
      );
      expect(result.data).toEqual(testData);
    });
  });

  describe('incoming notifications', () => {
    it('should notify all relevant subscribers when data is received', async () => {
      const relevantQuery = queryRef<TestData, TestVariables>(
        dc,
        queryName,
        testVariables
      );
      const irrelevantQuery = queryRef<TestData, TestVariables>(
        dc,
        'otherQuery',
        { foo: 'xyz' }
      );
      const relevantSpy1 = vi.fn();
      const relevantSpy2 = vi.fn();
      const relevantSpy3 = vi.fn();
      const irrelevantSpy = vi.fn();
      subscribe(relevantQuery, relevantSpy1);
      subscribe(relevantQuery, relevantSpy2);
      subscribe(relevantQuery, relevantSpy3);
      subscribe(irrelevantQuery, irrelevantSpy);

      // get the query layer's observer was passed to invokeSubscribe
      const observer = stubStreamTransport.invokeSubscribe.mock.calls[0][0];

      // call the observer with data
      await observer.onData({ data: testData, errors: [], extensions: {} });

      expect(relevantSpy1.mock.calls.length === 1).toBe(true);
      expect(relevantSpy2.mock.calls.length === 1).toBe(true);
      expect(relevantSpy3.mock.calls.length === 1).toBe(true);
      expect(irrelevantSpy).not.toHaveBeenCalled();
      const result1 = relevantSpy1.mock.calls[0][0];
      const result2 = relevantSpy2.mock.calls[0][0];
      const result3 = relevantSpy3.mock.calls[0][0];
      expect(result1.data).toEqual(testData);
      expect(result2.data).toEqual(testData);
      expect(result3.data).toEqual(testData);
    });

    it('should update cache when data is pushed', async () => {
      const q = queryRef<TestData, TestVariables>(dc, queryName, testVariables);
      const onNextSpy = vi.fn();
      subscribe(q, onNextSpy);

      // get the query layer's observer which was passed to invokeSubscribe
      const observer = stubStreamTransport.invokeSubscribe.mock.calls[0][0];

      // call the observer with data
      await observer.onData({ data: testData, errors: [], extensions: {} });

      // verify CACHE_ONLY executions see the data returned from the observer
      const cacheResult1 = await executeQuery(q, { fetchPolicy: 'CACHE_ONLY' });
      expect(cacheResult1.data).toEqual(testData);

      // simulate second notification
      const newData: TestData = { abc: 'NEW DATA' };
      await observer.onData({ data: newData, errors: [], extensions: {} });

      // verify CACHE_ONLY again
      const cacheResult2 = await executeQuery(q, { fetchPolicy: 'CACHE_ONLY' });
      expect(cacheResult2.data).toEqual(newData);
    });

    it('should notify all relevant subscribers of errors when they are pushed', async () => {
      const relevantQuery = queryRef<TestData, TestVariables>(
        dc,
        queryName,
        testVariables
      );
      const newVars: TestVariables = { foo: 'NEW VARS' };
      const irrelevantQuery = queryRef<TestData, TestVariables>(
        dc,
        'otherQuery',
        newVars
      );
      const relevantSpy1 = vi.fn();
      const relevantSpy2 = vi.fn();
      const relevantSpy3 = vi.fn();
      const irrelevantSpy = vi.fn();

      subscribe(relevantQuery, { onNext: () => {}, onErr: relevantSpy1 });
      subscribe(relevantQuery, { onNext: () => {}, onErr: relevantSpy2 });
      subscribe(relevantQuery, { onNext: () => {}, onErr: relevantSpy3 });
      subscribe(irrelevantQuery, { onNext: () => {}, onErr: irrelevantSpy });

      // get the query layer's observer which was passed to invokeSubscribe
      const observer = stubStreamTransport.invokeSubscribe.mock.calls[0][0];

      // call the observer with errors
      const expectedError = new Error('test error');
      await observer.onData({
        data: {},
        errors: [expectedError],
        extensions: {}
      });

      expect(relevantSpy1.mock.calls.length === 1).toBe(true);
      expect(relevantSpy2.mock.calls.length === 1).toBe(true);
      expect(relevantSpy3.mock.calls.length === 1).toBe(true);
      expect(irrelevantSpy).not.toHaveBeenCalled();
      const result1 = relevantSpy1.mock.calls[0][0];
      const result2 = relevantSpy2.mock.calls[0][0];
      const result3 = relevantSpy3.mock.calls[0][0];
      expect(result1).toBeInstanceOf(Error);
      expect(result1.message).toContain(
        'DataConnect error received from subscribe notification'
      );
      expect(result2).toBeInstanceOf(Error);
      expect(result2.message).toContain(
        'DataConnect error received from subscribe notification'
      );
      expect(result3).toBeInstanceOf(Error);
      expect(result3.message).toContain(
        'DataConnect error received from subscribe notification'
      );
    });

    it('should clean up subscriptions in query layer when observer receives a disconnect error', async () => {
      const q = queryRef<TestData, TestVariables>(dc, queryName, testVariables);
      const onNextSpy = vi.fn();
      const onErrSpy = vi.fn();

      subscribe(q, { onNext: onNextSpy, onErr: onErrSpy });

      const notificationObserver =
        stubStreamTransport.invokeSubscribe.mock.calls[0][0];

      await notificationObserver.onDisconnect(
        Code.OTHER,
        'WebSocket disconnected externally'
      );

      expect(onErrSpy).toHaveBeenCalledTimes(1);
      expect(stubStreamTransport.invokeUnsubscribe).toHaveBeenCalledTimes(1);

      // Call observer again with data, should not reach subscriber because it was cleaned up
      await notificationObserver.onData({
        data: { abc: 'new data' },
        errors: [],
        extensions: {}
      });
      expect(onNextSpy).not.toHaveBeenCalled();
    });

    it('should NOT clean up subscriptions in query layer when observer receives a non-disconnect error', async () => {
      const q = queryRef<TestData, TestVariables>(dc, queryName, testVariables);
      const onNextSpy = vi.fn();
      const onErrSpy = vi.fn();

      subscribe(q, { onNext: onNextSpy, onErr: onErrSpy });

      const observer = stubStreamTransport.invokeSubscribe.mock.calls[0][0];

      const expectedError = new Error('test error');
      await observer.onData({
        data: {},
        errors: [expectedError],
        extensions: {}
      });

      expect(onErrSpy).toHaveBeenCalledTimes(1);

      // Call observer again with data, should STILL reach subscriber because it was NOT cleaned up
      const testData: TestData = { abc: 'new data' };
      await observer.onData({ data: testData, errors: [], extensions: {} });
      expect(onNextSpy).toHaveBeenCalledTimes(1);
      expect(onNextSpy.mock.calls[0][0].data).toEqual(testData);

      // Verify that invokeUnsubscribe was NOT called
      expect(stubStreamTransport.invokeUnsubscribe).not.toHaveBeenCalled();
    });
  });
});
