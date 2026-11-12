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

import { validateHeaders } from '../network/headers';

import { FirebaseSqlErrorCategory, Code, FirebaseSqlError } from './error';

/** Connection settings for a `FirebaseSql` client instance. */
export interface SqlServiceSettings {
  /** Optional PostgreSQL schema name (defaults to `'public'`). */
  schemaName?: string | undefined;
  /** Optional custom HTTP headers sent with every request. */
  headers?: Record<string, string> | undefined;
  /** Firebase SQL service identifier. */
  serviceId: string;
  /** Firebase SQL service region (such as `'us-central1'`). */
  location: string;
  /** Optional custom host override. */
  host?: string | undefined;
  /** Optional custom TCP port (`1`–`65535`). */
  port?: number | undefined;
  /** Whether to connect over HTTPS (`true` by default). */
  sslEnabled?: boolean | undefined;
}

/**
 * Create a mutable copy of a `SqlServiceSettings` object, including its `headers` map.
 *
 * @param settings - Settings object to clone.
 * @returns A shallow-cloned, unfrozen `SqlServiceSettings` object.
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
 * Validates that the provided port is a valid TCP port number.
 *
 * @throws `FirebaseSqlError` with `Code.INVALID_ARGUMENT` and `FirebaseSqlErrorCategory.SQL_CLIENT` if port is invalid.
 */
function validatePort(port: unknown): void {
  if (port === undefined) {
    return;
  }
  if (
    typeof port !== 'number' ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    throw new FirebaseSqlError(
      Code.INVALID_ARGUMENT,
      `Port must be a valid integer between 1 and 65535 if provided. Received: ${String(port)}.`,
      FirebaseSqlErrorCategory.SQL_CLIENT
    );
  }
}

/**
 * Validates required `SqlServiceSettings` fields.
 *
 * @returns a deep, frozen copy of the settings.
 * @throws `FirebaseSqlError` with `Code.INVALID_ARGUMENT` and `FirebaseSqlErrorCategory.SQL_CLIENT` if required fields are missing or invalid.
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
  validatePort(settings.port);
  validateHeaders(settings.headers);
  return freezeSqlServiceSettings(settings);
}
