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
 * Builds the resolved PostgREST endpoint URL for a given SQL service configuration.
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

  if (typeof settings.port === 'number') {
    url.port = String(settings.port);
  } else if (typeof settings.port !== 'undefined') {
    throw new FirebaseSqlError(
      Code.INVALID_ARGUMENT,
      'Port must be a number if provided.',
      FirebaseSqlErrorCategory.SQL_CLIENT
    );
  }

  const encodedProjectId = encodeURIComponent(projectId);
  const encodedLocation = encodeURIComponent(settings.location);
  const encodedServiceId = encodeURIComponent(settings.serviceId);
  url.pathname = `/v1/projects/${encodedProjectId}/locations/${encodedLocation}/services/${encodedServiceId}/postgrest`;

  return url.toString();
}
