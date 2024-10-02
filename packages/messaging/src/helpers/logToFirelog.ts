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
  DEFAULT_BACKOFF_TIME_MS,
  EVENT_MESSAGE_DELIVERED,
  FCM_LOG_SOURCE,
  LOG_INTERVAL_IN_MS,
  MAX_NUMBER_OF_EVENTS_PER_LOG_REQUEST,
  MAX_RETRIES,
  MessageType,
  SDK_PLATFORM_WEB
} from '../util/constants';
import {
  FcmEvent,
  LogEvent,
  LogRequest,
  LogResponse,
  ComplianceData
} from '../interfaces/logging-types';

import { MessagePayloadInternal } from '../interfaces/internal-message-payload';
import { MessagingService } from '../messaging-service';

const LOG_ENDPOINT = 'https://play.google.com/log?format=json_proto3';

const FCM_TRANSPORT_KEY = _mergeStrings(
  'AzSCbw63g1R0nCw85jG8',
  'Iaya3yLKwmgvh7cF0q4'
);

export function startLoggingService(messaging: MessagingService): void {
  if (!messaging.isLogServiceStarted) {
    _processQueue(messaging, LOG_INTERVAL_IN_MS);
    messaging.isLogServiceStarted = true;
  }
}

/**
 *
 * @param messaging the messaging instance.
 * @param offsetInMs this method execute after `offsetInMs` elapsed .
 */
export function _processQueue(
  messaging: MessagingService,
  offsetInMs: number
): void {
  setTimeout(async () => {
    if (!messaging.deliveryMetricsExportedToBigQueryEnabled) {
      // flush events and terminate logging service
      messaging.logEvents = [];
      messaging.isLogServiceStarted = false;

      return;
    }

    if (!messaging.logEvents.length) {
      return _processQueue(messaging, LOG_INTERVAL_IN_MS);
    }

    await _dispatchLogEvents(messaging);
  }, offsetInMs);
}

export async function _dispatchLogEvents(
  messaging: MessagingService
): Promise<void> {
  for (
    let i = 0, n = messaging.logEvents.length;
    i < n;
    i += MAX_NUMBER_OF_EVENTS_PER_LOG_REQUEST
  ) {
    const logRequest = _createLogRequest(
      messaging.logEvents.slice(i, i + MAX_NUMBER_OF_EVENTS_PER_LOG_REQUEST)
    );

    let retryCount = 0,
      response = {} as Response;

    do {
      try {
        response = await fetch(
          LOG_ENDPOINT.concat('&key=', FCM_TRANSPORT_KEY),
          {
            method: 'POST',
            body: JSON.stringify(logRequest)
          }
        );

        // don't retry on 200s or non retriable errors
        if (response.ok || (!response.ok && !isRetriableError(response))) {
          break;
        }

        if (!response.ok && isRetriableError(response)) {
          // rethrow to retry with quota
          throw new Error(
            'a retriable Non-200 code is returned in fetch to Firelog endpoint. Retry'
          );
        }
      } catch (error) {
        const isLastAttempt = retryCount === MAX_RETRIES;
        if (isLastAttempt) {
          // existing the do-while interactive retry logic because retry quota has reached.
          break;
        }
      }

      let delayInMs: number;
      try {
        delayInMs = Number(
          ((await response.json()) as LogResponse).nextRequestWaitMillis
        );
      } catch (e) {
        delayInMs = DEFAULT_BACKOFF_TIME_MS;
      }

      await new Promise(resolve => setTimeout(resolve, delayInMs));

      retryCount++;
    } while (retryCount < MAX_RETRIES);
  }

  messaging.logEvents = [];
  // schedule for next logging
  _processQueue(messaging, LOG_INTERVAL_IN_MS);
}

function isRetriableError(response: Response): boolean {
  const httpStatus = response.status;

  return (
    httpStatus === 429 ||
    httpStatus === 500 ||
    httpStatus === 503 ||
    httpStatus === 504
  );
}

export async function stageLog(
  messaging: MessagingService,
  internalPayload: MessagePayloadInternal
): Promise<void> {
  const fcmEvent = createFcmEvent(
    internalPayload,
    await messaging.firebaseDependencies.installations.getId()
  );

  createAndEnqueueLogEvent(messaging, fcmEvent, internalPayload.productId);
}

function createFcmEvent(
  internalPayload: MessagePayloadInternal,
  fid: string
): FcmEvent {
  const fcmEvent = {} as FcmEvent;

  /* eslint-disable camelcase */
  // some fields should always be non-null. Still check to ensure.
  if (!!internalPayload.from) {
    fcmEvent.project_number = internalPayload.from;
  }

  if (!!internalPayload.fcmMessageId) {
    fcmEvent.message_id = internalPayload.fcmMessageId;
  }

  fcmEvent.instance_id = fid;

  if (!!internalPayload.notification) {
    fcmEvent.message_type = MessageType.DISPLAY_NOTIFICATION.toString();
  } else {
    fcmEvent.message_type = MessageType.DATA_MESSAGE.toString();
  }

  fcmEvent.sdk_platform = SDK_PLATFORM_WEB.toString();
  fcmEvent.package_name = self.origin.replace(/(^\w+:|^)\/\//, '');

  if (!!internalPayload.collapse_key) {
    fcmEvent.collapse_key = internalPayload.collapse_key;
  }

  fcmEvent.event = EVENT_MESSAGE_DELIVERED.toString();

  if (!!internalPayload.fcmOptions?.analytics_label) {
    fcmEvent.analytics_label = internalPayload.fcmOptions?.analytics_label;
  }

  /* eslint-enable camelcase */
  return fcmEvent;
}

function createAndEnqueueLogEvent(
  messaging: MessagingService,
  fcmEvent: FcmEvent,
  productId: number
): void {
  const logEvent = {} as LogEvent;

  /* eslint-disable camelcase */
  logEvent.event_time_ms = Math.floor(Date.now()).toString();
  logEvent.source_extension_json_proto3 = JSON.stringify({
    messaging_client_event: fcmEvent
  });

  if (!!productId) {
    logEvent.compliance_data = buildComplianceData(productId);
  }
  // eslint-disable-next-line camelcase

  messaging.logEvents.push(logEvent);
}

function buildComplianceData(productId: number): ComplianceData {
  const complianceData: ComplianceData = {
    privacy_context: {
      prequest: {
        origin_associated_product_id: productId
      }
    }
  };

  return complianceData;
}

export function _createLogRequest(logEventQueue: LogEvent[]): LogRequest {
  const logRequest = {} as LogRequest;

  /* eslint-disable camelcase */
  logRequest.log_source = FCM_LOG_SOURCE.toString();
  logRequest.log_event = logEventQueue;
  /* eslint-enable camelcase */

  return logRequest;
}

export function _mergeStrings(s1: string, s2: string): string {
  const resultArray = [];
  for (let i = 0; i < s1.length; i++) {
    resultArray.push(s1.charAt(i));
    if (i < s2.length) {
      resultArray.push(s2.charAt(i));
    }
  }

  return resultArray.join('');
}
