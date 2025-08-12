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
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import { isNode } from '@firebase/util';
import { TextEncoder } from 'util';
import { MockWebSocketServer } from '../../../test-utils/mock-websocket-server';
import { WebSocketHandler } from '../websocket';
import { NodeWebSocketHandler } from './websocket';

use(sinonChai);
use(chaiAsPromised);

const TEST_PORT = 9003;
const TEST_URL = `ws://localhost:${TEST_PORT}`;

describe('NodeWebSocketHandler', () => {
  let server: MockWebSocketServer;
  let handler: WebSocketHandler;

  // Only run these tests in a Node environment
  if (!isNode()) {
    return;
  }

  before(async () => {
    server = new MockWebSocketServer(TEST_PORT);
  });

  after(async () => {
    await server.close();
  });

  beforeEach(() => {
    handler = new NodeWebSocketHandler();
    server.reset();
  });

  afterEach(async () => {
    await handler.close().catch(() => {});
  });

  describe('connect()', () => {
    it('should successfully connect to a running server', async () => {
      await handler.connect(TEST_URL);
      // Allow a brief moment for the server to register the connection
      await new Promise(r => setTimeout(r, 50));
      expect(server.connectionCount).to.equal(1);
      expect(server.clients.size).to.equal(1);
    });

    it('should reject if the connection fails', async () => {
      const wrongPortUrl = `ws://wrongUrl:9000`;
      await expect(handler.connect(wrongPortUrl)).to.be.rejected;
    });
  });

  describe('listen()', () => {
    beforeEach(async () => {
      await handler.connect(TEST_URL);
      // Wait for server to see the connection
      await new Promise(r => setTimeout(r, 50));
    });

    it('should yield parsed JSON objects from string data sent by the server', async () => {
      const generator = handler.listen();
      const messageObj = { id: 1, text: 'test' };

      const received: unknown[] = [];
      const consumerPromise = (async () => {
        for await (const msg of generator) {
          received.push(msg);
        }
      })();

      // Wait for the listener to be attached
      await new Promise(r => setTimeout(r, 50));
      server.broadcast(JSON.stringify(messageObj));
      await new Promise(r => setTimeout(r, 50));
      await handler.close(); // Close client to terminate the loop

      await consumerPromise;
      expect(received).to.deep.equal([messageObj]);
    });

    it('should correctly decode UTF-8 binary data sent by the server', async () => {
      const generator = handler.listen();
      const messageObj = { text: '你好, 世界 🌍' };
      const encoder = new TextEncoder();
      const bufferData = encoder.encode(JSON.stringify(messageObj));

      const received: unknown[] = [];
      const consumerPromise = (async () => {
        for await (const msg of generator) {
          received.push(msg);
        }
      })();

      await new Promise(r => setTimeout(r, 500));
      // The server's `send` method can handle Buffers/Uint8Arrays
      server.clients.forEach(client => client.send(bufferData));
      await new Promise(r => setTimeout(r, 500));
      await handler.close();

      await consumerPromise;
      expect(received).to.deep.equal([messageObj]);
    });

    it('should terminate the generator when the server closes the connection', async () => {
      const generator = handler.listen();
      const consumerPromise = (async () => {
        // This loop should finish without error when the server closes
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _ of generator) {
        }
      })();

      await new Promise(r => setTimeout(r, 50));

      await server.close();
      server = new MockWebSocketServer(TEST_PORT);

      // The consumer promise should resolve without timing out
      await expect(consumerPromise).to.be.fulfilled;
    });
  });
});
