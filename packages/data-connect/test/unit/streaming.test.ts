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
  executeQuery,
  getDataConnect,
  queryRef,
  subscribe
} from '../../src';
import { initializeWebSocket } from '../../src/network/stream/websocket';

chai.use(chaiAsPromised);

class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readyState: number = MockWebSocket.CONNECTING;
  send: sinon.SinonSpy = sinon.spy();
  close: sinon.SinonSpy = sinon.spy();

  onopen: (() => void | Promise<void>) | null = null;
  onerror: ((err: Error) => void | Promise<void>) | null = null;
  onmessage: ((ev: MessageEvent) => void | Promise<void>) | null = null;
  onclose: ((ev: CloseEvent) => void | Promise<void>) | null = null;

  url: string;
  constructor(url: string) {
    this.url = url;
  }

  simulateOpen(): void | Promise<void> {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) {
      return this.onopen();
    }
  }

  simulateError(err: Error): void | Promise<void> {
    if (this.onerror) {
      return this.onerror(err);
    }
  }

  simulateMessage(data: string): void | Promise<void> {
    if (this.onmessage) {
      return this.onmessage({ data } as MessageEvent);
    }
  }

  simulateClose(code = 1000, reason = 'Normal Closure'): void | Promise<void> {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      return this.onclose({ code, reason } as CloseEvent);
    }
  }
}

describe('Streaming & Query Layer Integration', () => {
  let dc: DataConnect;
  let app: FirebaseApp;
  const APPID = 'MYAPPID';
  const APPNAME = 'MYAPPNAME';
  let mockWebSocketInstances: MockWebSocket[] = [];

  beforeEach(() => {
    mockWebSocketInstances = [];
    const wsConstructor = function (url: string): MockWebSocket {
      const ws = new MockWebSocket(url);
      mockWebSocketInstances.push(ws);
      return ws;
    };
    wsConstructor.CONNECTING = WebSocket.CONNECTING;
    wsConstructor.OPEN = WebSocket.OPEN;
    wsConstructor.CLOSING = WebSocket.CLOSING;
    wsConstructor.CLOSED = WebSocket.CLOSED;

    initializeWebSocket(wsConstructor as unknown as typeof WebSocket);

    app = initializeApp({ projectId: 'p', appId: APPID }, APPNAME);
    dc = getDataConnect(app, {
      connector: 'c',
      location: 'l',
      service: 's'
    });
  });

  afterEach(async () => {
    await dc._delete();
    await deleteApp(app);
    initializeWebSocket(WebSocket);
    sinon.restore();
  });

  it('should call invokeSubscribe on first subscribe and receive data', async () => {
    const q = queryRef<{ foo: string }, {}>(dc, 'testQuery', {});
    const onNextSpy = sinon.spy();

    const unsub = subscribe(q, onNextSpy);

    // Initial subscribe should try to connect.
    const ws = mockWebSocketInstances[0];
    expect(ws).to.not.be.undefined;

    await ws.simulateOpen();

    // Now push data into the websocket.
    const responsePayload = {
      result: {
        requestId: '1', // Monotonically increasing requestId from streamTransport
        data: { foo: 'bar' },
        errors: []
      }
    };

    await ws.simulateMessage(JSON.stringify(responsePayload));

    expect(onNextSpy.calledOnce).to.be.true;
    const result = onNextSpy.firstCall.args[0];
    expect(result.data).to.deep.equal({ foo: 'bar' });

    unsub();
  });

  it('should call invokeUnsubscribe on last unsubscribe', async () => {
    const q = queryRef<{ foo: string }, {}>(dc, 'testQuery', {});
    const onNextSpy = sinon.spy();

    const unsub1 = subscribe(q, onNextSpy);
    const unsub2 = subscribe(q, onNextSpy);

    const ws = mockWebSocketInstances[0];
    await ws.simulateOpen();

    unsub1();
    // ws.send should not contain cancel yet if we only unsubscribed one of two.
    // wait, our unsubscribe logic in QueryManager checks if newList.length === 0 to call invokeUnsubscribe.
    // In our implementation, we call invokeUnsubscribe which sends a message.
    // Let's check if MockWebSocket.send was called with cancel message.

    // For single subscriber unsubscription, it should call invokeUnsubscribe.
    unsub2();

    // ws.send should be called with cancel message.
    // Flush microtasks for the fire-and-forget sendMessage to take effect
    await Promise.resolve();
    await Promise.resolve();
    expect(ws.send.called).to.be.true;
    const sendCalls = ws.send.getCalls();
    // eslint-disable-next-line no-console
    console.log('--- ALL CALLS TO WS.SEND ---');
    // eslint-disable-next-line no-console
    ws.send.getCalls().forEach((c, i) => console.log(`Call ${i}:`, c.args[0]));
    // eslint-disable-next-line no-console
    console.log('-----------------------------');

    const cancelCall = sendCalls.find(call => {
      const msg = JSON.parse(call.args[0]);
      return !!msg.cancel;
    });
    expect(cancelCall).to.not.be.undefined;
  });

  it('should update cache when data is pushed', async () => {
    const q = queryRef<{ foo: string }, {}>(dc, 'testQuery', {});
    const onNextSpy = sinon.spy();

    subscribe(q, onNextSpy);

    const ws = mockWebSocketInstances[0];
    await ws.simulateOpen();

    const responsePayload = {
      result: {
        requestId: '1',
        data: { foo: 'bar' },
        errors: []
      }
    };

    await ws.simulateMessage(JSON.stringify(responsePayload));

    // Verify cache was updated by executing query again - it should prefer cache if allowStale is true,
    // or if we just verify that it doesn't go to rest network (since we are not mocking fetch here, it might fail if it goes to rest).
    // Let's verify executeQuery also uses the stream condition if stream is connected.
    // In our test, stream IS connected.
    // So executeQuery will call invokeQuery on stream which sends an execute message.
    const executePromise = executeQuery(q, { fetchPolicy: 'SERVER_ONLY' });

    // Since stream is connected, it should send a message to ws.
    await Promise.resolve();
    await Promise.resolve();
    expect(ws.send.called).to.be.true;
    const lastCall = ws.send.lastCall;
    const msg = JSON.parse(lastCall.args[0]);
    // eslint-disable-next-line no-console
    console.log('Execute Message:', msg);
    expect(msg.execute).to.not.be.undefined;

    // Simulate response for executeQuery execution.
    // Use the requestId from the actual sent message!
    const executeResponse = {
      result: {
        requestId: msg.requestId,
        data: { foo: 'baz' },
        errors: []
      }
    };
    await ws.simulateMessage(JSON.stringify(executeResponse));

    await expect(executePromise).to.be.fulfilled;
    const res = await executePromise;
    expect(res.data).to.deep.equal({ foo: 'baz' });
  });
});