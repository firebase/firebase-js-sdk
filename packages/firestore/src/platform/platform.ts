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

import { isNode } from '@firebase/util';

import { DatabaseId, DatabaseInfo } from '../core/database_info';
import { Connection } from '../remote/connection';
import { JsonProtoSerializer } from '../remote/serializer';
import { ConnectivityMonitor } from '../remote/connectivity_monitor';

import * as node from '../platform_node/node_platform';
import * as browser from '../platform_browser/browser_platform';

// NOTE: This class is replaced in Firestore release builds by either
// "node_platform" or "browser_platform". The implementations below are only
// used by ts-node to run tests.

/** Loads the network stack (GRPC or WebChannel). */
export function loadConnection(
  databaseInfo: DatabaseInfo
): Promise<Connection> {
  return isNode()
    ? node.loadConnection(databaseInfo)
    : browser.loadConnection(databaseInfo);
}

/** Return the Platform-specific connectivity monitor. */
export function newConnectivityMonitor(): ConnectivityMonitor {
  return isNode()
    ? node.newConnectivityMonitor()
    : browser.newConnectivityMonitor();
}

/** Return the Platform-specific serializer monitor. */
export function newSerializer(databaseId: DatabaseId): JsonProtoSerializer {
  return isNode()
    ? node.newSerializer(databaseId)
    : browser.newSerializer(databaseId);
}

/** Converts a Base64 encoded string to a binary string. */
export function decodeBase64(encoded: string): string {
  return isNode() ? node.decodeBase64(encoded) : browser.decodeBase64(encoded);
}

/** Converts a binary string to a Base64 encoded string. */
export function encodeBase64(raw: string): string {
  return isNode() ? node.encodeBase64(raw) : browser.encodeBase64(raw);
}

/** The Platform's 'window' implementation or null if not available. */
export function getWindow(): Window | null {
  return isNode() ? node.getWindow() : browser.getWindow();
}

/** The Platform's 'document' implementation or null if not available. */
export function getDocument(): Document | null {
  return isNode() ? node.getDocument() : browser.getDocument();
}

/** True if and only if the Base64 conversion functions are available. */
export function isBase64Available(): boolean {
  return isNode() ? node.isBase64Available() : browser.isBase64Available();
}
