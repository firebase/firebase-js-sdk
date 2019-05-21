/**
 * @license
 * Copyright 2019 Google Inc.
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

import { debug } from '../util/log';
import {
  ConnectivityMonitor,
  ConnectivityMonitorCallback,
  NetworkStatus
} from './../remote/connectivity_monitor';

const LOG_TAG = 'ConnectivityMonitor';

/**
 * Browser implementation of ConnectivityMonitor.
 */
export class BrowserConnectivityMonitor implements ConnectivityMonitor {
  private callbacks: ConnectivityMonitorCallback[] = [];

  constructor() {
    this.configureNetworkMonitoring();
  }

  addCallback(callback: (status: NetworkStatus) => void): void {
    this.callbacks.push(callback);
  }

  shutdown(): void {
    const self = this;
    window.removeEventListener('online', self.onNetworkAvailable);
    window.removeEventListener('offline', self.onNetworkUnavailable);
  }

  private configureNetworkMonitoring(): void {
    const self = this;
    window.addEventListener('online', self.onNetworkAvailable);
    window.addEventListener('offline', self.onNetworkUnavailable);
  }

  private onNetworkAvailable(): void {
    debug(LOG_TAG, 'Network connectivity changed: AVAILABLE');
    for (const callback of this.callbacks) {
      callback(NetworkStatus.AVAILABLE);
    }
  }

  private onNetworkUnavailable(): void {
    debug(LOG_TAG, 'Network connectivity changed: UNAVAILABLE');
    for (const callback of this.callbacks) {
      callback(NetworkStatus.UNAVAILABLE);
    }
  }
}
