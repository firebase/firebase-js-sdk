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
  HeartbeatStorage,
  SingleDateHeartbeat
} from './types';

const MAX_HEADER_BYTES = 1024;
// 30 days
const STORED_HEARTBEAT_RETENTION_MAX_MILLIS = 30 * 24 * 60 * 60 * 1000;

export class HeartbeatServiceImpl implements HeartbeatService {
  /**
   * The persistence layer for heartbeats
   * Leave public for easier testing.
   */
  _storage: HeartbeatStorageImpl;

  /**
   * In-memory cache for heartbeats, used by getHeartbeatsHeader() to generate
   * the header string.
   * Stores one record per date. This will be consolidated into the standard
   * format of one record per user agent string before being sent as a header.
   * Populated from indexedDB when the controller is instantiated and should
   * be kept in sync with indexedDB.
   * Leave public for easier testing.
   */
  _heartbeatsCache: SingleDateHeartbeat[] | null = null;

  /**
   * the initialization promise for populating heartbeatCache.
   * If getHeartbeatsHeader() is called before the promise resolves
   * (hearbeatsCache == null), it should wait for this promise
   * Leave public for easier testing.
   */
  _heartbeatsCachePromise: Promise<SingleDateHeartbeat[]>;
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
      this._heartbeatsCache = await this._heartbeatsCachePromise;
    }
    if (
      this._heartbeatsCache.some(
        singleDateHeartbeat => singleDateHeartbeat.date === date
      )
    ) {
      // Do not store a heartbeat if one is already stored for this day.
      return;
    } else {
      // There is no entry for this date. Create one.
      this._heartbeatsCache.push({ date, userAgent });
    }
    // Remove entries older than 30 days.
    this._heartbeatsCache = this._heartbeatsCache.filter(
      singleDateHeartbeat => {
        const hbTimestamp = new Date(singleDateHeartbeat.date).valueOf();
        const now = Date.now();
        return now - hbTimestamp <= STORED_HEARTBEAT_RETENTION_MAX_MILLIS;
      }
    );
    return this._storage.overwrite(this._heartbeatsCache);
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
    // Extract as many heartbeats from the cache as will fit under the size limit.
    const { heartbeatsToSend, unsentEntries } = extractHeartbeatsForHeader(
      this._heartbeatsCache
    );
    const headerString = base64Encode(
      JSON.stringify({ version: 2, heartbeats: heartbeatsToSend })
    );
    if (unsentEntries.length > 0) {
      // Store any unsent entries if they exist.
      this._heartbeatsCache = unsentEntries;
      // This seems more likely than deleteAll (below) to lead to some odd state
      // since the cache isn't empty and this will be called again on the next request,
      // and is probably safest if we await it.
      await this._storage.overwrite(this._heartbeatsCache);
    } else {
      this._heartbeatsCache = null;
      // Do not wait for this, to reduce latency.
      void this._storage.deleteAll();
    }
    return headerString;
  }
}

function getUTCDateString(): string {
  const today = new Date();
  // Returns date format 'YYYY-MM-DD'
  return today.toISOString().substring(0, 10);
}

export function extractHeartbeatsForHeader(
  heartbeatsCache: SingleDateHeartbeat[],
  maxSize = MAX_HEADER_BYTES
): {
  heartbeatsToSend: HeartbeatsByUserAgent[];
  unsentEntries: SingleDateHeartbeat[];
} {
  // Heartbeats grouped by user agent in the standard format to be sent in
  // the header.
  const heartbeatsToSend: HeartbeatsByUserAgent[] = [];
  // Single date format heartbeats that are not sent.
  let unsentEntries = heartbeatsCache.slice();
  for (const singleDateHeartbeat of heartbeatsCache) {
    // Look for an existing entry with the same user agent.
    const heartbeatEntry = heartbeatsToSend.find(
      hb => hb.userAgent === singleDateHeartbeat.userAgent
    );
    if (!heartbeatEntry) {
      // If no entry for this user agent exists, create one.
      heartbeatsToSend.push({
        userAgent: singleDateHeartbeat.userAgent,
        dates: [singleDateHeartbeat.date]
      });
      if (countBytes(heartbeatsToSend) > maxSize) {
        // If the header would exceed max size, remove the added heartbeat
        // entry and stop adding to the header.
        heartbeatsToSend.pop();
        break;
      }
    } else {
      heartbeatEntry.dates.push(singleDateHeartbeat.date);
      // If the header would exceed max size, remove the added date
      // and stop adding to the header.
      if (countBytes(heartbeatsToSend) > maxSize) {
        heartbeatEntry.dates.pop();
        break;
      }
    }
    // Pop unsent entry from queue. (Skipped if adding the entry exceeded
    // quota and the loop breaks early.)
    unsentEntries = unsentEntries.slice(1);
  }
  return {
    heartbeatsToSend,
    unsentEntries
  };
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
  async read(): Promise<SingleDateHeartbeat[]> {
    const canUseIndexedDB = await this._canUseIndexedDBPromise;
    if (!canUseIndexedDB) {
      return [];
    } else {
      const idbHeartbeatObject = await readHeartbeatsFromIndexedDB(this.app);
      return idbHeartbeatObject?.heartbeats || [];
    }
  }
  // overwrite the storage with the provided heartbeats
  async overwrite(heartbeats: SingleDateHeartbeat[]): Promise<void> {
    const canUseIndexedDB = await this._canUseIndexedDBPromise;
    if (!canUseIndexedDB) {
      return;
    } else {
      return writeHeartbeatsToIndexedDB(this.app, { heartbeats });
    }
  }
  // add heartbeats
  async add(heartbeats: SingleDateHeartbeat[]): Promise<void> {
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
  async delete(heartbeats: SingleDateHeartbeat[]): Promise<void> {
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

/**
 * Calculate bytes of a HeartbeatsByUserAgent array after being wrapped
 * in a platform logging header JSON object, stringified, and converted
 * to base 64.
 */
export function countBytes(heartbeatsCache: HeartbeatsByUserAgent[]): number {
  // base64 has a restricted set of characters, all of which should be 1 byte.
  return base64Encode(
    // heartbeatsCache wrapper properties
    JSON.stringify({ version: 2, heartbeats: heartbeatsCache })
  ).length;
}
