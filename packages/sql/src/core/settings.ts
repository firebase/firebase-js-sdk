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

import { LOWERCASE_DISALLOWED_HEADER_KEYS } from '../util/constants';

import { FirebaseSqlErrorCategory, Code, FirebaseSqlError } from './error';

/**
 * Service connection settings for configuring a Firebase SQL client instance.
 */
export interface SqlServiceSettings {
  /** Optional PostgreSQL schema name. */
  schemaName?: string | undefined;
  /** Custom HTTP headers to include with outgoing requests. */
  headers?: Record<string, string> | undefined;
  /** Firebase SQL service identifier. */
  serviceId: string;
  /** Firebase SQL service location identifier. */
  location: string;
  /** Optional custom host for emulator or proxy routing. */
  host?: string | undefined;
  /** Optional custom port for emulator or proxy routing. */
  port?: number | undefined;
  /** Whether SSL is enabled (defaults to true; set to false for local HTTP). */
  sslEnabled?: boolean | undefined;
}

/**
 * Creates a deep defensive copy of a `SqlServiceSettings` object.
 */
export function copySqlServiceSettings(
  settings: SqlServiceSettings
): SqlServiceSettings {
  const settingsCopy: SqlServiceSettings = Object.assign({}, settings);
  if (settings.headers !== undefined) {
    settingsCopy.headers = Object.assign({}, settings.headers);
  }
  return settingsCopy;
}

/**
 * Freezes a deep copy of the `SqlServiceSettings`.
 * @internal
 */
export function freezeSqlServiceSettings(
  settings: SqlServiceSettings
): SqlServiceSettings {
  const settingsCopy = copySqlServiceSettings(settings);
  if (settingsCopy.headers !== undefined) {
    Object.freeze(settingsCopy.headers);
  }
  return Object.freeze(settingsCopy);
}

/**
 * Validates that the given headers do not contain any protected header keys (case-insensitive).
 * @throws `FirebaseSqlError` with `Code.INVALID_ARGUMENT` and `FirebaseSqlErrorCategory.SQL_CLIENT` if the headers contain any protected header keys.
 * @internal
 */
export function validateInitializationHeaders(
  headers?: Record<string, string> | undefined
): void {
  if (!headers) {
    return;
  }
  for (const key of Object.keys(headers)) {
    if (
      LOWERCASE_DISALLOWED_HEADER_KEYS.has(String(key).trim().toLowerCase())
    ) {
      throw new FirebaseSqlError(
        Code.INVALID_ARGUMENT,
        `Cannot set protected header ${key}.`,
        FirebaseSqlErrorCategory.SQL_CLIENT
      );
    }
  }
}

/**
 * Validates required `SqlServiceSettings` fields.
 *
 * @returns a deep, frozen copy of the settings.
 * @throws `FirebaseSqlError` with `Code.INVALID_ARGUMENT` and `FirebaseSqlErrorCategory.SQL_CLIENT` if required fields are missing.
 * @internal
 */
export function validateSqlServiceSettings(
  settings: SqlServiceSettings
): SqlServiceSettings {
  if (!settings) {
    throw new FirebaseSqlError(
      Code.INVALID_ARGUMENT,
      'SqlServiceSettings must be provided.',
      FirebaseSqlErrorCategory.SQL_CLIENT
    );
  }
  if (!settings.serviceId) {
    throw new FirebaseSqlError(
      Code.INVALID_ARGUMENT,
      'serviceId is required.',
      FirebaseSqlErrorCategory.SQL_CLIENT
    );
  }
  if (!settings.location) {
    throw new FirebaseSqlError(
      Code.INVALID_ARGUMENT,
      'location is required.',
      FirebaseSqlErrorCategory.SQL_CLIENT
    );
  }
  validateInitializationHeaders(settings.headers);
  return freezeSqlServiceSettings(settings);
}
