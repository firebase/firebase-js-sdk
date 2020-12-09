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
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import {
  _EventType,
  PingRequest,
  _PingResponse,
  ReceiverMessageEvent,
  SenderMessageEvent,
  _Status
} from '.';
import { FakeServiceWorker } from '../../../test/helpers/fake_service_worker';
import { Receiver } from './receiver';

use(sinonChai);

describe('platform_browser/messagechannel/receiver', () => {
  let receiver: Receiver;
  let serviceWorker: ServiceWorker;
  let messageChannel: MessageChannel;

  beforeEach(() => {
    serviceWorker = (new FakeServiceWorker() as unknown) as ServiceWorker;
    receiver = Receiver._getInstance(serviceWorker);
    messageChannel = new MessageChannel();
  });

  describe('_getInstance', () => {
    it('should memoize the instances', () => {
      expect(Receiver._getInstance(serviceWorker)).to.eq(receiver);
    });
  });

  describe('_subscribe', () => {
    it('should not respond to events that arent subscribed to', () => {
      messageChannel.port1.onmessage = sinon.spy();
      serviceWorker.postMessage(
        {
          eventType: _EventType.PING,
          eventId: '12345',
          data: {}
        } as SenderMessageEvent<PingRequest>,
        [messageChannel.port2]
      );
      expect(messageChannel.port1.onmessage).to.not.have.been.called;
    });

    it('should return the handlers response to the caller', done => {
      const response = [_EventType.KEY_CHANGED];
      let ackReceived = false;
      receiver._subscribe<_PingResponse, PingRequest>(
        _EventType.PING,
        (_origin: string, data: PingRequest) => {
          expect(data).to.eql({});
          return response;
        }
      );
      messageChannel.port1.onmessage = (event: Event) => {
        const messageEvent = event as MessageEvent<
          ReceiverMessageEvent<_PingResponse>
        >;
        if (!ackReceived) {
          expect(messageEvent.data.eventId).to.eq('12345');
          expect(messageEvent.data.eventType).to.eq(_EventType.PING);
          expect(messageEvent.data.status).to.eq(_Status.ACK);
          ackReceived = true;
        } else {
          expect(messageEvent.data.eventId).to.eq('12345');
          expect(messageEvent.data.eventType).to.eq(_EventType.PING);
          expect(messageEvent.data.status).to.eq(_Status.DONE);
          expect(messageEvent.data.response).to.have.deep.members([
            {
              fulfilled: true,
              value: response
            }
          ]);
          expect(ackReceived).to.be.true;
          done();
        }
      };
      serviceWorker.postMessage(
        {
          eventType: _EventType.PING,
          eventId: '12345',
          data: {}
        } as SenderMessageEvent<PingRequest>,
        [messageChannel.port2]
      );
    });

    it('should handle multiple subscribers, even if one fails', done => {
      const response = [_EventType.KEY_CHANGED];
      let ackReceived = false;
      receiver._subscribe(
        _EventType.PING,
        (_origin: string, data: PingRequest) => {
          expect(data).to.eql({});
          return response;
        }
      );
      receiver._subscribe(
        _EventType.PING,
        (_origin: string, _data: PingRequest) => Promise.reject('fail')
      );
      messageChannel.port1.onmessage = (event: Event) => {
        const messageEvent = event as MessageEvent<
          ReceiverMessageEvent<_PingResponse>
        >;
        if (!ackReceived) {
          expect(messageEvent.data.eventId).to.eq('12345');
          expect(messageEvent.data.eventType).to.eq(_EventType.PING);
          expect(messageEvent.data.status).to.eq(_Status.ACK);
          ackReceived = true;
        } else {
          expect(messageEvent.data.eventId).to.eq('12345');
          expect(messageEvent.data.eventType).to.eq(_EventType.PING);
          expect(messageEvent.data.status).to.eq(_Status.DONE);
          expect(messageEvent.data.response).to.have.deep.members([
            {
              fulfilled: true,
              value: response
            },
            {
              fulfilled: false,
              reason: 'fail'
            }
          ]);
          done();
        }
      };
      serviceWorker.postMessage(
        {
          eventType: _EventType.PING,
          eventId: '12345',
          data: {}
        } as SenderMessageEvent<PingRequest>,
        [messageChannel.port2]
      );
    });
  });

  describe('_unsubscribe', () => {
    it('should remove the handlers', () => {
      messageChannel.port1.onmessage = sinon.spy();
      const handler = (_origin: string, _data: PingRequest): _EventType[] => {
        return [_EventType.KEY_CHANGED];
      };
      receiver._subscribe(_EventType.PING, handler);
      receiver._unsubscribe(_EventType.PING, handler);
      serviceWorker.postMessage(
        {
          eventType: _EventType.PING,
          eventId: '12345',
          data: {}
        } as SenderMessageEvent<PingRequest>,
        [messageChannel.port2]
      );
      expect(messageChannel.port1.onmessage).to.not.have.been.called;
    });
  });
});
