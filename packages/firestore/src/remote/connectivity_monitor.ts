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

/**
 * The set of network states is deliberately simplified -- we only care about
 * states such that transition between them should break currently
 * established connections.
 */
export const enum NetworkStatus {
  AVAILABLE,
  UNAVAILABLE
}

export type ConnectivityMonitorCallback = (status: NetworkStatus) => void;

/**
 * A base class for monitoring changes in network connectivity; it is expected
 * that each platform will have its own system-dependent implementation.
 */
export interface ConnectivityMonitor {
  addCallback(callback: ConnectivityMonitorCallback): void;
  shutdown(): void;
}
