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
import { expect } from 'chai';
import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';

import {
  Code,
  DataConnect,
  DataConnectError,
  DataConnectResponse,
  DataConnectResponseWithMaxAge,
  executeMutation,
  executeQuery,
  getDataConnect,
  mutationRef,
  queryRef,
  QueryResult,
  subscribe,
  SubscribeNotificationHook
} from '../../src';
import { QueryManager } from '../../src/core/query/QueryManager';
import { DataConnectTransportManager } from '../../src/network/manager';
import { AbstractDataConnectStreamTransport } from '../../src/network/stream/streamTransport';
import { WebSocketTransport } from '../../src/network/stream/websocket';
import { DataConnectStreamRequest } from '../../src/network/stream/wire';

chai.use(sinonChai);
chai.use(chaiAsPromised);

interface DataConnectWithInternals {
  _queryManager: QueryManager;
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
    notificationHook: SubscribeNotificationHook<Data>,
    queryName: string,
    body?: Variables
  ): void;
  invokeUnsubscribe<Variables>(queryName: string, body?: Variables): void;
  streamTransport?: StreamTransportWithInternals;
  initStreamTransport(): AbstractDataConnectStreamTransport;
}

/** Interface that exposes private fields of AbstractDataConnectStreamTransport for testing purposes. */
interface StreamTransportWithInternals {
  sendMessage<Variables>(
    requestBody: DataConnectStreamRequest<Variables>
  ): Promise<void>;
  hasActiveSubscriptions: boolean;
  streamIsReady: boolean;
}

