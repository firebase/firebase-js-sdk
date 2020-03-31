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
import { Platform } from '../platform/platform';
import { Connection } from '../remote/connection';
import { JsonProtoSerializer } from '../remote/serializer';
import { ConnectivityMonitor } from './../remote/connectivity_monitor';

import { NoopConnectivityMonitor } from '../remote/connectivity_monitor_noop';
import { BrowserConnectivityMonitor } from './browser_connectivity_monitor';
import { WebChannelConnection } from './webchannel_connection';

// Polyfill for IE
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const crypto = window.crypto || (window as any).msCrypto;

export class BrowserPlatform implements Platform {
  readonly useProto3Json = true;
  readonly base64Available: boolean;

  constructor() {
    this.base64Available = typeof atob !== 'undefined';
  }

  get document(): Document | null {
    return typeof document !== 'undefined' ? document : null;
  }

  get window(): Window | null {
    return typeof window !== 'undefined' ? window : null;
  }

  loadConnection(databaseInfo: DatabaseInfo): Promise<Connection> {
    return Promise.resolve(new WebChannelConnection(databaseInfo));
  }

  newConnectivityMonitor(): ConnectivityMonitor {
    if (BrowserConnectivityMonitor.isAvailable()) {
      return new BrowserConnectivityMonitor();
    } else {
      return new NoopConnectivityMonitor();
    }
  }

  newSerializer(databaseId: DatabaseId): JsonProtoSerializer {
    return new JsonProtoSerializer(databaseId, { useProto3Json: true });
  }

  formatJSON(value: unknown): string {
    return JSON.stringify(value);
  }

  atob(encoded: string): string {
    return atob(encoded);
  }

  btoa(raw: string): string {
    return btoa(raw);
  }

  randomBytes(nBytes: number): Uint8Array {
    if (nBytes <= 0) {
      return new Uint8Array();
    }

    const v = new Uint8Array(nBytes);
    crypto.getRandomValues(v);
    return v;
  }
}
