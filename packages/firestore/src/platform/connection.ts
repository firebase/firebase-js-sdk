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

import { isNode, isReactNative } from '@firebase/util';
import * as node from './node/connection';
import * as rn from './rn/connection';
import * as browser from './browser/connection';
import { ConnectivityMonitor } from '../remote/connectivity_monitor';
import { DatabaseInfo } from '../core/database_info';
import { Connection } from '../remote/connection';

export function newConnectivityMonitor(): ConnectivityMonitor {
  if (isNode()) {
    return node.newConnectivityMonitor();
  } else if (isReactNative()) {
    return rn.newConnectivityMonitor();
  } else {
    return browser.newConnectivityMonitor();
  }
}

export function newConnection(databaseInfo: DatabaseInfo): Promise<Connection> {
  if (isNode()) {
    return node.newConnection(databaseInfo);
  } else if (isReactNative()) {
    return rn.newConnection(databaseInfo);
  } else {
    return browser.newConnection(databaseInfo);
  }
}

export function newRestConnection(databaseInfo: DatabaseInfo): Connection {
  if (isNode()) {
    return node.newRestConnection(databaseInfo);
  } else if (isReactNative()) {
    return rn.newRestConnection(databaseInfo);
  } else {
    return browser.newRestConnection(databaseInfo);
  }
}
