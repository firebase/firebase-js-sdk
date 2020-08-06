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
import { ConnectivityMonitor } from '../remote/connectivity_monitor';
import { DatabaseInfo } from '../core/database_info';
import { Connection } from '../remote/connection';

// This file is only used under ts-node.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const platform = require(`./${process.env.TEST_PLATFORM ?? 'node'}/connection`);

export function newConnectivityMonitor(): ConnectivityMonitor {
  return platform.newConnectivityMonitor();
}

// TODO(firestorexp): This doesn't need to return a Promise
export function newConnection(databaseInfo: DatabaseInfo): Promise<Connection> {
  return platform.newConnection(databaseInfo);
}
