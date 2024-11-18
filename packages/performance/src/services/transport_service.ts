/**
 * @license
 * Copyright 2020 Google LLC
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

import { SettingsService } from './settings_service';
import { ERROR_FACTORY, ErrorCode } from '../utils/errors';

const DEFAULT_SEND_INTERVAL_MS = 10 * 1000;
const INITIAL_SEND_TIME_DELAY_MS = 5.5 * 1000;
const MAX_EVENT_COUNT_PER_REQUEST = 1000;

interface BatchEvent {
  message: string;
  eventTime: number;
}

/* eslint-disable camelcase */
// CC/Fl accepted log format.
interface TransportBatchLogFormat {
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
  source_extension_json_proto3: string;
  event_time_ms: string;
}
/* eslint-enable camelcase */

let queue: BatchEvent[] = [];

let isTransportSetup: boolean = false;

export function setupTransportService(): void {
  if (!isTransportSetup) {
    processQueue(INITIAL_SEND_TIME_DELAY_MS);
    isTransportSetup = true;
  }
}

/**
 * Utilized by testing to clean up message queue and un-initialize transport service.
 */
export function resetTransportService(): void {
  isTransportSetup = false;
  queue = [];
}

function processQueue(timeOffset: number): void {
  setTimeout(() => {
    if (queue.length > 0) {
      dispatchQueueEvents();
    }
    processQueue(DEFAULT_SEND_INTERVAL_MS);
  }, timeOffset);
}

function dispatchQueueEvents(): void {
  // Extract events up to the maximum cap of single logRequest from top of "official queue".
  // The staged events will be used for current logRequest attempt, remaining events will be kept
  // for next attempt.
  const staged = queue.splice(0, MAX_EVENT_COUNT_PER_REQUEST);

  /* eslint-disable camelcase */
  // We will pass the JSON serialized event to the backend.
  const log_event: Log[] = staged.map(evt => ({
    source_extension_json_proto3: evt.message,
    event_time_ms: String(evt.eventTime)
  }));

  const data: TransportBatchLogFormat = {
    request_time_ms: String(Date.now()),
    client_info: {
      client_type: 1, // 1 is JS
      js_client_info: {}
    },
    log_source: SettingsService.getInstance().logSource,
    log_event
  };
  /* eslint-enable camelcase */

  postToFlEndpoint(data);
}

function postToFlEndpoint(data: TransportBatchLogFormat): boolean {
  const flTransportFullUrl =
    SettingsService.getInstance().getFlTransportFullUrl();
  return navigator.sendBeacon(flTransportFullUrl, JSON.stringify(data));
}

function addToQueue(evt: BatchEvent): void {
  if (!evt.eventTime || !evt.message) {
    throw ERROR_FACTORY.create(ErrorCode.INVALID_CC_LOG);
  }
  // Add the new event to the queue.
  queue = [...queue, evt];
}

/** Log handler for cc service to send the performance logs to the server. */
export function transportHandler(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serializer: (...args: any[]) => string
): (...args: unknown[]) => void {
  return (...args) => {
    const message = serializer(...args);
    addToQueue({
      message,
      eventTime: Date.now()
    });
  };
}

/**
 * Force flush the queued events. Useful at page unload time to ensure all
 * events are uploaded.
 */
export function flushQueuedEvents(): void {
  while (queue.length > 0) {
    dispatchQueueEvents();
  }
}
