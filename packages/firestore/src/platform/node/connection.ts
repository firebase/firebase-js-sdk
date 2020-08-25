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

import { loadProtos } from './load_protos';
import { GrpcConnection } from './grpc_connection';
import { DatabaseInfo } from '../../core/database_info';
import { ConnectivityMonitor } from '../../remote/connectivity_monitor';
import { Connection } from '../../remote/connection';
import { NoopConnectivityMonitor } from '../../remote/connectivity_monitor_noop';

/** Loads the GRPC stack */
export function newConnection(databaseInfo: DatabaseInfo): Connection {
  const protos = loadProtos();
  return new GrpcConnection(protos, databaseInfo);
}

/** Return the Platform-specific connectivity monitor. */
export function newConnectivityMonitor(): ConnectivityMonitor {
  return new NoopConnectivityMonitor();
}
