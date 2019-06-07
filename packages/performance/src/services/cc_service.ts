/**
 * @license
 * Copyright 2019 Google Inc.
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

import { LogHandler, Logger, LogLevel } from '@firebase/logger';
import { SettingsService } from './settings_service';
import { ERROR_FACTORY, ErrorCode } from '../utils/errors';
import { consoleLogger } from '../utils/console_logger';

const DEFAULT_SEND_INTERVAL_MS = 10 * 1000;
const INITIAL_SEND_TIME_DELAY_MS = 5.5 * 1000;
// If end point does not work, the call will be tried for these many times.
const DEFAULT_REMAINING_TRIES = 3;
let remainingTries = DEFAULT_REMAINING_TRIES;

interface BatchEvent {
  message: string;
  eventTime: number;
}

/* eslint-disable camelcase */
// CC accepted log format.
interface CcBatchLogFormat {
  request_time_ms: string;
  client_info: ClientInfo;
  log_source: number;
  log_event: Log[];
}

interface ClientInfo {
  client_type: number;
  js_client_info: {};
}

interface Log {
  source_extension_json: string;
  event_time_ms: string;
}
/* eslint-enable camelcase */

let queue: BatchEvent[] = [];

function processQueue(timeOffset: number): void {
  setTimeout(() => {
    // If there is no remainingTries left, stop retrying.
    if (remainingTries === 0) {
      return;
    }

    // If there are no events to process, wait for DEFAULT_SEND_INTERVAL_MS and try again.
    if (!queue.length) {
      return processQueue(DEFAULT_SEND_INTERVAL_MS);
    }

    // Capture a snapshot of the queue and empty the "official queue".
    const staged = [...queue];
    queue = [];

    /* eslint-disable camelcase */
    // We will pass the JSON serialized event to the backend.
    const log_event = staged.map(evt => ({
      source_extension_json: evt.message,
      event_time_ms: String(evt.eventTime)
    }));

    const data: CcBatchLogFormat = {
      request_time_ms: String(Date.now()),
      client_info: {
        client_type: 1, // 1 is JS
        js_client_info: {}
      },
      log_source: SettingsService.getInstance().logSource,
      log_event
    };
    /* eslint-enable camelcase */

    fetch(SettingsService.getInstance().logEndPointUrl, {
      method: 'POST',
      body: JSON.stringify(data)
    })
      .then(res => {
        if (!res.ok) {
          consoleLogger.info('Call to Firebase backend failed.');
        }
        return res.json();
      })
      .then(res => {
        const wait = Number(res.next_request_wait_millis);

        // Find the next call wait time from the response.
        const requestOffset = isNaN(wait)
          ? DEFAULT_SEND_INTERVAL_MS
          : Math.max(DEFAULT_SEND_INTERVAL_MS, wait);
        remainingTries = DEFAULT_REMAINING_TRIES;
        // Schedule the next process.
        processQueue(requestOffset);
      })
      .catch(() => {
        /**
         * If the request fails for some reason, add the events that were attempted
         * back to the primary queue to retry later.
         */
        queue = [...staged, ...queue];
        remainingTries--;
        consoleLogger.info(`Tries left: ${remainingTries}.`);
        processQueue(DEFAULT_SEND_INTERVAL_MS);
      });
  }, timeOffset);
}

processQueue(INITIAL_SEND_TIME_DELAY_MS);

function addToQueue(evt: BatchEvent): void {
  if (!evt.eventTime || !evt.message) {
    throw ERROR_FACTORY.create(ErrorCode.INVALID_CC_LOG);
  }
  // Add the new event to the queue.
  queue = [...queue, evt];
}

/** Log handler for cc service to send the performance logs to the server. */
export function ccHandler(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serializer: (...args: any[]) => string
): LogHandler {
  // The underscores for loggerInstance and level parameters are added to avoid the
  // noUnusedParameters related error.
  return (_loggerInstance: Logger, _level: LogLevel, ...args) => {
    const message = serializer(...args);
    addToQueue({
      message,
      eventTime: Date.now()
    });
  };
}
