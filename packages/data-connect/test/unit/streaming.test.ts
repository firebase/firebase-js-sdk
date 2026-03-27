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
  executeQuery,
  getDataConnect,
  queryRef,
  subscribe,
  SubscribeNotificationHook
} from '../../src';
import { initializeWebSocket } from '../../src/network/stream/websocket';

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
}

describe('Streaming & Query Layer Integration', () => {
  let dc: DataConnect;
  let app: FirebaseApp;
  let mockWebSocket: MockWebSocket;
  let manager: ManagerWithInternals;

  beforeEach(() => {
    const wsConstructor = function (url: string): MockWebSocket {
      mockWebSocket = new MockWebSocket(url);
      return mockWebSocket;
    };
    initializeWebSocket(wsConstructor as unknown as typeof WebSocket);

    app = initializeApp({ projectId: 'p', appId: 'a' }, 'n');
    dc = getDataConnect(app, {
      connector: 'c',
      location: 'l',
      service: 's'
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    manager = (dc as any)._transport;
  });

  afterEach(async () => {
    await dc._delete();
    await deleteApp(app);
    initializeWebSocket(WebSocket);
    sinon.restore();
  });

  const testVariables = { foo: "bar" };
  type TestVariables = typeof testVariables;
  const testData = { abc: "xyz" };
  type TestData = typeof testData;

  const queryName = 'testQuery';

  it('should call invokeSubscribe on first subscribe and receive data', async () => {
    const q = queryRef<TestData, TestVariables>(dc, queryName, testVariables);
    const onNextSpy = sinon.spy();
    subscribe(q, onNextSpy);

    expect(mockWebSocket).to.not.be.undefined;
    await mockWebSocket.simulateOpen();

    const responsePayload = {
      result: {
        requestId: '1',
        data: testData,
        errors: []
      }
    };
    await mockWebSocket.simulateMessage(JSON.stringify(responsePayload));

    expect(onNextSpy.calledOnce).to.be.true;
    const result = onNextSpy.firstCall.args[0];
    expect(result.data).to.deep.equal(testData);
  });

  it('should call invokeUnsubscribe on last unsubscribe', async () => {
    const invokeUnsubscribeStub = sinon.stub(manager, 'invokeUnsubscribe');
    const q = queryRef<TestData, TestVariables>(dc, queryName, testVariables);
    const onNextSpy1 = sinon.spy();
    const onNextSpy2 = sinon.spy();

    const unsub1 = subscribe(q, onNextSpy1);
    const unsub2 = subscribe(q, onNextSpy2);

    await mockWebSocket.simulateOpen();

    unsub1();
    expect(invokeUnsubscribeStub).to.not.have.been.called;
    unsub2();
    expect(invokeUnsubscribeStub).to.have.been.calledOnceWith(queryName, testVariables);
  });

  describe('incoming notifications', () => {
    it('should notify all relevant subscribers when data is pushed', async () => {
      const q = queryRef<TestData, TestVariables>(dc, queryName, testVariables);
      const relevantSpy1 = sinon.spy();
      const relevantSpy2 = sinon.spy();
      const relevantSpy3 = sinon.spy();
      const irrelevantSpy = sinon.spy();

      subscribe(q, relevantSpy1);
      subscribe(q, relevantSpy2);
      subscribe(q, relevantSpy3);
      subscribe(queryRef(dc, "otherQuery"), irrelevantSpy);

      await mockWebSocket.simulateOpen();

      const responsePayload = {
        result: {
          requestId: '1',
          data: testData,
          errors: []
        }
      };

      await mockWebSocket.simulateMessage(JSON.stringify(responsePayload));

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
    //   const q = queryRef<{ foo: string }, {}>(dc, 'testQuery', {});
    //   const onNextSpy = sinon.spy();

    //   subscribe(q, onNextSpy);

    //   await mockWebSocket.simulateOpen();

    //   const responsePayload = {
    //     result: {
    //       requestId: '1',
    //       data: { foo: 'bar' },
    //       errors: []
    //     }
    //   };

    //   await mockWebSocket.simulateMessage(JSON.stringify(responsePayload));

    //   // Verify cache was updated by executing query again - it should prefer cache if allowStale is true,
    //   // or if we just verify that it doesn't go to rest network (since we are not mocking fetch here, it might fail if it goes to rest).
    //   // Let's verify executeQuery also uses the stream condition if stream is connected.
    //   // In our test, stream IS connected.
    //   // So executeQuery will call invokeQuery on stream which sends an execute message.
    //   const executePromise = executeQuery(q, { fetchPolicy: 'SERVER_ONLY' });

    //   // Since stream is connected, it should send a message to ws.
    //   await Promise.resolve();
    //   await Promise.resolve();
    //   expect(mockWebSocket.send.called).to.be.true;
    //   const lastCall = mockWebSocket.send.lastCall;
    //   const msg = JSON.parse(lastCall.args[0]);
    //   // eslint-disable-next-line no-console
    //   console.log('Execute Message:', msg);
    //   expect(msg.execute).to.not.be.undefined;

    //   // Simulate response for executeQuery execution.
    //   // Use the requestId from the actual sent message!
    //   const executeResponse = {
    //     result: {
    //       requestId: msg.requestId,
    //       data: { foo: 'baz' },
    //       errors: []
    //     }
    //   };
    //   await mockWebSocket.simulateMessage(JSON.stringify(executeResponse));

    //   await expect(executePromise).to.be.fulfilled;
    //   const res = await executePromise;
    //   expect(res.data).to.deep.equal({ foo: 'baz' });
    // });
  });
});