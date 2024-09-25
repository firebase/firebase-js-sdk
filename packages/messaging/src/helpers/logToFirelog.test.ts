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
import { restore, stub } from 'sinon';

import { MAX_NUMBER_OF_EVENTS_PER_LOG_REQUEST } from '../util/constants';
import { MessagingService } from '../messaging-service';
import { Stub } from '../testing/sinon-types';
import { getFakeMessagingService } from '../testing/fakes/messaging-service';

const LOG_ENDPOINT = 'https://play.google.com/log?format=json_proto3';

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
        expect(messaging.isLogServiceStarted).to.be.false;
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
});
