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

import { expect, use } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import {
  EventType,
  MessageError,
  PingRequest,
  PingResponse,
  ReceiverMessageEvent,
  SenderMessageEvent,
  Status
} from '.';
import { delay } from '../../../test/helpers/delay';
import { FakeServiceWorker } from '../../../test/helpers/fake_service_worker';
import { stubTimeouts, TimerMap } from '../../../test/helpers/timeout_stub';
import { Sender, TimeoutDuration } from './sender';

use(sinonChai);
use(chaiAsPromised);

describe('platform_browser/messagechannel/sender', () => {
  describe('_send', () => {
    let sender: Sender;
    let serviceWorker: ServiceWorker;
    let pendingTimeouts: TimerMap;

    beforeEach(() => {
      serviceWorker = (new FakeServiceWorker() as unknown) as ServiceWorker;
      sender = new Sender(serviceWorker);
      pendingTimeouts = stubTimeouts();
      sinon.stub(window, 'clearTimeout');
    });

    afterEach(() => {
      sinon.restore();
    });

    it('should send an event and wait for a response', async () => {
      const response = [
        {
          fulfilled: true,
          value: [EventType.KEY_CHANGED]
        }
      ];
      serviceWorker.addEventListener('message', (event: Event) => {
        const messageEvent = event as MessageEvent<
          SenderMessageEvent<PingRequest>
        >;
        messageEvent.ports[0].postMessage({
          status: Status.ACK,
          eventId: messageEvent.data.eventId,
          eventType: messageEvent.data.eventType,
          response: null
        } as ReceiverMessageEvent<PingResponse>);
        messageEvent.ports[0].postMessage({
          status: Status.DONE,
          eventId: messageEvent.data.eventId,
          eventType: messageEvent.data.eventType,
          response
        } as ReceiverMessageEvent<PingResponse>);
      });
      const result = await sender._send<PingResponse, PingRequest>(
        EventType.PING,
        {},
        TimeoutDuration.ACK
      );
      expect(result).to.have.deep.members(response);
    });

    it('should timeout if it doesnt see an ACK', async () => {
      serviceWorker.addEventListener('message', (_event: Event) => {
        delay(() => {
          pendingTimeouts[TimeoutDuration.ACK]();
        });
      });
      await expect(
        sender._send<PingResponse, PingRequest>(
          EventType.PING,
          {},
          TimeoutDuration.ACK
        )
      ).to.be.rejectedWith(Error, MessageError.UNSUPPORTED_EVENT);
    });

    it('should work with a long ACK', async () => {
      const response = [
        {
          fulfilled: true,
          value: [EventType.KEY_CHANGED]
        }
      ];
      serviceWorker.addEventListener('message', (event: Event) => {
        delay(() => {
          pendingTimeouts[TimeoutDuration.ACK]();
        });
        const messageEvent = event as MessageEvent<
          SenderMessageEvent<PingRequest>
        >;
        messageEvent.ports[0].postMessage({
          status: Status.ACK,
          eventId: messageEvent.data.eventId,
          eventType: messageEvent.data.eventType,
          response: null
        } as ReceiverMessageEvent<PingResponse>);
        messageEvent.ports[0].postMessage({
          status: Status.DONE,
          eventId: messageEvent.data.eventId,
          eventType: messageEvent.data.eventType,
          response
        } as ReceiverMessageEvent<PingResponse>);
      });
      const result = await sender._send<PingResponse, PingRequest>(
        EventType.PING,
        {},
        TimeoutDuration.LONG_ACK
      );
      expect(result).to.have.deep.members(response);
    });

    it('it should timeout if it gets an ACK but not a DONE', async () => {
      serviceWorker.addEventListener('message', (event: Event) => {
        const messageEvent = event as MessageEvent<
          SenderMessageEvent<PingRequest>
        >;
        messageEvent.ports[0].postMessage({
          status: Status.ACK,
          eventId: messageEvent.data.eventId,
          eventType: messageEvent.data.eventType,
          response: null
        } as ReceiverMessageEvent<PingResponse>);
        delay(() => {
          pendingTimeouts[TimeoutDuration.COMPLETION]();
        });
      });
      await expect(
        sender._send<PingResponse, PingRequest>(
          EventType.PING,
          {},
          TimeoutDuration.ACK
        )
      ).to.be.rejectedWith(Error, MessageError.TIMEOUT);
    });
  });
});
