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

import { ServiceConfig } from '../core/serviceConfig';

/** @internal */
export const PROD_HOST = 'firebasedataconnect.googleapis.com';

/**
 * Builds the resolved PostgREST endpoint URL for a given SQL service configuration.
 * Assumes `serviceConfig` has been validated!
 *
 * @throws TypeError if the hostname + protocol combination is invalid for the URL constructor.
 * @internal
 */
export function resolvePostgrestUrl(
  serviceConfig: ServiceConfig,
  projectId: string
): string {
  const protocol = serviceConfig.sslEnabled === false ? 'http' : 'https';
  const host = serviceConfig.host ?? PROD_HOST;
  const url = new URL(`${protocol}://${host}`);

  if (serviceConfig.port !== undefined) {
    url.port = String(serviceConfig.port);
  }

  const encodedProjectId = encodeURIComponent(projectId);
  const encodedLocation = encodeURIComponent(serviceConfig.location);
  const encodedServiceId = encodeURIComponent(serviceConfig.serviceId);
  url.pathname = `/v1/projects/${encodedProjectId}/locations/${encodedLocation}/services/${encodedServiceId}/postgrest`;

  return url.toString();
}
