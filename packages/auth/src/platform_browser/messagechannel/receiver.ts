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

import {
  ReceiverHandler,
  _EventType,
  _ReceiverResponse,
  SenderMessageEvent,
  _Status,
  _SenderRequest
} from './index';
import { _allSettled } from './promise';

/**
 * Interface class for receiving messages.
 *
 */
export class Receiver {
  private static readonly receivers: Receiver[] = [];
  private readonly boundEventHandler: EventListener;

  private readonly handlersMap: {
    // Typescript doesn't have existential types :(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [eventType: string]: Set<ReceiverHandler<any, any>>;
  } = {};

  constructor(private readonly eventTarget: EventTarget) {
    this.boundEventHandler = this.handleEvent.bind(this);
  }

  /**
   * Obtain an instance of a Receiver for a given event target, if none exists it will be created.
   *
   * @param eventTarget - An event target (such as window or self) through which the underlying
   * messages will be received.
   */
  static _getInstance(eventTarget: EventTarget): Receiver {
    // The results are stored in an array since objects can't be keys for other
    // objects. In addition, setting a unique property on an event target as a
    // hash map key may not be allowed due to CORS restrictions.
    const existingInstance = this.receivers.find(receiver =>
      receiver.isListeningto(eventTarget)
    );
    if (existingInstance) {
      return existingInstance;
    }
    const newInstance = new Receiver(eventTarget);
    this.receivers.push(newInstance);
    return newInstance;
  }

  private isListeningto(eventTarget: EventTarget): boolean {
    return this.eventTarget === eventTarget;
  }

  /**
   * Fans out a MessageEvent to the appropriate listeners.
   *
   * @remarks
   * Sends an {@link Status.ACK} upon receipt and a {@link Status.DONE} once all handlers have
   * finished processing.
   *
   * @param event - The MessageEvent.
   *
   */
  private async handleEvent<
    T extends _ReceiverResponse,
    S extends _SenderRequest
  >(event: Event): Promise<void> {
    const messageEvent = event as MessageEvent<SenderMessageEvent<S>>;
    const { eventId, eventType, data } = messageEvent.data;

    const handlers: Set<ReceiverHandler<T, S>> | undefined =
      this.handlersMap[eventType];
    if (!handlers?.size) {
      return;
    }

    messageEvent.ports[0].postMessage({
      status: _Status.ACK,
      eventId,
      eventType
    });

    const promises = Array.from(handlers).map(async handler =>
      handler(messageEvent.origin, data)
    );
    const response = await _allSettled(promises);
    messageEvent.ports[0].postMessage({
      status: _Status.DONE,
      eventId,
      eventType,
      response
    });
  }

  /**
   * Subscribe an event handler for a particular event.
   *
   * @param eventType - Event name to subscribe to.
   * @param eventHandler - The event handler which should receive the events.
   *
   */
  _subscribe<T extends _ReceiverResponse, S extends _SenderRequest>(
    eventType: _EventType,
    eventHandler: ReceiverHandler<T, S>
  ): void {
    if (Object.keys(this.handlersMap).length === 0) {
      this.eventTarget.addEventListener('message', this.boundEventHandler);
    }

    if (!this.handlersMap[eventType]) {
      this.handlersMap[eventType] = new Set();
    }

    this.handlersMap[eventType].add(eventHandler);
  }

  /**
   * Unsubscribe an event handler from a particular event.
   *
   * @param eventType - Event name to unsubscribe from.
   * @param eventHandler - Optinoal event handler, if none provided, unsubscribe all handlers on this event.
   *
   */
  _unsubscribe<T extends _ReceiverResponse, S extends _SenderRequest>(
    eventType: _EventType,
    eventHandler?: ReceiverHandler<T, S>
  ): void {
    if (this.handlersMap[eventType] && eventHandler) {
      this.handlersMap[eventType].delete(eventHandler);
    }
    if (!eventHandler || this.handlersMap[eventType].size === 0) {
      delete this.handlersMap[eventType];
    }

    if (Object.keys(this.handlersMap).length === 0) {
      this.eventTarget.removeEventListener('message', this.boundEventHandler);
    }
  }
}
