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
import {
  describe,
  beforeEach,
  afterEach,
  it,
  expect,
  vi,
  type MockInstance
} from 'vitest';
import {
  getFakeLogEvent,
  getSuccessResponse
} from '../testing/fakes/logging-object';
import { _setDeliveryMetricsExportedToBigQueryEnabled } from '../api/setDeliveryMetricsExportedToBigQueryEnabled';
import { MessagePayloadInternal } from '../interfaces/internal-message-payload';
import {
  LOG_INTERVAL_IN_MS,
  MAX_NUMBER_OF_EVENTS_PER_LOG_REQUEST
} from '../util/constants';
import { MessagingService } from '../messaging-service';
import { getFakeMessagingService } from '../testing/fakes/messaging-service';

const LOG_ENDPOINT = 'https://play.google.com/log?format=json_proto3';

/** Enough fake time for INITIAL_LOG_FLUSH_DELAY_MS (0) timers + fetch microtasks */
const INITIAL_FLUSH_FAKE_TICK_MS = 10;

const FCM_TRANSPORT_KEY = LogModule._mergeStrings(
  'AzSCbw63g1R0nCw85jG8',
  'Iaya3yLKwmgvh7cF0q4'
);

describe('logToFirelog', () => {
  let fetchSpy: MockInstance;
  let messaging: MessagingService;

  beforeEach(() => {
    fetchSpy = vi.spyOn(window, 'fetch');
    messaging = getFakeMessagingService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('_dispatchLogEvents', () => {
    beforeEach(() => {
      messaging.deliveryMetricsExportedToBigQueryEnabled = true;
    });

    it('dispatches queue successfully ', async () => {
      // set up
      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify(getSuccessResponse()))
      );
      messaging.logEvents.push(getFakeLogEvent());

      // call
      await LogModule._dispatchLogEvents(messaging);

      // assert
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith(
        LOG_ENDPOINT.concat('&key=', FCM_TRANSPORT_KEY),
        {
          method: 'POST',
          body: JSON.stringify(LogModule._createLogRequest([getFakeLogEvent()]))
        }
      );
      expect(messaging.logEvents).toEqual([]);
    });

    it('does not lose events enqueued during an in-flight dispatch', async () => {
      vi.useFakeTimers();

      let resolveFetch: ((value: Response) => void) | undefined;
      fetchSpy.mockImplementation(() => {
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
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(messaging.logEvents).toHaveLength(1);

      // The follow-up flush should be scheduled ASAP (0ms).
      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify(getSuccessResponse()))
      );
      await vi.advanceTimersByTimeAsync(INITIAL_FLUSH_FAKE_TICK_MS);

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(messaging.logEvents).toEqual([]);

      vi.useRealTimers();
    });

    it('Retries at most max retries times', async () => {
      vi.useFakeTimers();
      // set up
      fetchSpy.mockRejectedValue(new Error('err'));
      messaging.logEvents.push(getFakeLogEvent());

      // call
      const dispatchPromise = LogModule._dispatchLogEvents(messaging);
      for (let i = 0; i < 3; i++) {
        await vi.advanceTimersByTimeAsync(5000);
      }
      await dispatchPromise;

      //assert
      expect(fetchSpy).toHaveBeenCalledTimes(3);
      expect(messaging.logEvents).toEqual([]);
      vi.useRealTimers();
    });

    it('Retries when retriable(429) status returned ', async () => {
      vi.useFakeTimers();
      // set up
      fetchSpy.mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 429,
          statusText: 'retriable(429) error returned',
          json: () => Promise.reject(new Error('retriable error body'))
        } as unknown as Response)
      );

      messaging.logEvents.push(getFakeLogEvent());

      // call
      const dispatchPromise = LogModule._dispatchLogEvents(messaging);
      for (let i = 0; i < 3; i++) {
        await vi.advanceTimersByTimeAsync(5000);
      }
      await dispatchPromise;

      //assert
      expect(fetchSpy).toHaveBeenCalledTimes(3);
      expect(messaging.logEvents).toEqual([]);
      vi.useRealTimers();
    });

    it('Do not retry when non-retriable(405) status returned ', async () => {
      // set up
      fetchSpy.mockResolvedValue(
        new Response(
          /** body= */ new Blob(),
          /** init= */ {
            status: 405,
            statusText: 'non-retriable(405) status returned'
          }
        )
      );

      messaging.logEvents.push(getFakeLogEvent());

      // call
      await LogModule._dispatchLogEvents(messaging);

      //assert
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(messaging.logEvents).toEqual([]);
    });

    it('Rejects 1st request, Passes 2nd request', async () => {
      vi.useFakeTimers();
      // set up
      fetchSpy
        .mockRejectedValueOnce(new Error('reject 1st time. 2 retry remain'))
        .mockResolvedValueOnce(
          new Response(JSON.stringify(getSuccessResponse()))
        );
      messaging.logEvents.push(getFakeLogEvent());

      // call
      const dispatchPromise = LogModule._dispatchLogEvents(messaging);
      await vi.advanceTimersByTimeAsync(10000);
      await dispatchPromise;

      //assert
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(messaging.logEvents).toEqual([]);
      vi.useRealTimers();
    });

    it('Slices logEvents based on max events per request', async () => {
      // set up
      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify(getSuccessResponse()))
      );
      for (let i = 0; i < MAX_NUMBER_OF_EVENTS_PER_LOG_REQUEST * 3; i++) {
        messaging.logEvents.push(getFakeLogEvent());
      }

      // call
      await LogModule._dispatchLogEvents(messaging);

      //assert
      expect(fetchSpy).toHaveBeenCalledTimes(3);
      expect(messaging.logEvents).toEqual([]);
    });

    it('Empty queue', async () => {
      // set up
      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify(getSuccessResponse()))
      );
      messaging.logEvents = [];

      // call
      await LogModule._dispatchLogEvents(messaging);

      //assert
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(messaging.logEvents).toEqual([]);
    });
  });

  describe('_processQueue', () => {
    it('clears log events if no user logging permission', () => {
      // set up
      messaging = getFakeMessagingService();
      messaging.logEvents.push(getFakeLogEvent());
      messaging.deliveryMetricsExportedToBigQueryEnabled = false;

      // call
      LogModule._processQueue(messaging, /** offsetInMs= */ 100);

      // assert
      expect(messaging.logEvents.length).toBe(0);
      expect(messaging.logQueue.state).toBe('stopped');
    });

    it('sends log events if user logging permission is granted', async () => {
      // set up
      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify(getSuccessResponse()))
      );
      messaging = getFakeMessagingService();
      messaging.logEvents.push(getFakeLogEvent());
      messaging.deliveryMetricsExportedToBigQueryEnabled = true;

      // call
      LogModule._processQueue(messaging, /** offsetInMs= */ 100);

      // assert
      await new Promise<void>(resolve => setTimeout(resolve, 200));
      expect(messaging.logEvents.length).toBe(0);
    });
  });

  describe('startLoggingService', () => {
    it('does not start when the queue is empty (avoids idle timer blocking later stageLog)', async () => {
      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify(getSuccessResponse()))
      );
      messaging.deliveryMetricsExportedToBigQueryEnabled = true;
      messaging.logEvents = [];

      LogModule.startLoggingService(messaging);

      await new Promise<void>(resolve => setTimeout(resolve, 50));
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(messaging.logQueue.state).toBe('stopped');
    });

    it('dispatches first queued batch promptly', async () => {
      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify(getSuccessResponse()))
      );
      messaging.deliveryMetricsExportedToBigQueryEnabled = true;
      messaging.logEvents.push(getFakeLogEvent());

      LogModule.startLoggingService(messaging);

      await new Promise<void>(resolve => setTimeout(resolve, 50));
      expect(fetchSpy).toHaveBeenCalled();
      expect(messaging.logEvents).toEqual([]);
    });

    it('after first flush, waits LOG_INTERVAL_IN_MS before next dispatch', async () => {
      vi.useFakeTimers();
      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify(getSuccessResponse()))
      );
      messaging.deliveryMetricsExportedToBigQueryEnabled = true;
      messaging.logEvents.push(getFakeLogEvent());

      LogModule.startLoggingService(messaging);
      await vi.advanceTimersByTimeAsync(INITIAL_FLUSH_FAKE_TICK_MS);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      messaging.logEvents.push(getFakeLogEvent());
      await vi.advanceTimersByTimeAsync(LOG_INTERVAL_IN_MS);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(messaging.logEvents).toEqual([]);

      vi.useRealTimers();
    });
  });

  describe('stageLog', () => {
    it('starts logging service so first delivery metrics flush promptly', async () => {
      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify(getSuccessResponse()))
      );
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
      expect(fetchSpy).toHaveBeenCalled();
      expect(messaging.logEvents).toEqual([]);
    });
  });

  describe('_setDeliveryMetricsExportedToBigQueryEnabled integration', () => {
    it('starts logging service when enabling export', async () => {
      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify(getSuccessResponse()))
      );
      messaging.logEvents.push(getFakeLogEvent());

      _setDeliveryMetricsExportedToBigQueryEnabled(messaging, true);

      await new Promise<void>(resolve => setTimeout(resolve, 50));
      expect(fetchSpy).toHaveBeenCalled();
      expect(messaging.logEvents).toEqual([]);
      expect(messaging.deliveryMetricsExportedToBigQueryEnabled).toBe(true);
    });

    it('clears queued events immediately when disabling export without waiting LOG_INTERVAL_IN_MS', async () => {
      vi.useFakeTimers();
      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify(getSuccessResponse()))
      );
      messaging.deliveryMetricsExportedToBigQueryEnabled = true;
      messaging.logEvents.push(getFakeLogEvent());

      LogModule.startLoggingService(messaging);
      await vi.advanceTimersByTimeAsync(INITIAL_FLUSH_FAKE_TICK_MS);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(messaging.logEvents).toEqual([]);

      messaging.logEvents.push(getFakeLogEvent());
      _setDeliveryMetricsExportedToBigQueryEnabled(messaging, false);

      expect(messaging.logEvents).toEqual([]);
      expect(messaging.logQueue.state).toBe('stopped');

      await vi.advanceTimersByTimeAsync(LOG_INTERVAL_IN_MS);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    it('does not arm idle polling when enabling export with an empty queue; stageLog still flushes', async () => {
      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify(getSuccessResponse()))
      );
      messaging.logEvents = [];
      messaging.deliveryMetricsExportedToBigQueryEnabled = false;

      _setDeliveryMetricsExportedToBigQueryEnabled(messaging, true);

      await new Promise<void>(resolve => setTimeout(resolve, 50));
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(messaging.logQueue.state).toBe('stopped');

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
      expect(fetchSpy).toHaveBeenCalled();
      expect(messaging.logEvents).toEqual([]);
    });
  });
});
