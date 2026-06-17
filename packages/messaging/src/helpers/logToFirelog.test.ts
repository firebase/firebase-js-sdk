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

import * as LogModule from './logToFirelog';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';

import { expect, use } from 'chai';
import {
  getFakeLogEvent,
  getSuccessResponse
} from '../testing/fakes/logging-object';
import { restore, stub, useFakeTimers } from 'sinon';

import { _setDeliveryMetricsExportedToBigQueryEnabled } from '../api/setDeliveryMetricsExportedToBigQueryEnabled';
import { MessagePayloadInternal } from '../interfaces/internal-message-payload';
import {
  LOG_INTERVAL_IN_MS,
  MAX_NUMBER_OF_EVENTS_PER_LOG_REQUEST
} from '../util/constants';
import { MessagingService } from '../messaging-service';
import { Stub } from '../testing/sinon-types';
import { getFakeMessagingService } from '../testing/fakes/messaging-service';

const LOG_ENDPOINT = 'https://play.google.com/log?format=json_proto3';

/** Enough fake time for INITIAL_LOG_FLUSH_DELAY_MS (0) timers + fetch microtasks */
const INITIAL_FLUSH_FAKE_TICK_MS = 10;

const FCM_TRANSPORT_KEY = LogModule._mergeStrings(
  'AzSCbw63g1R0nCw85jG8',
  'Iaya3yLKwmgvh7cF0q4'
);

use(chaiAsPromised);
use(sinonChai);

