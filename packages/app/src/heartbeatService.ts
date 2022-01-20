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
import { countBytes, splitHeartbeatsCache } from './heartbeatSize';
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

const HEADER_SIZE_LIMIT_BYTES = 1000;

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
    // Count size of _heartbeatsCache after being converted into a base64
    // header string.
    const base64Bytes = countBytes(this._heartbeatsCache);
    // If it exceeds the limit, split out the oldest portion under the
    // limit to return. Put the rest back into _heartbeatsCache.
    let headerString = '';
    if (base64Bytes > HEADER_SIZE_LIMIT_BYTES) {
      const { heartbeatsToSend, heartbeatsToKeep } = splitHeartbeatsCache(
        this._heartbeatsCache,
        HEADER_SIZE_LIMIT_BYTES
      );
      headerString = base64Encode(
        JSON.stringify({ version: 2, heartbeats: heartbeatsToSend })
      );
      // Write the portion not sent back to memory, and then to indexedDB.
      this._heartbeatsCache = heartbeatsToKeep;
      // This is more likely than deleteAll() to cause some mixed up state
      // problems if we don't wait for execution to finish.
      await this._storage.overwrite(this._heartbeatsCache);
    } else {
      // If _heartbeatsCache does not exceed the size limit, send all the
      // data in a header and delete memory and indexedDB caches.
      headerString = base64Encode(
        JSON.stringify({ version: 2, heartbeats: this._heartbeatsCache })
      );
      this._heartbeatsCache = null;
      // Do not wait for this, to reduce latency.
      void this._storage.deleteAll();
    }
    return headerString;
  }
}

function getUTCDateString(): string {
  const today = new Date();
  return today.toISOString().substring(0, 10);
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
