/**
 * @license
 * Copyright 2024 Google LLC
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

import { FirebaseError } from '@firebase/util';

export type DataConnectErrorCode =
  | 'other'
  | 'already-initialized'
  | 'not-initialized'
  | 'not-supported'
  | 'invalid-argument'
  | 'partial-error'
  | 'unauthorized';

export type Code = DataConnectErrorCode;

export const Code = {
  OTHER: 'other' as DataConnectErrorCode,
  ALREADY_INITIALIZED: 'already-initialized' as DataConnectErrorCode,
  NOT_INITIALIZED: 'not-initialized' as DataConnectErrorCode,
  NOT_SUPPORTED: 'not-supported' as DataConnectErrorCode,
  INVALID_ARGUMENT: 'invalid-argument' as DataConnectErrorCode,
  PARTIAL_ERROR: 'partial-error' as DataConnectErrorCode,
  UNAUTHORIZED: 'unauthorized' as DataConnectErrorCode
};

/** An error returned by a DataConnect operation. */
export class DataConnectError extends FirebaseError {
  /** @internal */
  readonly name: string = 'DataConnectError';

  constructor(code: Code, message: string) {
    super(code, message);

    // Ensure the instanceof operator works as expected on subclasses of Error.
    // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#custom_error_types
    // and https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-2.html#support-for-newtarget
    Object.setPrototypeOf(this, DataConnectError.prototype);
  }

  /** @internal */
  toString(): string {
    return `${this.name}[code=${this.code}]: ${this.message}`;
  }
}

/** An error returned by a DataConnect operation. */
export class DataConnectOperationError extends DataConnectError {
  /** @internal */
  readonly name: string = 'DataConnectOperationError';

  /** The response received from the backend. */
  readonly response: DataConnectOperationFailureResponse;

  /** @hideconstructor */
  constructor(message: string, response: DataConnectOperationFailureResponse) {
    super(Code.PARTIAL_ERROR, message);
    this.response = response;
  }
}

export interface DataConnectOperationFailureResponse {
  // The "data" provided by the backend in the response message.
  //
  // Will be `undefined` if no "data" was provided in the response message.
  // Otherwise, will be `null` if `null` was explicitly specified as the "data"
  // in the response message. Otherwise, will be the value of the "data"
  // specified as the "data" in the response message
  readonly data?: Record<string, unknown> | null;

  // The list of errors provided by the backend in the response message.
  readonly errors: DataConnectOperationFailureResponseErrorInfo[];
}

// Information about the error, as provided in the response from the backend.
// See https://spec.graphql.org/draft/#sec-Errors
export interface DataConnectOperationFailureResponseErrorInfo {
  // The error message.
  readonly message: string;

  // The path of the field in the response data to which this error relates.
  // String values in this array refer to field names. Numeric values in this
  // array always satisfy `Number.isInteger()` and refer to the index in an
  // array.
  readonly path: Array<string | number>;
}

/**
 * Error/close codes for streaming. Complies with WebSocket close codes, defined by
 * {@link https://www.rfc-editor.org/rfc/rfc6455#section-7.4 | RFC #6455: "The WebSocket Protocol"}.
 * Note that WebSockets in Node environments only support close codes 1000 or 3000-4999, where 1000
 * is a graceful close.
 * @internal
 */
export type StreamCode = 3001 | 3002 | 3003 | 3004 | 3099;

export const StreamCode = {
  PROTOCOL_ERROR: 3001 as StreamCode,
  ILLEGAL_AUTH_CHANGE: 3002 as StreamCode,
  WEBSOCKET_CONNECTION_ERROR: 3003 as StreamCode,
  MISSING_WEBSOCKET_IMPL: 3004 as StreamCode,
  OTHER: 3099 as StreamCode
};

/**
 * Base class for stream errors. Based on the {@link StreamCode}.
 */
export class DataConnectStreamError extends DataConnectError {
  constructor(message: string, readonly streamCode: StreamCode) {
    super(Code.OTHER, message);
    // Ensure the instanceof operator works as expected on subclasses of Error.
    // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#custom_error_types
    // and https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-2.html#support-for-newtarget
    Object.setPrototypeOf(this, DataConnectStreamError.prototype);
  }
}