describe('logToFirelog', () => {
  let fetchStub: Stub<typeof fetch>;
  let messaging: MessagingService;

  beforeEach(() => {
    fetchStub = stub(window, 'fetch');
    messaging = getFakeMessagingService();
  });

  afterEach(async () => {
    restore();
  });

  describe('_dispatchLogEvents', () => {
    beforeEach(() => {
      messaging.deliveryMetricsExportedToBigQueryEnabled = true;
    });

    it('dispatches queue successfully ', async () => {
      // set up
      fetchStub.resolves(new Response(JSON.stringify(getSuccessResponse())));
      messaging.logEvents.push(getFakeLogEvent());

      // call
      await LogModule._dispatchLogEvents(messaging);

      // assert
      expect(fetchStub).to.be.calledOnceWith(
        LOG_ENDPOINT.concat('&key=', FCM_TRANSPORT_KEY),
        {
          method: 'POST',
          body: JSON.stringify(LogModule._createLogRequest([getFakeLogEvent()]))
        }
      );
      expect(messaging.logEvents).to.be.empty;
    });

    it('does not lose events enqueued during an in-flight dispatch', async () => {
      const clock = useFakeTimers();

      let resolveFetch: ((value: Response) => void) | undefined;
      fetchStub.callsFake(() => {
        return new Promise<Response>(resolve => {
          resolveFetch = resolve;
        });
      });

      const initialEvent = getFakeLogEvent();
      const lateEvent = getFakeLogEvent();
      messaging.logEvents.push(initialEvent);

      const dispatchPromise = LogModule._dispatchLogEvents(messaging);

      // Enqueue while dispatch is in-flight.
      messaging.logEvents.push(lateEvent);

      resolveFetch?.(new Response(JSON.stringify(getSuccessResponse())));
      await dispatchPromise;

      // First request drains only the swapped queue; the late event remains queued.
      expect(fetchStub).to.have.been.calledOnce;
      expect(messaging.logEvents).to.have.length(1);

      // The follow-up flush should be scheduled ASAP (0ms).
      fetchStub.resolves(new Response(JSON.stringify(getSuccessResponse())));
      await clock.tickAsync(INITIAL_FLUSH_FAKE_TICK_MS);

      expect(fetchStub).to.have.been.calledTwice;
      expect(messaging.logEvents).to.be.empty;

      clock.restore();
    });

    it('Retries at most max retries times', async () => {
      // set up
      fetchStub.rejects(new Error('err'));
      messaging.logEvents.push(getFakeLogEvent());

      // call
      await LogModule._dispatchLogEvents(messaging);

      //assert
      expect(fetchStub).to.be.calledThrice;
      expect(messaging.logEvents).to.be.empty;
    });

    it('Retries when retriable(429) status returned ', async () => {
      // set up
      fetchStub.resolves(
        new Response(
          /** body= */ new Blob(),
          /** init= */ {
            'status': 429,
            'statusText': 'retriable(429) error returned'
          }
        )
      );

      messaging.logEvents.push(getFakeLogEvent());

      // call
      await LogModule._dispatchLogEvents(messaging);

      //assert
      expect(fetchStub).to.be.calledThrice;
      expect(messaging.logEvents).to.be.empty;
    });

    it('Do not retry when non-retriable(405) status returned ', async () => {
      // set up
      fetchStub.resolves(
        new Response(
          /** body= */ new Blob(),
          /** init= */ {
            'status': 405,
            'statusText': 'non-retriable(405) status returned'
          }
        )
      );

      messaging.logEvents.push(getFakeLogEvent());

      // call
      await LogModule._dispatchLogEvents(messaging);

      //assert
      expect(fetchStub).to.be.calledOnce;
      expect(messaging.logEvents).to.be.empty;
    });

    it('Rejects 1st request, Passes 2nd request', async () => {
      // set up
      fetchStub
        .onFirstCall()
        .rejects(new Error('reject 1st time. 2 retry remain'))
        .onSecondCall()
        .resolves(new Response(JSON.stringify(getSuccessResponse())));
      messaging.logEvents.push(getFakeLogEvent());

      // call
      await LogModule._dispatchLogEvents(messaging);

      //assert
      expect(fetchStub).to.be.calledTwice;
      expect(messaging.logEvents).to.be.empty;
    });

    it('Slices logEvents based on max events per request', async () => {
      // set up
      fetchStub.resolves(new Response(JSON.stringify(getSuccessResponse())));
      for (let i = 0; i < MAX_NUMBER_OF_EVENTS_PER_LOG_REQUEST * 3; i++) {
        messaging.logEvents.push(getFakeLogEvent());
      }

      // call
      await LogModule._dispatchLogEvents(messaging);

      //assert
      expect(fetchStub).to.be.calledThrice;
      expect(messaging.logEvents).to.be.empty;
    });

    it('Empty queue', async () => {
      // set up
      fetchStub.resolves(new Response(JSON.stringify(getSuccessResponse())));
      messaging.logEvents = [];

      // call
      await LogModule._dispatchLogEvents(messaging);

      //assert
      expect(fetchStub).to.not.have.been.called;
      expect(messaging.logEvents).to.be.empty;
    });
  });

  describe('_processQueue', () => {
    it('clears log events if no user logging permission', done => {
      // set up
      messaging = getFakeMessagingService();
      messaging.logEvents.push(getFakeLogEvent());
      messaging.deliveryMetricsExportedToBigQueryEnabled = false;

      // call
      LogModule._processQueue(messaging, /** offsetInMs= */ 100);

      // assert
      setTimeout(() => {
        expect(messaging.logEvents.length).to.equal(0);
        expect(messaging.logQueue.state).to.equal('stopped');
        done();
      }, 1000);
    });

    it('sends log events if user logging permission is granted', done => {
      // set up
      fetchStub.resolves(new Response(JSON.stringify(getSuccessResponse())));
      messaging = getFakeMessagingService();
      messaging.logEvents.push(getFakeLogEvent());
      messaging.deliveryMetricsExportedToBigQueryEnabled = true;

      // call
      LogModule._processQueue(messaging, /** offsetInMs= */ 100);

      // assert
      setTimeout(() => {
        expect(messaging.logEvents.length).to.equal(0);
        done();
      }, 1000);
    });
  });

  describe('startLoggingService', () => {
    it('does not start when the queue is empty (avoids idle timer blocking later stageLog)', async () => {
      fetchStub.resolves(new Response(JSON.stringify(getSuccessResponse())));
      messaging.deliveryMetricsExportedToBigQueryEnabled = true;
      messaging.logEvents = [];

      LogModule.startLoggingService(messaging);

      await new Promise<void>(resolve => setTimeout(resolve, 50));
      expect(fetchStub).to.not.have.been.called;
      expect(messaging.logQueue.state).to.equal('stopped');
    });

    it('dispatches first queued batch promptly', async () => {
      fetchStub.resolves(new Response(JSON.stringify(getSuccessResponse())));
      messaging.deliveryMetricsExportedToBigQueryEnabled = true;
      messaging.logEvents.push(getFakeLogEvent());

      LogModule.startLoggingService(messaging);

      await new Promise<void>(resolve => setTimeout(resolve, 50));
      expect(fetchStub).to.have.been.called;
      expect(messaging.logEvents).to.be.empty;
    });

    it('after first flush, waits LOG_INTERVAL_IN_MS before next dispatch', async () => {
      const clock = useFakeTimers();
      fetchStub.resolves(new Response(JSON.stringify(getSuccessResponse())));
      messaging.deliveryMetricsExportedToBigQueryEnabled = true;
      messaging.logEvents.push(getFakeLogEvent());

      LogModule.startLoggingService(messaging);
      await clock.tickAsync(INITIAL_FLUSH_FAKE_TICK_MS);
      expect(fetchStub).to.have.been.calledOnce;

      messaging.logEvents.push(getFakeLogEvent());
      await clock.tickAsync(LOG_INTERVAL_IN_MS);
      expect(fetchStub).to.have.been.calledTwice;
      expect(messaging.logEvents).to.be.empty;

      clock.restore();
    });
  });

  describe('stageLog', () => {
    it('starts logging service so first delivery metrics flush promptly', async () => {
      fetchStub.resolves(new Response(JSON.stringify(getSuccessResponse())));
      messaging.deliveryMetricsExportedToBigQueryEnabled = true;

      const internalPayload: MessagePayloadInternal = {
        from: '1234567890',
        fcmMessageId: 'mid',
        productId: 0,
        notification: { title: 't' },
        /* eslint-disable camelcase */
        collapse_key: ''
        /* eslint-enable camelcase */
      };

      await LogModule.stageLog(messaging, internalPayload);

      await new Promise<void>(resolve => setTimeout(resolve, 50));
      expect(fetchStub).to.have.been.called;
      expect(messaging.logEvents).to.be.empty;
    });
  });

  describe('_setDeliveryMetricsExportedToBigQueryEnabled integration', () => {
    it('starts logging service when enabling export', async () => {
      fetchStub.resolves(new Response(JSON.stringify(getSuccessResponse())));
      messaging.logEvents.push(getFakeLogEvent());

      _setDeliveryMetricsExportedToBigQueryEnabled(messaging, true);

      await new Promise<void>(resolve => setTimeout(resolve, 50));
      expect(fetchStub).to.have.been.called;
      expect(messaging.logEvents).to.be.empty;
      expect(messaging.deliveryMetricsExportedToBigQueryEnabled).to.be.true;
    });

    it('clears queued events immediately when disabling export without waiting LOG_INTERVAL_IN_MS', async () => {
      const clock = useFakeTimers();
      fetchStub.resolves(new Response(JSON.stringify(getSuccessResponse())));
      messaging.deliveryMetricsExportedToBigQueryEnabled = true;
      messaging.logEvents.push(getFakeLogEvent());

      LogModule.startLoggingService(messaging);
      await clock.tickAsync(INITIAL_FLUSH_FAKE_TICK_MS);
      expect(fetchStub).to.have.been.calledOnce;
      expect(messaging.logEvents).to.be.empty;

      messaging.logEvents.push(getFakeLogEvent());
      _setDeliveryMetricsExportedToBigQueryEnabled(messaging, false);

      expect(messaging.logEvents).to.be.empty;
      expect(messaging.logQueue.state).to.equal('stopped');

      await clock.tickAsync(LOG_INTERVAL_IN_MS);
      expect(fetchStub).to.have.been.calledOnce;

      clock.restore();
    });

    it('does not arm idle polling when enabling export with an empty queue; stageLog still flushes', async () => {
      fetchStub.resolves(new Response(JSON.stringify(getSuccessResponse())));
      messaging.logEvents = [];
      messaging.deliveryMetricsExportedToBigQueryEnabled = false;

      _setDeliveryMetricsExportedToBigQueryEnabled(messaging, true);

      await new Promise<void>(resolve => setTimeout(resolve, 50));
      expect(fetchStub).to.not.have.been.called;
      expect(messaging.logQueue.state).to.equal('stopped');

      const internalPayload: MessagePayloadInternal = {
        from: '1234567890',
        fcmMessageId: 'mid',
        productId: 0,
        notification: { title: 't' },
        /* eslint-disable camelcase */
        collapse_key: ''
        /* eslint-enable camelcase */
      };

      await LogModule.stageLog(messaging, internalPayload);

      await new Promise<void>(resolve => setTimeout(resolve, 50));
      expect(fetchStub).to.have.been.called;
      expect(messaging.logEvents).to.be.empty;
    });
  });
});
