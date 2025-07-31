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

import { WebSocketServer, WebSocket } from 'ws';

/**
 * A mock WebSocket server for running integration tests against the
 * `NodeWebSocketHandler`. It listens on a specified port, accepts connections,
 * logs messages, and can broadcast messages to clients.
 *
 * This should only be used in a Node environment.
 *
 * @internal
 */
export class MockWebSocketServer {
  private wss: WebSocketServer;
  clients: Set<WebSocket> = new Set();
  receivedMessages: string[] = [];
  connectionCount = 0;

  constructor(public port: number) {
    this.wss = new WebSocketServer({ port });

    this.wss.on('connection', ws => {
      this.connectionCount++;
      this.clients.add(ws);

      ws.on('message', message => {
        this.receivedMessages.push(message.toString());
      });

      ws.on('close', () => {
        this.clients.delete(ws);
      });
    });
  }

  broadcast(message: string | Buffer): void {
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  close(): Promise<void> {
    return new Promise(resolve => {
      for (const client of this.clients) {
        client.terminate();
      }
      this.wss.close(() => {
        this.reset();
        resolve();
      });
    });
  }

  reset(): void {
    this.receivedMessages = [];
    this.connectionCount = 0;
  }
}
