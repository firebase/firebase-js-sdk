/**
 * @license
 * Copyright 2019 Google LLC
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
  ConnectivityMonitor,
  ConnectivityMonitorCallback,
  NetworkStatus
} from '../../remote/connectivity_monitor';
import { logDebug } from '../../util/log';

// References to `window` are guarded by BrowserConnectivityMonitor.isAvailable()
/* eslint-disable no-restricted-globals */

const LOG_TAG = 'ConnectivityMonitor';

/**
 * Browser implementation of ConnectivityMonitor.
 */
export class BrowserConnectivityMonitor implements ConnectivityMonitor {
  private readonly networkAvailableListener = (): void =>
    this.onNetworkAvailable();
  private readonly networkUnavailableListener = (): void =>
    this.onNetworkUnavailable();
  private callbacks: ConnectivityMonitorCallback[] = [];

  constructor() {
    this.configureNetworkMonitoring();
  }

  addCallback(callback: (status: NetworkStatus) => void): void {
    this.callbacks.push(callback);
  }

  shutdown(): void {
    window.removeEventListener('online', this.networkAvailableListener);
    window.removeEventListener('offline', this.networkUnavailableListener);
  }

  private configureNetworkMonitoring(): void {
    window.addEventListener('online', this.networkAvailableListener);
    window.addEventListener('offline', this.networkUnavailableListener);
  }

  private onNetworkAvailable(): void {
    logDebug(LOG_TAG, 'Network connectivity changed: AVAILABLE');
    for (const callback of this.callbacks) {
      callback(NetworkStatus.AVAILABLE);
    }
  }

  private onNetworkUnavailable(): void {
    logDebug(LOG_TAG, 'Network connectivity changed: UNAVAILABLE');
    for (const callback of this.callbacks) {
      callback(NetworkStatus.UNAVAILABLE);
    }
  }

  // TODO(chenbrian): Consider passing in window either into this component or
  // here for testing via FakeWindow.
  /** Checks that all used attributes of window are available. */
  static isAvailable(): boolean {
    return (
      typeof window !== 'undefined' &&
      window.addEventListener !== undefined &&
      window.removeEventListener !== undefined
    );
  }
}
