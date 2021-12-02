/**
 * @license
 * Copyright 2021 Google LLC
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

import { ComponentContainer } from '@firebase/component';
import {
  base64Encode,
  isIndexedDBAvailable,
  validateIndexedDBOpenable
} from '@firebase/util';
import {
  deleteHeartbeatsFromIndexedDB,
  readHeartbeatsFromIndexedDB,
  writeHeartbeatsToIndexedDB
} from './indexeddb';
import { FirebaseApp } from './public-types';
import {
  HeartbeatsByUserAgent,
  HeartbeatService,
  HeartbeatStorage
} from './types';

export class HeartbeatServiceImpl implements HeartbeatService {
  /**
   * The persistence layer for heartbeats
   * Leave public for easier testing.
   */
  _storage: HeartbeatStorageImpl;

  /**
   * In-memory cache for heartbeats, used by getHeartbeatsHeader() to generate
   * the header string.
   * Populated from indexedDB when the controller is instantiated and should
   * be kept in sync with indexedDB.
   * Leave public for easier testing.
   */
  _heartbeatsCache: HeartbeatsByUserAgent[] | null = null;

  /**
   * the initialization promise for populating heartbeatCache.
   * If getHeartbeatsHeader() is called before the promise resolves
   * (hearbeatsCache == null), it should wait for this promise
   * Leave public for easier testing.
   */
  _heartbeatsCachePromise: Promise<HeartbeatsByUserAgent[]>;
  constructor(private readonly container: ComponentContainer) {
    const app = this.container.getProvider('app').getImmediate();
    this._storage = new HeartbeatStorageImpl(app);
    this._heartbeatsCachePromise = this._storage.read().then(result => {
      this._heartbeatsCache = result;
      return result;
    });
  }

  /**
   * Called to report a heartbeat. The function will generate
   * a HeartbeatsByUserAgent object, update heartbeatsCache, and persist it
   * to IndexedDB.
   * Note that we only store one heartbeat per day. So if a heartbeat for today is
   * already logged, subsequent calls to this function in the same day will be ignored.
   */
  async triggerHeartbeat(): Promise<void> {
    const platformLogger = this.container
      .getProvider('platform-logger')
      .getImmediate();

    // This is the "Firebase user agent" string from the platform logger
    // service, not the browser user agent.
    const userAgent = platformLogger.getPlatformInfoString();
    const date = getUTCDateString();
    if (this._heartbeatsCache === null) {
      await this._heartbeatsCachePromise;
    }
    let heartbeatsEntry = this._heartbeatsCache!.find(
      heartbeats => heartbeats.userAgent === userAgent
    );
    if (heartbeatsEntry) {
      if (heartbeatsEntry.dates.includes(date)) {
        // Only one per day.
        return;
      } else {
        // Modify in-place in this.heartbeatsCache
        heartbeatsEntry.dates.push(date);
      }
    } else {
      // There is no entry for this Firebase user agent. Create one.
      heartbeatsEntry = {
        userAgent,
        dates: [date]
      };
      this._heartbeatsCache!.push(heartbeatsEntry);
    }
    return this._storage.overwrite(this._heartbeatsCache!);
  }

  /**
   * Returns a base64 encoded string which can be attached to the heartbeat-specific header directly.
   * It also clears all heartbeats from memory as well as in IndexedDB.
   *
   * NOTE: It will read heartbeats from the heartbeatsCache, instead of from indexedDB to reduce latency
   */
  async getHeartbeatsHeader(): Promise<string> {
    if (this._heartbeatsCache === null) {
      await this._heartbeatsCachePromise;
    }
    // If it's still null, it's been cleared and has not been repopulated.
    if (this._heartbeatsCache === null) {
      return '';
    }
    const headerString = base64Encode(
      JSON.stringify({ version: 2, heartbeats: this._heartbeatsCache })
    );
    this._heartbeatsCache = null;
    // Do not wait for this, to reduce latency.
    void this._storage.deleteAll();
    return headerString;
  }
}

function getUTCDateString(): string {
  const today = new Date();
  const yearString = today.getUTCFullYear().toString();
  const month = today.getUTCMonth() + 1;
  const monthString = month < 10 ? '0' + month : month.toString();
  const date = today.getUTCDate();
  const dayString = date < 10 ? '0' + date : date.toString();
  return `${yearString}-${monthString}-${dayString}`;
}

export class HeartbeatStorageImpl implements HeartbeatStorage {
  private _canUseIndexedDBPromise: Promise<boolean>;
  constructor(public app: FirebaseApp) {
    this._canUseIndexedDBPromise = this.runIndexedDBEnvironmentCheck();
  }
  async runIndexedDBEnvironmentCheck(): Promise<boolean> {
    if (!isIndexedDBAvailable()) {
      return false;
    } else {
      return validateIndexedDBOpenable()
        .then(() => true)
        .catch(() => false);
    }
  }
  /**
   * Read all heartbeats.
   */
  async read(): Promise<HeartbeatsByUserAgent[]> {
    const canUseIndexedDB = await this._canUseIndexedDBPromise;
    if (!canUseIndexedDB) {
      return [];
    } else {
      const idbHeartbeatObject = await readHeartbeatsFromIndexedDB(this.app);
      return idbHeartbeatObject?.heartbeats || [];
    }
  }
  // overwrite the storage with the provided heartbeats
  async overwrite(heartbeats: HeartbeatsByUserAgent[]): Promise<void> {
    const canUseIndexedDB = await this._canUseIndexedDBPromise;
    if (!canUseIndexedDB) {
      return;
    } else {
      return writeHeartbeatsToIndexedDB(this.app, { heartbeats });
    }
  }
  // add heartbeats
  async add(heartbeats: HeartbeatsByUserAgent[]): Promise<void> {
    const canUseIndexedDB = await this._canUseIndexedDBPromise;
    if (!canUseIndexedDB) {
      return;
    } else {
      const existingHeartbeats = await this.read();
      return writeHeartbeatsToIndexedDB(this.app, {
        heartbeats: [...existingHeartbeats, ...heartbeats]
      });
    }
  }
  // delete heartbeats
  async delete(heartbeats: HeartbeatsByUserAgent[]): Promise<void> {
    const canUseIndexedDB = await this._canUseIndexedDBPromise;
    if (!canUseIndexedDB) {
      return;
    } else {
      const existingHeartbeats = await this.read();
      return writeHeartbeatsToIndexedDB(this.app, {
        heartbeats: existingHeartbeats.filter(
          existingHeartbeat => !heartbeats.includes(existingHeartbeat)
        )
      });
    }
  }
  // delete all heartbeats
  async deleteAll(): Promise<void> {
    const canUseIndexedDB = await this._canUseIndexedDBPromise;
    if (!canUseIndexedDB) {
      return;
    } else {
      return deleteHeartbeatsFromIndexedDB(this.app);
    }
  }
}
