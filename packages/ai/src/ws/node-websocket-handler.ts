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
import { AIErrorCode } from '../public-types';
import { WebSocketHandler } from './websocket-handler';

/**
 * A WebSocketHandler implementation for Node >= 22.
 * It uses the native, built-in 'ws' module, which must be imported.
 *
 * @internal
 */
export class NodeWebSocketHandler implements WebSocketHandler {
  private ws?: import('ws').WebSocket;

  async connect(url: string): Promise<void> {
    // This dynamic import is why we need a separate class.
    // It is only ever executed in a Node environment, preventing browser
    // bundlers from attempting to resolve this Node-specific module.
    // eslint-disable-next-line import/no-extraneous-dependencies
    const { WebSocket } = await import('ws');

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);
      this.ws!.addEventListener('open', () => resolve(), { once: true });
      this.ws!.addEventListener(
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
    if (!this.ws || this.ws.readyState !== this.ws.OPEN) {
      throw new AIError(AIErrorCode.REQUEST_ERROR, 'WebSocket is not open.');
    }
    this.ws.send(data);
  }

  async *listen(): AsyncGenerator<unknown> {
    if (!this.ws) {
      throw new AIError(
        AIErrorCode.REQUEST_ERROR,
        'WebSocket is not connected.'
      );
    }

    const messageQueue: unknown[] = [];
    let resolvePromise: (() => void) | null = null;
    let isClosed = false;

    const messageListener = (event: import('ws').MessageEvent): void => {
      let textData: string;

      if (typeof event.data === 'string') {
        textData = event.data;
      } else if (
        event.data instanceof Buffer ||
        event.data instanceof ArrayBuffer ||
        event.data instanceof Uint8Array
      ) {
        const decoder = new TextDecoder();
        textData = decoder.decode(event.data);
      } else {
        console.warn('Received unexpected WebSocket message type:', event.data);
        return;
      }

      try {
        const parsedObject = JSON.parse(textData);
        messageQueue.push(parsedObject);
        if (resolvePromise) {
          resolvePromise();
          resolvePromise = null;
        }
      } catch (e) {
        console.warn('Failed to parse WebSocket message to JSON:', textData, e);
      }
    };

    const closeListener = (): void => {
      isClosed = true;
      if (resolvePromise) {
        resolvePromise();
        resolvePromise = null;
      }
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
      if (!this.ws || this.ws.readyState === this.ws.CLOSED) {
        return resolve();
      }
      this.ws.addEventListener('close', () => resolve(), { once: true });
      this.ws.close(code, reason);
    });
  }
}
