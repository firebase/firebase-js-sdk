/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License
 * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions and limitations under
 * the License.
 */

/* eslint-disable camelcase */

// Describes a Firebase Messaging event on a client. Defined as in
// firebase_messaging/src/proto/messaging_event.proto
export interface FcmEvent {
  project_number: string;
  message_id: string;
  instance_id: string;
  message_type: string;
  sdk_platform: string;
  package_name: string;
  collapse_key: string;
  event: string;
  analytics_label?: string;
}

/**
 * A LogRequest represents a batched collection of loggable events sent to firelog, each event to be
 * processed and sent to Sawmill. Defined as in proto/clientanalytics.proto#LogRequest
 */
export interface LogRequest {
  log_source: string;
  log_event: LogEvent[];
}

// A log event used by firelog ingestion server. Defined in
// playlog/proto/clientanalytics.proto#LogEvent
export interface LogEvent {
  // Epoch time in milliseconds, according to the wall clock.
  event_time_ms: string;

  // A stringified json proto version of source_extension.
  source_extension_json_proto3: string;

  // The compliance data associated with this event.
  compliance_data: ComplianceData;
}

export interface ComplianceData {
  privacy_context: ExternalPrivacyContext;
}

export interface ExternalPrivacyContext {
  prequest: ExternalPRequestContext;
}

export interface ExternalPRequestContext {
  origin_associated_product_id: number;
}
/* eslint-enable camelcase */

export interface LogResponse {
  nextRequestWaitMillis: number;
  logResponseDetails: LogResponseDetails[];
}

interface LogResponseDetails {
  responseAction: UserResponse;
}

export const enum UserResponse {
  RESPONSE_ACTION_UNKNOWN = 'RESPONSE_ACTION_UNKNOWN',
  RETRY_REQUEST_LATER = 'RETRY_REQUEST_LATER',
  DELETE_REQUEST = 'DELETE_REQUEST'
}
