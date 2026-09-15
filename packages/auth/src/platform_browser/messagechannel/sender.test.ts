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

import {
  _EventType,
  _MessageError,
  PingRequest,
  _PingResponse,
  ReceiverMessageEvent,
  SenderMessageEvent,
  _Status,
  _TimeoutDuration
} from '.';
import { FakeServiceWorker } from '../../../test/helpers/fake_service_worker';
import { stubTimeouts, TimerMap } from '../../../test/helpers/timeout_stub';
import { Sender } from './sender';
const oldSetTimeout = setTimeout;

describe('platform_browser/messagechannel/sender', () => {
  describe('_send', () => {
    let sender: Sender;
    let serviceWorker: ServiceWorker;
    let pendingTimeouts: TimerMap;

    beforeEach(() => {
      serviceWorker = new FakeServiceWorker() as unknown as ServiceWorker;
      sender = new Sender(serviceWorker);
      pendingTimeouts = stubTimeouts();
      vi.spyOn(window, 'clearTimeout');
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should send an event and wait for a response', async () => {
      const response = [
        {
          fulfilled: true,
          value: [_EventType.KEY_CHANGED]
        }
      ];
      serviceWorker.addEventListener('message', (event: Event) => {
        const messageEvent = event as MessageEvent<
          SenderMessageEvent<PingRequest>
        >;
        messageEvent.ports[0].postMessage({
          status: _Status.ACK,
          eventId: messageEvent.data.eventId,
          eventType: messageEvent.data.eventType,
          response: null
        } as ReceiverMessageEvent<_PingResponse>);
        messageEvent.ports[0].postMessage({
          status: _Status.DONE,
          eventId: messageEvent.data.eventId,
          eventType: messageEvent.data.eventType,
          response
        } as ReceiverMessageEvent<_PingResponse>);
      });
      const result = await sender._send<_PingResponse, PingRequest>(
        _EventType.PING,
        {},
        _TimeoutDuration.ACK
      );
      expect(result).to.have.deep.members(response);
    });

    it('should timeout if it doesnt see an ACK', async () => {
      serviceWorker.addEventListener('message', (_event: Event) => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        Promise.resolve().then(() => {
          pendingTimeouts[_TimeoutDuration.ACK]();
        });
      });
      await expect(
        sender._send<_PingResponse, PingRequest>(
          _EventType.PING,
          {},
          _TimeoutDuration.ACK
        )
      ).rejects.toThrow(Error, _MessageError.UNSUPPORTED_EVENT);
    });

    it('should work with a long ACK', async () => {
      const response = [
        {
          fulfilled: true,
          value: [_EventType.KEY_CHANGED]
        }
      ];
      serviceWorker.addEventListener('message', (event: Event) => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        Promise.resolve().then(() => {
          pendingTimeouts[_TimeoutDuration.ACK]?.();
        });
        const messageEvent = event as MessageEvent<
          SenderMessageEvent<PingRequest>
        >;
        messageEvent.ports[0].postMessage({
          status: _Status.ACK,
          eventId: messageEvent.data.eventId,
          eventType: messageEvent.data.eventType,
          response: null
        } as ReceiverMessageEvent<_PingResponse>);
        messageEvent.ports[0].postMessage({
          status: _Status.DONE,
          eventId: messageEvent.data.eventId,
          eventType: messageEvent.data.eventType,
          response
        } as ReceiverMessageEvent<_PingResponse>);
      });
      const result = await sender._send<_PingResponse, PingRequest>(
        _EventType.PING,
        {},
        _TimeoutDuration.LONG_ACK
      );
      expect(result).to.have.deep.members(response);
    });

    it('it should timeout if it gets an ACK but not a DONE', async () => {
      serviceWorker.addEventListener('message', (event: Event) => {
        oldSetTimeout(() => {
          pendingTimeouts[_TimeoutDuration.COMPLETION]();
        }, 5);
        const messageEvent = event as MessageEvent<
          SenderMessageEvent<PingRequest>
        >;
        messageEvent.ports[0].postMessage({
          status: _Status.ACK,
          eventId: messageEvent.data.eventId,
          eventType: messageEvent.data.eventType,
          response: null
        } as ReceiverMessageEvent<_PingResponse>);
      });
      await expect(
        sender._send<_PingResponse, PingRequest>(
          _EventType.PING,
          {},
          _TimeoutDuration.ACK
        )
      ).rejects.toThrow(Error, _MessageError.TIMEOUT);
    });
  });
});
