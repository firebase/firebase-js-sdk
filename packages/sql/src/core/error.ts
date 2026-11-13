/**
 * @license
 * Copyright 2026 Google LLC
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

/** Error codes emitted by Firebase SQL client and platform operations. */
export type FirebaseSqlErrorCode =
  | 'other'
  | 'already-initialized'
  | 'not-initialized'
  | 'not-supported'
  | 'invalid-argument'
  | 'partial-error'
  | 'unauthorized';

/** Alias for `FirebaseSqlErrorCode`. */
export type Code = FirebaseSqlErrorCode;

/** Constant map of `FirebaseSqlErrorCode` values. */
export const Code = Object.freeze({
  OTHER: 'other' as const satisfies FirebaseSqlErrorCode,
  ALREADY_INITIALIZED:
    'already-initialized' as const satisfies FirebaseSqlErrorCode,
  NOT_INITIALIZED: 'not-initialized' as const satisfies FirebaseSqlErrorCode,
  NOT_SUPPORTED: 'not-supported' as const satisfies FirebaseSqlErrorCode,
  INVALID_ARGUMENT: 'invalid-argument' as const satisfies FirebaseSqlErrorCode,
  PARTIAL_ERROR: 'partial-error' as const satisfies FirebaseSqlErrorCode,
  UNAUTHORIZED: 'unauthorized' as const satisfies FirebaseSqlErrorCode
});

/** Categories identifying the origin of a `FirebaseSqlError`. */
export type FirebaseSqlErrorCategory =
  'sql-postgrest' | 'sql-platform' | 'sql-client';

/** Constant map of `FirebaseSqlErrorCategory` values. */
export const FirebaseSqlErrorCategory = Object.freeze({
  SQL_POSTGREST: 'sql-postgrest' as const satisfies FirebaseSqlErrorCategory,
  SQL_PLATFORM: 'sql-platform' as const satisfies FirebaseSqlErrorCategory,
  SQL_CLIENT: 'sql-client' as const satisfies FirebaseSqlErrorCategory
});

/** Plain JSON-serializable representation of a `FirebaseSqlError`. */
export interface SerializedFirebaseSqlError {
  /**
   * Error class name (`'FirebaseSqlError'`).
   * @internal
   */
  name: string;
  /** SQLSTATE, PostgREST (`'PGRST*'`), or client `Code` identifier. */
  code: string;
  /** Descriptive error message. */
  message: string;
  /** Origin category (`'sql-postgrest'`, `'sql-platform'`, or `'sql-client'`). */
  category: string;
  /** Optional diagnostic details from the server or client. */
  details?: string | undefined;
  /** Optional remediation hint from the server. */
  hint?: string | undefined;
  /** Optional HTTP status code associated with the failure. */
  status?: number | undefined;
}

/**
 * Structured error returned in `result.error` (or thrown after `.throwOnError()`) when an operation fails.
 *
 * @remarks
 * Use `category` to distinguish client (`'sql-client'`), platform (`'sql-platform'`), and database (`'sql-postgrest'`) failures, branch on `code` for programmatic handling, and inspect `details` and `hint` for database diagnostics.
 *
 * @example Handle a unique constraint violation
 * ```ts
 * const { error } = await sql
 *   .from('tasks')
 *   .insert({ id: 1, title: 'Write docs' });
 * if (error?.code === '23505') {
 *   console.error('Duplicate task ID:', error.details);
 * }
 * ```
 */
export class FirebaseSqlError extends FirebaseError {
  /**
   * Error class name (`'FirebaseSqlError'`).
   * @internal
   */
  readonly name: string = 'FirebaseSqlError';
  /** SQLSTATE, PostgREST (`'PGRST*'`), or client `Code` identifier. */
  readonly code: string;
  /** Origin category (`'sql-postgrest'`, `'sql-platform'`, or `'sql-client'`). */
  readonly category: string;
  /** Optional diagnostic details from the server or client. */
  readonly details?: string | undefined;
  /** Optional remediation hint from the server. */
  readonly hint?: string | undefined;
  /** Optional HTTP status code associated with the failure. */
  readonly status?: number | undefined;

  /**
   * Create a `FirebaseSqlError` instance.
   *
   * @param code - SQLSTATE, PostgREST (`'PGRST*'`), or client `Code` identifier.
   * @param message - Descriptive error message.
   * @param category - Origin category (`'sql-postgrest'`, `'sql-platform'`, or `'sql-client'`).
   * @param details - Optional diagnostic details from the server or client.
   * @param hint - Optional remediation hint from the server.
   * @param status - Optional HTTP status code associated with the failure.
   */
  constructor(
    code: string,
    message: string,
    category: string,
    details?: string | undefined,
    hint?: string | undefined,
    status?: number | undefined
  ) {
    super(code, message);
    this.code = code;
    this.category = category;
    this.details = details;
    this.hint = hint;
    this.status = status;

    // Ensure the instanceof operator works as expected on subclasses of Error.
    // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#custom_error_types
    // and https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-2.html#support-for-newtarget
    Object.setPrototypeOf(this, FirebaseSqlError.prototype);
  }

  /**
   * Serialize this error into a plain JSON object.
   *
   * @returns Plain JSON representation of this error.
   */
  toJSON(): SerializedFirebaseSqlError {
    const serialized: SerializedFirebaseSqlError = {
      name: this.name,
      code: this.code,
      message: this.message,
      category: this.category
    };
    if (this.details !== undefined) {
      serialized.details = this.details;
    }
    if (this.hint !== undefined) {
      serialized.hint = this.hint;
    }
    if (this.status !== undefined) {
      serialized.status = this.status;
    }
    return serialized;
  }

  /** @internal */
  toString(): string {
    const detailsText = this.details ? ` (details: ${this.details})` : '';
    const hintText = this.hint ? ` (hint: ${this.hint})` : '';
    return `${this.name}[code=${this.code}]: ${this.message}${detailsText}${hintText}`.trim();
  }
}
