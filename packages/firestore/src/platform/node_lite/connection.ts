/**
 * @license
 * Copyright 2020 Google LLC
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

import * as nodeFetch from 'node-fetch';

import { FetchConnection } from '../browser_lite/fetch_connection';
import { DatabaseInfo } from '../../core/database_info';
import { Connection } from '../../remote/connection';

export { newConnectivityMonitor } from '../browser/connection';

/** Initializes the HTTP connection for the REST API. */
export function newConnection(databaseInfo: DatabaseInfo): Connection {
  // node-fetch is meant to be API compatible with `fetch`, but its type don't
  // match 100%.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new FetchConnection(databaseInfo, nodeFetch as any);
}
