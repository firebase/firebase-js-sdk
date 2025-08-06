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

import { expect, use } from 'chai';
import sinon, { SinonFakeTimers, SinonStub } from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import { isBrowser } from '@firebase/util';
import { BrowserWebSocketHandler } from './websocket';
import { AIError } from '../../errors';

use(sinonChai);
use(chaiAsPromised);

class MockBrowserWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState: number = MockBrowserWebSocket.CONNECTING;
  sentMessages: Array<string | ArrayBuffer> = [];
  url: string;
  private listeners: Map<string, Set<EventListener>> = new Map();

  constructor(url: string) {
    this.url = url;
  }

  send(data: string | ArrayBuffer): void {
    if (this.readyState !== MockBrowserWebSocket.OPEN) {
      throw new Error('WebSocket is not in OPEN state');
    }
    this.sentMessages.push(data);
  }

  close(): void {
    if (
      this.readyState === MockBrowserWebSocket.CLOSED ||
      this.readyState === MockBrowserWebSocket.CLOSING
    ) {
      return;
    }
    this.readyState = MockBrowserWebSocket.CLOSING;
    setTimeout(() => {
      this.readyState = MockBrowserWebSocket.CLOSED;
      this.dispatchEvent(new Event('close'));
    }, 10);
  }

  addEventListener(type: string, listener: EventListener): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  dispatchEvent(event: Event): void {
    this.listeners.get(event.type)?.forEach(listener => listener(event));
  }

  triggerOpen(): void {
    this.readyState = MockBrowserWebSocket.OPEN;
    this.dispatchEvent(new Event('open'));
  }

  triggerMessage(data: any): void {
    this.dispatchEvent(new MessageEvent('message', { data }));
  }

  triggerError(): void {
    this.dispatchEvent(new Event('error'));
  }
}

describe('BrowserWebSocketHandler', () => {
  let handler: BrowserWebSocketHandler;
  let mockWebSocket: MockBrowserWebSocket;
  let clock: SinonFakeTimers;
  let webSocketStub: SinonStub;

  // Only run these tests in a browser environment
  if (!isBrowser()) {
    return;
  }

  beforeEach(() => {
    webSocketStub = sinon.stub(window, 'WebSocket').callsFake((url: string) => {
      mockWebSocket = new MockBrowserWebSocket(url);
      return mockWebSocket as any;
    });
    clock = sinon.useFakeTimers();
    handler = new BrowserWebSocketHandler();
  });

  afterEach(() => {
    sinon.restore();
    clock.restore();
  });

  describe('connect()', () => {
    it('should resolve on open event', async () => {
      const connectPromise = handler.connect('ws://test-url');
      expect(webSocketStub).to.have.been.calledWith('ws://test-url');

      await clock.tickAsync(1);
      mockWebSocket.triggerOpen();

      await expect(connectPromise).to.be.fulfilled;
    });

    it('should reject on error event', async () => {
      const connectPromise = handler.connect('ws://test-url');
      await clock.tickAsync(1);
      mockWebSocket.triggerError();

      await expect(connectPromise).to.be.rejectedWith(
        AIError,
        /Failed to establish WebSocket connection/
      );
    });
  });

  describe('listen()', () => {
    beforeEach(async () => {
      const connectPromise = handler.connect('ws://test');
      mockWebSocket.triggerOpen();
      await connectPromise;
    });

    it('should yield multiple messages as they arrive', async () => {
      const generator = handler.listen();

      const received: unknown[] = [];
      const listenPromise = (async () => {
        for await (const msg of generator) {
          received.push(msg);
        }
      })();

      // Use tickAsync to allow the consumer to start listening
      await clock.tickAsync(1);
      mockWebSocket.triggerMessage(new Blob([JSON.stringify({ foo: 1 })]));

      await clock.tickAsync(10);
      mockWebSocket.triggerMessage(new Blob([JSON.stringify({ foo: 2 })]));

      await clock.tickAsync(5);
      mockWebSocket.close();
      await clock.runAllAsync(); // Let timers finish

      await listenPromise; // Wait for the consumer to finish

      expect(received).to.deep.equal([
        {
          foo: 1
        },
        {
          foo: 2
        }
      ]);
    });

    it('should buffer messages that arrive before the consumer calls .next()', async () => {
      const generator = handler.listen();

      // Create a promise that will consume the generator in a separate async context
      const received: unknown[] = [];
      const consumptionPromise = (async () => {
        for await (const message of generator) {
          received.push(message);
        }
      })();

      await clock.tickAsync(1);

      mockWebSocket.triggerMessage(new Blob([JSON.stringify({ foo: 1 })]));
      mockWebSocket.triggerMessage(new Blob([JSON.stringify({ foo: 2 })]));

      await clock.tickAsync(1);
      mockWebSocket.close();
      await clock.runAllAsync();

      await consumptionPromise;

      expect(received).to.deep.equal([
        {
          foo: 1
        },
        {
          foo: 2
        }
      ]);
    });
  });

  describe('close()', () => {
    it('should be idempotent and not throw if called multiple times', async () => {
      const connectPromise = handler.connect('ws://test');
      mockWebSocket.triggerOpen();
      await connectPromise;

      const closePromise1 = handler.close();
      await clock.runAllAsync();
      await closePromise1;

      await expect(handler.close()).to.be.fulfilled;
    });

    it('should wait for the onclose event before resolving', async () => {
      const connectPromise = handler.connect('ws://test');
      mockWebSocket.triggerOpen();
      await connectPromise;

      let closed = false;
      const closePromise = handler.close().then(() => {
        closed = true;
      });

      // The promise should not have resolved yet
      await clock.tickAsync(5);
      expect(closed).to.be.false;

      // Now, let the mock's setTimeout for closing run, which triggers onclose
      await clock.tickAsync(10);

      await expect(closePromise).to.be.fulfilled;
      expect(closed).to.be.true;
    });
  });

  describe('Interaction between listen() and close()', () => {
    it('should allow close() to take precedence and resolve correctly, while also terminating the listener', async () => {
      const connectPromise = handler.connect('ws://test');
      mockWebSocket.triggerOpen();
      await connectPromise;

      const generator = handler.listen();
      const listenPromise = (async () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _ of generator) {
        }
      })();

      const closePromise = handler.close();

      await clock.runAllAsync();

      await expect(closePromise).to.be.fulfilled;
      await expect(listenPromise).to.be.fulfilled;

      expect(mockWebSocket.readyState).to.equal(MockBrowserWebSocket.CLOSED);
    });
  });
});
