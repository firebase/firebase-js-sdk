/**
 * @license
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Extensions } from '../index';

/**
 * Shape of response from the server.
 * @internal
 */
export interface DataConnectStreamResponse<Data> {
  requestId: string;
  data: Data;
  extensions: Extensions;
  dataEtag: string;
  errors: Error[];
  cancelled: boolean;
}

/**
 * Base interface for stream request payloads sent over the stream to the server.
 * @internal
 */
export interface StreamRequest {
  /** monotonically increasing request ID */
  requestId: string;
  /** connectorResourcePath - only required on initial connection */
  name?: string;
  /** optional headers for this request, for authentication + telemetry */
  headers?: StreamRequestHeaders;
  /** received from server on previous response, included to optimize bandwidth */
  dataEtag?: string;
}

/**
 * Optional headers for a stream request, for authentication + telemetry
 * @internal
 */
export interface StreamRequestHeaders {
  /** used to initially authenticate or re-authenticate user */
  'X-Firebase-Auth-Token'?: string;
  /** used to initially attest app */
  'X-Firebase-App-Check'?: string;
  /** SDK telemetry header */
  'X-Goog-Api-Client'?: string;
  /** firebase appid */
  'x-firebase-gmpid'?: string;
}

/**
 * Fields for an execute request payload.
 * @internal
 */
interface ExecuteRequestKind<Variables> {
  operationName: string;
  variables?: Variables;
}

/**
 * Fields for a subscribe request payload.
 * @internal
 */
interface SubscribeRequestKind<Variables> {
  operationName: string;
  variables?: Variables;
}

/**
 * Fields for a resume request payload.
 * @internal
 */
interface ResumeRequestKind {}

/**
 * Fields for a cancel request payload.
 * @internal
 */
interface CancelRequestKind {}

/**
 * Fields for a subscribe request payload.
 * @internal
 */
export interface SubscribeStreamRequest<Variables> extends StreamRequest {
  subscribe: SubscribeRequestKind<Variables>;
  execute?: never;
  resume?: never;
  cancel?: never;
}

/**
 * Fields for an execute request payload.
 * @internal
 */
export interface ExecuteStreamRequest<Variables> extends StreamRequest {
  execute: ExecuteRequestKind<Variables>;
  subscribe?: never;
  resume?: never;
  cancel?: never;
}

/**
 * Fields for a resume (subscribe) request payload.
 * @internal
 */
export interface ResumeStreamRequest extends StreamRequest {
  resume: ResumeRequestKind;
  subscribe?: never;
  execute?: never;
  cancel?: never;
}

/**
 * Fields for a cancel (unsubscribe) request payload.
 * @internal
 */
export interface CancelStreamRequest extends StreamRequest {
  cancel: CancelRequestKind;
  subscribe?: never;
  execute?: never;
  resume?: never;
}

/**
 * Shape of the request body to be sent over the stream to the server.
 * @internal
 */
export type DataConnectStreamRequest<Variables> =
  | ExecuteStreamRequest<Variables>
  | SubscribeStreamRequest<Variables>
  | ResumeStreamRequest
  | CancelStreamRequest;

/**
 * Determines whether the provided request to execute a query is an execution request or a resume
 * request
 * @returns true if the requestBody is a resume request
 * @internal
 */
export function queryRequestIsResume<Variables>(
  requestBody: ExecuteStreamRequest<Variables> | ResumeStreamRequest
): requestBody is ResumeStreamRequest {
  return 'resume' in requestBody;
}
