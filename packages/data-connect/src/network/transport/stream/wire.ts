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

import { DataConnectExtensions } from '..';

/**
 * Shape of response from the server.
 * @internal
 */
export interface DataConnectStreamResponse<Data> {
  requestId: string;
  data: Data;
  extensions: DataConnectExtensions;
  dataEtag: string; // TODO(stephenarosaj): actually a hash
  errors: Error[];
  cancelled: boolean;
}

/**
 * Base interface for stream request payloads sent over the stream to the server.
 * @internal
 */
export interface StreamRequest {
  /** connectorResourcePath - only required on initial connection */
  name?: string;
  /** monotonically increasing integer. starts at 1 */
  requestId: string;
  /** only required if initially authenticating or re-authenticating */
  authToken?: string; // TODO(stephenarosaj): type
  /** only required if initially authenticating or re-authenticating */
  appCheckToken?: string; // TODO(stephenarosaj): type
  //TODO(stephenarosaj): flesh out comment: /** only required if... */
  dataEtag?: string; // TODO(stephenarosaj): type
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
  subscribe: ExecuteRequestKind<Variables>;
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
 * Fields for a cancel request payload.
 * @internal
 */
export interface ResumeStreamRequest extends StreamRequest {
  resume?: ResumeRequestKind;
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