describe('Streaming & Query Layer Integration', () => {
  let dc: DataConnect;
  let app: FirebaseApp;
  let stubStreamTransport: sinon.SinonStubbedInstance<WebSocketTransport>;
  let initStreamTransportStub: sinon.SinonStub;

  beforeEach(() => {
    stubStreamTransport = {
      invokeQuery: sinon.stub(),
      invokeMutation: sinon.stub(),
      invokeSubscribe: sinon.stub(),
      invokeUnsubscribe: sinon.stub(),
      useEmulator: sinon.stub(),
      onAuthTokenChanged: sinon.stub(),
      hasActiveSubscriptions: false
    } as unknown as sinon.SinonStubbedInstance<WebSocketTransport>;

    initStreamTransportStub = sinon
      .stub(
        DataConnectTransportManager.prototype as unknown as ManagerWithInternals,
        'initStreamTransport'
      )
      .callsFake(function (this: ManagerWithInternals) {
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
    sinon.restore();
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

      void executeQuery(q);
      expect(initStreamTransportStub).to.not.have.been.called;
      void executeMutation(m);
      expect(initStreamTransportStub).to.not.have.been.called;
    });

    it('subscribe should initialize stream', async () => {
      const q = queryRef<TestData, TestVariables>(dc, queryName, testVariables);
      subscribe(q, () => {});
      expect(initStreamTransportStub).to.have.been.calledOnce;
      expect(stubStreamTransport.invokeSubscribe).to.have.been.calledOnce;
    });

    it('query layer should call invokeUnsubscribe on last unsubscribe', async () => {
      const onNextSpy1 = sinon.spy();
      const onNextSpy2 = sinon.spy();
      const onNextSpy3 = sinon.spy();
      const q = queryRef<TestData, TestVariables>(dc, queryName, testVariables);

      const unsub1 = subscribe(q, onNextSpy1);
      const unsub2 = subscribe(q, onNextSpy2);
      const unsub3 = subscribe(q, onNextSpy3);

      unsub1();
      expect(stubStreamTransport.invokeUnsubscribe).to.not.have.been.called;
      unsub2();
      expect(stubStreamTransport.invokeUnsubscribe).to.not.have.been.called;
      unsub3();
      expect(stubStreamTransport.invokeUnsubscribe).to.have.been.calledOnceWith(
        queryName,
        testVariables
      );
    });

    it('executeQuery should use stream when stream is active', async () => {
      const q = queryRef<TestData, TestVariables>(dc, queryName, testVariables);

      stubStreamTransport.invokeQuery.resolves({
        data: testData,
        errors: [],
        extensions: {}
      });

      // stub preferCacheResults to avoid race condition where subscribe calls invokeQuery asynchronously
      sinon
        .stub(
          (dc as unknown as DataConnectWithInternals)._queryManager,
          'preferCacheResults'
        )
        .resolves({ data: testData, source: 'CACHE' } as QueryResult<
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
      stubStreamTransport.invokeQuery.resetHistory();

      const result = await executeQuery(q, { fetchPolicy: 'SERVER_ONLY' });

      expect(stubStreamTransport.invokeQuery).to.have.been.calledOnceWith(
        queryName,
        testVariables
      );
      expect(result.data).to.deep.equal(testData);
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

      stubStreamTransport.invokeMutation.resolves({
        data: testData,
        errors: [],
        extensions: {}
      });

      const result = await executeMutation(m);

      expect(stubStreamTransport.invokeMutation).to.have.been.calledOnceWith(
        'testMutation',
        testVariables
      );
      expect(result.data).to.deep.equal(testData);
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
      const relevantSpy1 = sinon.spy();
      const relevantSpy2 = sinon.spy();
      const relevantSpy3 = sinon.spy();
      const irrelevantSpy = sinon.spy();
      subscribe(relevantQuery, relevantSpy1);
      subscribe(relevantQuery, relevantSpy2);
      subscribe(relevantQuery, relevantSpy3);
      subscribe(irrelevantQuery, irrelevantSpy);

      // get the query layer's notification hook which was passed to invokeSubscribe
      const hook = stubStreamTransport.invokeSubscribe.firstCall.args[0];

      // call the hook with data
      await hook({ data: testData, errors: [], extensions: {} });

      expect(relevantSpy1.calledOnce).to.be.true;
      expect(relevantSpy2.calledOnce).to.be.true;
      expect(relevantSpy3.calledOnce).to.be.true;
      expect(irrelevantSpy).to.not.have.been.called;
      const result1 = relevantSpy1.firstCall.args[0];
      const result2 = relevantSpy2.firstCall.args[0];
      const result3 = relevantSpy3.firstCall.args[0];
      expect(result1.data).to.deep.equal(testData);
      expect(result2.data).to.deep.equal(testData);
      expect(result3.data).to.deep.equal(testData);
    });

    it('should update cache when data is pushed', async () => {
      const q = queryRef<TestData, TestVariables>(dc, queryName, testVariables);
      const onNextSpy = sinon.spy();
      subscribe(q, onNextSpy);

      // get the query layer's notification hook which was passed to invokeSubscribe
      const hook = stubStreamTransport.invokeSubscribe.firstCall.args[0];

      // call the hook with data
      await hook({ data: testData, errors: [], extensions: {} });

      // verify CACHE_ONLY executions see the data returned from the notification hook
      const cacheResult1 = await executeQuery(q, { fetchPolicy: 'CACHE_ONLY' });
      expect(cacheResult1.data).to.deep.equal(testData);

      // simulate second notification
      const newData: TestData = { abc: 'NEW DATA' };
      await hook({ data: newData, errors: [], extensions: {} });

      // verify CACHE_ONLY again
      const cacheResult2 = await executeQuery(q, { fetchPolicy: 'CACHE_ONLY' });
      expect(cacheResult2.data).to.deep.equal(newData);
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
      const relevantSpy1 = sinon.spy();
      const relevantSpy2 = sinon.spy();
      const relevantSpy3 = sinon.spy();
      const irrelevantSpy = sinon.spy();

      subscribe(relevantQuery, { onNext: () => {}, onErr: relevantSpy1 });
      subscribe(relevantQuery, { onNext: () => {}, onErr: relevantSpy2 });
      subscribe(relevantQuery, { onNext: () => {}, onErr: relevantSpy3 });
      subscribe(irrelevantQuery, { onNext: () => {}, onErr: irrelevantSpy });

      // get the query layer's notification hook which was passed to invokeSubscribe
      const hook = stubStreamTransport.invokeSubscribe.firstCall.args[0];

      // call the hook with errors
      const expectedError = new Error('test error');
      hook({ data: {}, errors: [expectedError], extensions: {} });

      expect(relevantSpy1.calledOnce).to.be.true;
      expect(relevantSpy2.calledOnce).to.be.true;
      expect(relevantSpy3.calledOnce).to.be.true;
      expect(irrelevantSpy).to.not.have.been.called;
      const result1 = relevantSpy1.firstCall.args[0];
      const result2 = relevantSpy2.firstCall.args[0];
      const result3 = relevantSpy3.firstCall.args[0];
      expect(result1).to.be.an.instanceOf(Error);
      expect(result1.message).to.include(
        'DataConnect error received from subscribe notification'
      );
      expect(result2).to.be.an.instanceOf(Error);
      expect(result2.message).to.include(
        'DataConnect error received from subscribe notification'
      );
      expect(result3).to.be.an.instanceOf(Error);
      expect(result3.message).to.include(
        'DataConnect error received from subscribe notification'
      );
    });

    it('should clean up subscriptions in query layer when hook receives a disconnect error', async () => {
      const q = queryRef<TestData, TestVariables>(dc, queryName, testVariables);
      const onNextSpy = sinon.spy();
      const onErrSpy = sinon.spy();

      subscribe(q, { onNext: onNextSpy, onErr: onErrSpy });

      const notificationHook =
        stubStreamTransport.invokeSubscribe.firstCall.args[0];

      const expectedError = new DataConnectError(
        Code.OTHER,
        'WebSocket disconnected externally'
      );
      await notificationHook({
        data: {},
        errors: [expectedError],
        extensions: {}
      });

      expect(onErrSpy).to.have.been.calledOnce;
      expect(stubStreamTransport.invokeUnsubscribe).to.have.been.calledOnce;

      // Call hook again with data, should not reach subscriber because it was cleaned up
      await notificationHook({
        data: { abc: 'new data' },
        errors: [],
        extensions: {}
      });
      expect(onNextSpy).to.not.have.been.called;
    });

    it('should NOT clean up subscriptions in query layer when hook receives a non-disconnect error', async () => {
      const q = queryRef<TestData, TestVariables>(dc, queryName, testVariables);
      const onNextSpy = sinon.spy();
      const onErrSpy = sinon.spy();

      subscribe(q, { onNext: onNextSpy, onErr: onErrSpy });

      const hook = stubStreamTransport.invokeSubscribe.firstCall.args[0];

      const expectedError = new Error('test error');
      await hook({ data: {}, errors: [expectedError], extensions: {} });

      expect(onErrSpy).to.have.been.calledOnce;

      // Call hook again with data, should STILL reach subscriber because it was NOT cleaned up
      const testData: TestData = { abc: 'new data' };
      await hook({ data: testData, errors: [], extensions: {} });
      expect(onNextSpy).to.have.been.calledOnce;
      expect(onNextSpy.firstCall.args[0].data).to.deep.equal(testData);

      // Verify that invokeUnsubscribe was NOT called
      expect(stubStreamTransport.invokeUnsubscribe).to.not.have.been.called;
    });
  });
});
