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
  | 'partial-error';

export type Code = DataConnectErrorCode;

export const Code = {
  OTHER: 'other' as DataConnectErrorCode,
  ALREADY_INITIALIZED: 'already-initialized' as DataConnectErrorCode,
  NOT_INITIALIZED: 'not-initialized' as DataConnectErrorCode,
  NOT_SUPPORTED: 'not-supported' as DataConnectErrorCode,
  INVALID_ARGUMENT: 'invalid-argument' as DataConnectErrorCode,
  PARTIAL_ERROR: 'partial-error' as DataConnectErrorCode
};

/** An error returned by a DataConnect operation. */
export class DataConnectError extends FirebaseError {
  /** The stack of the error. */
  readonly stack?: string;

  /** @hideconstructor */
  constructor(
    /**
     * The backend error code associated with this error.
     */
    readonly code: DataConnectErrorCode,
    /**
     * A custom error description.
     */
    readonly message: string
  ) {
    super(code, message);

    // HACK: We write a toString property directly because Error is not a real
    // class and so inheritance does not work correctly. We could alternatively
    // do the same "back-door inheritance" trick that FirebaseError does.
    this.toString = () => `${this.name}: [code=${this.code}]: ${this.message}`;
  }
}
