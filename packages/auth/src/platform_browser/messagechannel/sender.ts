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

import { _generateEventId } from '../../core/util/event_id';
import {
  _SenderRequest,
  _EventType,
  ReceiverMessageEvent,
  _MessageError,
  SenderMessageEvent,
  _Status,
  _ReceiverMessageResponse,
  _ReceiverResponse,
  _TimeoutDuration
} from './index';

interface MessageHandler {
  messageChannel: MessageChannel;
  onMessage: EventListenerOrEventListenerObject;
}

/**
 * Interface for sending messages and waiting for a completion response.
 *
 */
export class Sender {
  private readonly handlers = new Set<MessageHandler>();

  constructor(private readonly target: ServiceWorker) {}

  /**
   * Unsubscribe the handler and remove it from our tracking Set.
   *
   * @param handler - The handler to unsubscribe.
   */
  private removeMessageHandler(handler: MessageHandler): void {
    if (handler.messageChannel) {
      handler.messageChannel.port1.removeEventListener(
        'message',
        handler.onMessage
      );
      handler.messageChannel.port1.close();
    }
    this.handlers.delete(handler);
  }

  /**
   * Send a message to the Receiver located at {@link target}.
   *
   * @remarks
   * We'll first wait a bit for an ACK , if we get one we will wait significantly longer until the
   * receiver has had a chance to fully process the event.
   *
   * @param eventType - Type of event to send.
   * @param data - The payload of the event.
   * @param timeout - Timeout for waiting on an ACK from the receiver.
   *
   * @returns An array of settled promises from all the handlers that were listening on the receiver.
   */
  async _send<T extends _ReceiverResponse, S extends _SenderRequest>(
    eventType: _EventType,
    data: S,
    timeout = _TimeoutDuration.ACK
  ): Promise<_ReceiverMessageResponse<T>> {
    const messageChannel =
      typeof MessageChannel !== 'undefined' ? new MessageChannel() : null;
    if (!messageChannel) {
      throw new Error(_MessageError.CONNECTION_UNAVAILABLE);
    }
    // Node timers and browser timers return fundamentally different types.
    // We don't actually care what the value is but TS won't accept unknown and
    // we can't cast properly in both environments.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let completionTimer: any;
    let handler: MessageHandler;
    return new Promise<_ReceiverMessageResponse<T>>((resolve, reject) => {
      const eventId = _generateEventId('', 20);
      messageChannel.port1.start();
      const ackTimer = setTimeout(() => {
        reject(new Error(_MessageError.UNSUPPORTED_EVENT));
      }, timeout);
      handler = {
        messageChannel,
        onMessage(event: Event): void {
          const messageEvent = event as MessageEvent<ReceiverMessageEvent<T>>;
          if (messageEvent.data.eventId !== eventId) {
            return;
          }
          switch (messageEvent.data.status) {
            case _Status.ACK:
              // The receiver should ACK first.
              clearTimeout(ackTimer);
              completionTimer = setTimeout(() => {
                reject(new Error(_MessageError.TIMEOUT));
              }, _TimeoutDuration.COMPLETION);
              break;
            case _Status.DONE:
              // Once the receiver's handlers are finished we will get the results.
              clearTimeout(completionTimer);
              resolve(messageEvent.data.response);
              break;
            default:
              clearTimeout(ackTimer);
              clearTimeout(completionTimer);
              reject(new Error(_MessageError.INVALID_RESPONSE));
              break;
          }
        }
      };
      this.handlers.add(handler);
      messageChannel.port1.addEventListener('message', handler.onMessage);
      this.target.postMessage(
        {
          eventType,
          eventId,
          data
        } as SenderMessageEvent<S>,
        [messageChannel.port2]
      );
    }).finally(() => {
      if (handler) {
        this.removeMessageHandler(handler);
      }
    });
  }
}
