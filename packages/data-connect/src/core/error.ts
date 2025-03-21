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

  /** @hideconstructor */
  constructor(
    /**
     * The backend error code associated with this error.
     */
    readonly code: DataConnectErrorCode,
    /**
     * A custom error description.
     */
    message: string
  ) {
    super(code, message);

    // Ensure the instanceof operator works as expected on subclasses of Error.
    // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#custom_error_types
    // and https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-2.html#support-for-newtarget
    Object.setPrototypeOf(this, new.target.prototype);
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
  readonly response: DataConnectOperationResponse;

  /** @hideconstructor */
  constructor(message: string, response: DataConnectOperationResponse) {
    super('partial-error', message);
    this.response = response;

    // Ensure the instanceof operator works as expected on subclasses of Error.
    // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#custom_error_types
    // and https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-2.html#support-for-newtarget
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export interface DataConnectOperationResponse {
  // The "data" provided by the backend in the response message.
  //
  // Will be `undefined` if no "data" was provided in the response message.
  // Otherwise, will be `null` if `null` was explicitly specified as the "data"
  // in the response message. Otherwise, will be the value of the "data"
  // specified as the "data" in the response message
  readonly data?: Record<string, unknown> | null;

  // The list of errors provided by the backend in the response message.
  readonly errors: DataConnectOperationErrorInfo[];
}

// Information about the error, as provided in the response from the backend.
// See https://spec.graphql.org/draft/#sec-Errors
export interface DataConnectOperationErrorInfo {
  // The error message.
  readonly message: string;

  // The path of the field in the response data to which this error relates.
  // String values in this array refer to field names. Numeric values in this
  // array always satisfy `Number.isInteger()` and refer to the index in an
  // array.
  readonly path: Array<string | number>;
}
