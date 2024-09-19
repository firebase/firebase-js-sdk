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

import { DataConnectOptions, TransportOptions } from '../api/DataConnect';
import { Code, DataConnectError } from '../core/error';
import { logError } from '../logger';

export function urlBuilder(
  projectConfig: DataConnectOptions,
  transportOptions: TransportOptions
): string {
  const { connector, location, projectId: project, service } = projectConfig;
  const { host, sslEnabled, port } = transportOptions;
  const protocol = sslEnabled ? 'https' : 'http';
  const realHost = host || `firebasedataconnect.googleapis.com`;
  let baseUrl = `${protocol}://${realHost}`;
  if (typeof port === 'number') {
    baseUrl += `:${port}`;
  } else if (typeof port !== 'undefined') {
    logError('Port type is of an invalid type');
    throw new DataConnectError(
      Code.INVALID_ARGUMENT,
      'Incorrect type for port passed in!'
    );
  }
  return `${baseUrl}/v1beta/projects/${project}/locations/${location}/services/${service}/connectors/${connector}`;
}
export function addToken(url: string, apiKey?: string): string {
  if (!apiKey) {
    return url;
  }
  const newUrl = new URL(url);
  newUrl.searchParams.append('key', apiKey);
  return newUrl.toString();
}
