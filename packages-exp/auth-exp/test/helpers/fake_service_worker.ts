/**
 * @license
 * Copyright 2019 Google LLC
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

export class FakeServiceWorker {
  private readonly listeners: {
    [type: string]: Set<EventListenerOrEventListenerObject>;
  } = {};

  postMessage(message: any, transfer: MessagePort[]): void {
    if (!this.listeners['message']) {
      return;
    }
    this.listeners['message'].forEach(listener => {
      const event = new MessageEvent('message', {
        data: message,
        ports: transfer
      });
      if (typeof listener === 'object') {
        listener.handleEvent(event);
      } else {
        listener(event);
      }
    });
  }
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    _options?: boolean | AddEventListenerOptions
  ): void {
    if (!this.listeners[type]) {
      this.listeners[type] = new Set();
    }
    this.listeners[type].add(listener);
  }
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    _options?: boolean | EventListenerOptions
  ): void {
    this.listeners[type].delete(listener);
    if (this.listeners[type].size === 0) {
      delete this.listeners[type];
    }
  }
}
