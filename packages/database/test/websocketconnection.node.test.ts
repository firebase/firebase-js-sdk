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

import * as http from 'http';

import { describe, expect, it } from 'vitest';

import { RepoInfo } from '../src/core/RepoInfo';
import { WebSocketConnection } from '../src/realtime/WebSocketConnection';

describe('WebSocketConnection Node faye-websocket HTTP status extraction', () => {
  for (const statusCode of [402, 429]) {
    it(`extracts HTTP ${statusCode} from real faye-websocket upgrade rejection`, async () => {
      const server = http.createServer((_req, res) => {
        res.writeHead(statusCode);
        res.end();
      });
      server.on('upgrade', (_req, socket) => {
        socket.write(
          `HTTP/1.1 ${statusCode} Error\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`
        );
        socket.end();
      });

      await new Promise<void>(resolve => {
        server.listen(0, '127.0.0.1', () => resolve());
      });

      try {
        const address = server.address();
        if (!address || typeof address === 'string') {
          throw new Error('Unexpected server address');
        }
        const repoInfo = new RepoInfo(
          `127.0.0.1:${address.port}`,
          false,
          'test-ns',
          true
        );
        const conn = new WebSocketConnection('conn-node', repoInfo);

        const result = await new Promise<{
          everConnected?: boolean;
          httpStatus?: number;
        }>(resolve => {
          conn.open(
            () => {},
            (everConnected, httpStatus) => {
              resolve({ everConnected, httpStatus });
            }
          );
        });

        expect(result.everConnected).toBe(false);
        expect(result.httpStatus).toBe(statusCode);
      } finally {
        await new Promise<void>(resolve => {
          server.close(() => resolve());
        });
      }
    });
  }
});
