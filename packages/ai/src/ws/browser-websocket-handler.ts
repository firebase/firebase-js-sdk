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

import { AIError } from '../errors';
import { AIErrorCode } from '../types';
import { WebSocketHandler } from './websocket-handler';

/**
 * A WebSocketHandler implementation for the browser environment.
 * It uses the native `WebSocket`.
 * @internal
 */
export class BrowserWebSocketHandler implements WebSocketHandler {
  private ws?: WebSocket;

  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);
      } catch (e) {
        return reject(
          new AIError(
            AIErrorCode.ERROR,
            `Internal Error: Invalid WebSocket URL: ${url}`
          )
        );
      }

      this.ws.addEventListener('open', () => resolve(), { once: true });
      this.ws.addEventListener(
        'error',
        () =>
          reject(
            new AIError(
              AIErrorCode.FETCH_ERROR,
              'Failed to establish WebSocket connection'
            )
          ),
        { once: true }
      );
    });
  }

  send(data: string | ArrayBuffer): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new AIError(AIErrorCode.REQUEST_ERROR, 'WebSocket is not open.');
    }
    this.ws.send(data);
  }

  async *listen(): AsyncGenerator<unknown> {
    console.log('listener started');
    if (!this.ws) {
      throw new AIError(
        AIErrorCode.REQUEST_ERROR,
        'WebSocket is not connected.'
      );
    }

    const messageQueue: unknown[] = [];
    let resolvePromise: (() => void) | null = null;
    let isClosed = false;

    const messageListener = async (event: MessageEvent): Promise<void> => {
      if (event.data instanceof Blob) {
        const obj = JSON.parse(await event.data.text()) as unknown;
        messageQueue.push(obj);
        if (resolvePromise) {
          resolvePromise();
          resolvePromise = null;
        }
      } else {
        throw new AIError(
          AIErrorCode.PARSE_FAILED,
          'Failed to parse WebSocket response to JSON, response was not a Blob'
        );
      }
    };

    const closeListener = (): void => {
      isClosed = true;
      if (resolvePromise) {
        resolvePromise();
        resolvePromise = null;
      }
      // Clean up listeners to prevent memory leaks
      this.ws?.removeEventListener('message', messageListener);
      this.ws?.removeEventListener('close', closeListener);
    };

    this.ws.addEventListener('message', messageListener);
    this.ws.addEventListener('close', closeListener);

    while (!isClosed) {
      if (messageQueue.length > 0) {
        yield messageQueue.shift()!;
      } else {
        await new Promise<void>(resolve => {
          resolvePromise = resolve;
        });
      }
    }
  }

  close(code?: number, reason?: string): Promise<void> {
    return new Promise(resolve => {
      if (
        !this.ws ||
        this.ws.readyState === WebSocket.CLOSED ||
        this.ws.readyState === WebSocket.CLOSING
      ) {
        return resolve();
      }
      this.ws.addEventListener('close', () => resolve(), { once: true });
      this.ws.close(code, reason);
    });
  }
}
