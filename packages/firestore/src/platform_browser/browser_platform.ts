/**
 * @license
 * Copyright 2017 Google LLC
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

import { DatabaseId, DatabaseInfo } from '../core/database_info';
import { Connection } from '../remote/connection';
import { JsonProtoSerializer } from '../remote/serializer';
import { ConnectivityMonitor } from '../remote/connectivity_monitor';
import { NoopConnectivityMonitor } from '../remote/connectivity_monitor_noop';
import { BrowserConnectivityMonitor } from './browser_connectivity_monitor';
import { WebChannelConnection } from './webchannel_connection';

// Implements the Platform API for browsers and some browser-like environments
// (including ReactNative, which has its own platform implementation that reuses
// most of these methods).
// The exports in this class must match the exports in '../platform/platform' as
// they are bundled with the browser build during the Rollup build.

/** Initializes the WebChannelConnection for the browser. */
export function loadConnection(
  databaseInfo: DatabaseInfo
): Promise<Connection> {
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

/** Return the Platform-specific serializer monitor. */
export function newSerializer(databaseId: DatabaseId): JsonProtoSerializer {
  return new JsonProtoSerializer(databaseId, { useProto3Json: true });
}

/** Converts a Base64 encoded string to a binary string. */
export function decodeBase64(encoded: string): string {
  return atob(encoded);
}

/** Converts a binary string to a Base64 encoded string. */
export function encodeBase64(raw: string): string {
  return btoa(raw);
}

/** The Platform's 'window' implementation or null if not available. */
export function getWindow(): Window | null {
  // `window` is not always available, e.g. in ReactNative and WebWorkers.
  // eslint-disable-next-line no-restricted-globals
  return typeof window !== 'undefined' ? window : null;
}

/** The Platform's 'document' implementation or null if not available. */
export function getDocument(): Document | null {
  // `document` is not always available, e.g. in ReactNative and WebWorkers.
  // eslint-disable-next-line no-restricted-globals
  return typeof document !== 'undefined' ? document : null;
}

/** True if and only if the Base64 conversion functions are available. */
export function isBase64Available(): boolean {
  return typeof atob !== 'undefined';
}
