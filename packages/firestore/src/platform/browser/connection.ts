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

import { WebChannelConnection } from './webchannel_connection';
import { DatabaseInfo } from '../../core/database_info';
import { Connection } from '../../remote/connection';
import { ConnectivityMonitor } from '../../remote/connectivity_monitor';
import { BrowserConnectivityMonitor } from './connectivity_monitor';
import { NoopConnectivityMonitor } from '../../remote/connectivity_monitor_noop';

/** Initializes the WebChannelConnection for the browser. */
export function newConnection(databaseInfo: DatabaseInfo): Promise<Connection> {
  return Promise.resolve(new WebChannelConnection(databaseInfo));
}

/** Return the Platform-specific connectivity monitor. */
export function newConnectivityMonitor(): ConnectivityMonitor {
  if (BrowserConnectivityMonitor.isAvailable()) {
    return new BrowserConnectivityMonitor();
  } else {
    return new NoopConnectivityMonitor();
  }
}
