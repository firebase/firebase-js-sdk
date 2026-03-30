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

import {
  DataConnect,
  DataConnectResponse,
  DataConnectResponseWithMaxAge,
  executeMutation,
  executeQuery,
  getDataConnect,
  mutationRef,
  queryRef,
  subscribe,
  SubscribeNotificationHook
} from '../../src';
import { DataConnectTransportManager } from '../../src/network/manager';
import { AbstractDataConnectStreamTransport } from '../../src/network/stream/streamTransport';
import { initializeWebSocket } from '../../src/network/stream/websocket';
import { DataConnectStreamRequest } from '../../src/network/stream/wire';

import { MockWebSocket } from './testUtils';

chai.use(chaiAsPromised);

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
}

describe('Streaming & Query Layer Integration', () => {
  let dc: DataConnect;
  let app: FirebaseApp;
  /** the currently active websocket, if any */
  let mockWebSocket: MockWebSocket | null;
  let manager: ManagerWithInternals;
  /** this is only initialized once the websocket is opened */
  let sendMessageSpy: sinon.SinonSpy | null;
  let initStreamTransportStub: sinon.SinonStub;

  beforeEach(() => {
    const wsConstructor = function (url: string): MockWebSocket {
      mockWebSocket = new MockWebSocket(url);
      mockWebSocket.onclose = async event => {
        await mockWebSocket?.onclose?.(event);
        mockWebSocket = null;
        sendMessageSpy = null;
      };
      return mockWebSocket;
    };
    initializeWebSocket(wsConstructor as unknown as typeof WebSocket);

    const originalInitStreamTransport = (DataConnectTransportManager.prototype as unknown as ManagerWithInternals).initStreamTransport;
    initStreamTransportStub = sinon.stub(DataConnectTransportManager.prototype as unknown as ManagerWithInternals, 'initStreamTransport').callsFake(function (this: ManagerWithInternals) {
      const streamTransport = originalInitStreamTransport.apply(this);
      // eslint-disable-next-line no-console
      console.log(streamTransport);
      sendMessageSpy = sinon.spy(streamTransport as unknown as StreamTransportWithInternals, 'sendMessage');
      return streamTransport;
    });

    app = initializeApp({ projectId: 'p', appId: 'a' }, 'n');
    dc = getDataConnect(app, {
      connector: 'c',
      location: 'l',
      service: 's'
    });
    dc.setInitialized();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    manager = (dc as any)._transport;
  });

  afterEach(async () => {
    await dc._delete();
    await deleteApp(app);
    initializeWebSocket(WebSocket);
    mockWebSocket = null;
    sinon.restore();
  });

  const testVariables = { foo: "bar" };
  type TestVariables = typeof testVariables;
  const testData = { abc: "xyz" };
  type TestData = typeof testData;

  const queryName = 'testQuery';

  describe('user-facing API', () => {
    it('executeQuery / executeMutation should not initialize stream', async () => {
      const q = queryRef<TestData, TestVariables>(dc, queryName, testVariables);
      const m = mutationRef<TestData, TestVariables>(dc, queryName, testVariables);

      void executeQuery(q);
      expect(initStreamTransportStub).to.not.have.been.called;
      expect(mockWebSocket).to.be.undefined;
      void executeMutation(m);
      expect(initStreamTransportStub).to.not.have.been.called;
      expect(mockWebSocket).to.be.undefined;
    });

    it('subscribe should initialize stream', async () => {
      const q = queryRef<TestData, TestVariables>(dc, queryName, testVariables);
      subscribe(q, () => { });
      expect(initStreamTransportStub).to.have.been.calledOnce;
      await mockWebSocket!.simulateOpen();
      expect(mockWebSocket).to.not.be.undefined;
    });

    it('query layer should call invokeUnsubscribe on last unsubscribe', async () => {
      const invokeUnsubscribeStub = sinon.stub(manager, 'invokeUnsubscribe');
      const onNextSpy1 = sinon.spy();
      const onNextSpy2 = sinon.spy();
      const onNextSpy3 = sinon.spy();
      const q = queryRef<TestData, TestVariables>(dc, queryName, testVariables);

      const unsub1 = subscribe(q, onNextSpy1);
      const unsub2 = subscribe(q, onNextSpy2);
      const unsub3 = subscribe(q, onNextSpy3);

      await mockWebSocket!.simulateOpen();

      unsub1();
      expect(invokeUnsubscribeStub).to.not.have.been.called;
      unsub2();
      expect(invokeUnsubscribeStub).to.not.have.been.called;
      unsub3();
      expect(invokeUnsubscribeStub).to.have.been.calledOnceWith(queryName, testVariables);
    });

  });

  describe('incoming notifications', () => {
    it('should notify all relevant subscribers when data is received', async () => {
      const relevantQuery = queryRef<TestData, TestVariables>(dc, queryName, testVariables);
      const irrelevantQuery = queryRef<TestData, TestVariables>(dc, 'otherQuery', { foo: 'xyz' });
      const relevantSpy1 = sinon.spy();
      const relevantSpy2 = sinon.spy();
      const relevantSpy3 = sinon.spy();
      const irrelevantSpy = sinon.spy();
      subscribe(relevantQuery, relevantSpy1);
      subscribe(relevantQuery, relevantSpy2);
      subscribe(relevantQuery, relevantSpy3);

      await mockWebSocket!.simulateOpen();

      subscribe(irrelevantQuery, irrelevantSpy);

      const firstRequest: DataConnectStreamRequest<TestVariables> = sendMessageSpy!.firstCall.args[0];
      const relevantNotification = {
        result: {
          requestId: firstRequest.requestId,
          data: testData,
          errors: []
        }
      };

      await mockWebSocket!.simulateMessage(JSON.stringify(relevantNotification));

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

    // it('should update cache when data is pushed', async () => {
    //   const q = queryRef<TestData, TestVariables>(dc, queryName, testVariables);
    //   const onNextSpy = sinon.spy();

    //   subscribe(q, onNextSpy);

    //   await mockWebSocket!.simulateOpen();
    //   const subscribeRequest: DataConnectStreamRequest<TestVariables> = sendMessageSpy!.firstCall.args[0];
    //   const subscribeNotification = {
    //     result: {
    //       requestId: subscribeRequest.requestId,
    //       data: testData,
    //       errors: []
    //     }
    //   };

    //   await mockWebSocket!.simulateMessage(JSON.stringify(subscribeNotification));

    //   const executePromise = executeQuery(q, { fetchPolicy: 'SERVER_ONLY' });

    //   expect(mockWebSocket!.send.called).to.be.true;
    //   expect(subscribeRequest.execute).to.not.be.undefined;

    //   const executeResponse = {
    //     result: {
    //       requestId: subscribeRequest.requestId,
    //       data: testData,
    //       errors: []
    //     }
    //   };
    //   await mockWebSocket!.simulateMessage(JSON.stringify(executeResponse));

    //   await expect(executePromise).to.be.fulfilled;
    //   const res = await executePromise;
    //   expect(res.data).to.deep.equal({ foo: 'baz' });
    // });

    it('should notify all relevant subscribers of errors when they are pushed', async () => {
      const relevantQuery = queryRef<TestData, TestVariables>(dc, queryName, testVariables);
      const irrelevantQuery = queryRef<TestData, TestVariables>(dc, 'otherQuery', { foo: 'xyz' });
      const relevantSpy1 = sinon.spy();
      const relevantSpy2 = sinon.spy();
      const relevantSpy3 = sinon.spy();
      const irrelevantSpy = sinon.spy();
      subscribe(relevantQuery, { onNext: () => { }, onErr: relevantSpy1 });
      subscribe(relevantQuery, { onNext: () => { }, onErr: relevantSpy2 });
      subscribe(relevantQuery, { onNext: () => { }, onErr: relevantSpy3 });
      const expectedError = new Error('test error');

      await mockWebSocket!.simulateOpen();

      subscribe(irrelevantQuery, { onNext: () => { }, onErr: irrelevantSpy });

      const firstRequest: DataConnectStreamRequest<TestVariables> = sendMessageSpy!.firstCall.args[0];
      const relevantNotification = {
        result: {
          requestId: firstRequest.requestId,
          data: testData,
          errors: [expectedError]
        }
      };

      await mockWebSocket!.simulateMessage(JSON.stringify(relevantNotification));

      expect(relevantSpy1.calledOnce).to.be.true;
      expect(relevantSpy2.calledOnce).to.be.true;
      expect(relevantSpy3.calledOnce).to.be.true;
      expect(irrelevantSpy).to.not.have.been.called;
      const result1 = relevantSpy1.firstCall.args[0];
      const result2 = relevantSpy2.firstCall.args[0];
      const result3 = relevantSpy3.firstCall.args[0];
      expect(result1).to.be.an.instanceOf(Error);
      expect(result1.message).to.include('DataConnect error while received from subscribe notification');
      expect(result2).to.be.an.instanceOf(Error);
      expect(result2.message).to.include('DataConnect error while received from subscribe notification');
      expect(result3).to.be.an.instanceOf(Error);
      expect(result3.message).to.include('DataConnect error while received from subscribe notification');
    });
  });
});