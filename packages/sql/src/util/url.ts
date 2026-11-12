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

import {
  Code,
  FirebaseSqlError,
  FirebaseSqlErrorCategory
} from '../core/error';
import { SqlServiceSettings } from '../core/settings';

/** @internal */
export const PROD_HOST = 'firebasedataconnect.googleapis.com';

/**
 * Validates that a PostgREST query parameter key does not start with `$`.
 *
 * Google Cloud's Enterprise Services Frontend (ESF) and the Firebase Data Connect
 * PostgREST gateway treat `$`-prefixed query parameters as system parameters and
 * intercept or strip them before the query reaches PostgREST (so e.g.
 * `update(...).eq('$id', 1)` would drop the filter and update every row).
 *
 * @throws `FirebaseSqlError` with `Code.INVALID_ARGUMENT` and
 * `FirebaseSqlErrorCategory.SQL_CLIENT` if the parameter key starts with `$`.
 * @internal
 */
export function validateQueryParamKey(name: string): string {
  // Coerce to a string once so untyped JS callers cannot bypass validation with
  // stateful toString() / [Symbol.toPrimitive] objects.
  const paramName = String(name);
  if (paramName.trimStart().startsWith('$')) {
    throw new FirebaseSqlError(
      Code.INVALID_ARGUMENT,
      `Query parameter "${paramName}" cannot start with "$".`,
      FirebaseSqlErrorCategory.SQL_CLIENT
    );
  }
  return paramName;
}

/**
 * Validates that a request URL does not contain any `$`-prefixed query parameters
 * (including percent-encoded `%24` keys or semicolon-delimited parameters).
 *
 * @throws `FirebaseSqlError` with `Code.INVALID_ARGUMENT` and
 * `FirebaseSqlErrorCategory.SQL_CLIENT` if any query parameter key starts with `$`.
 * @internal
 */
export function validateUrlQueryParams(url: string | URL): void {
  const rawUrl = typeof url === 'string' ? url : url.toString();
  const hashIdx = rawUrl.indexOf('#');
  const urlWithoutHash = hashIdx === -1 ? rawUrl : rawUrl.slice(0, hashIdx);
  const qIdx = urlWithoutHash.indexOf('?');
  if (qIdx === -1) {
    return;
  }
  const rawQuery = urlWithoutHash.slice(qIdx + 1);
  if (rawQuery.length === 0) {
    return;
  }
  for (const segment of rawQuery.split(/[&;]/)) {
    if (segment.length === 0) {
      continue;
    }
    const eqIdx = segment.indexOf('=');
    const rawKey = eqIdx === -1 ? segment : segment.slice(0, eqIdx);
    let decodedKey = rawKey.replace(/\+/g, ' ');
    try {
      decodedKey = decodeURIComponent(decodedKey);
    } catch {
      decodedKey = decodedKey.replace(
        /%[0-7][0-9a-fA-F]|%[cCdD][0-9a-fA-F]%[89aAbB][0-9a-fA-F]|%[eE][0-9a-fA-F](?:%[89aAbB][0-9a-fA-F]){2}|%[fF][0-7](?:%[89aAbB][0-9a-fA-F]){3}/g,
        match => {
          try {
            return decodeURIComponent(match);
          } catch {
            return match;
          }
        }
      );
    }
    validateQueryParamKey(decodedKey);
  }
}

/**
 * Builds the resolved PostgREST endpoint URL for a given SQL service configuration.
 * Assumes settings have been validated!
 *
 * @throws TypeError if the hostname + protocol combination is invalid for the URL constructor.
 * @internal
 */
export function resolvePostgrestUrl(
  settings: SqlServiceSettings,
  projectId: string
): string {
  const protocol = settings.sslEnabled === false ? 'http' : 'https';
  const host = settings.host ?? PROD_HOST;
  const url = new URL(`${protocol}://${host}`);

  if (settings.port !== undefined) {
    url.port = String(settings.port);
  }

  const encodedProjectId = encodeURIComponent(projectId);
  const encodedLocation = encodeURIComponent(settings.location);
  const encodedServiceId = encodeURIComponent(settings.serviceId);
  url.pathname = `/v1/projects/${encodedProjectId}/locations/${encodedLocation}/services/${encodedServiceId}/postgrest`;

  return url.toString();
}
