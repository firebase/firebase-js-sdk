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
import { FirebaseApp } from '../dist/app/src';
import {
  deleteHeartbeatsFromIndexedDB,
  readHeartbeatsFromIndexedDB,
  writeHeartbeatsToIndexedDB
} from './indexeddb';
import {
  HeartbeatsByUserAgent,
  HeartbeatService,
  HeartbeatStorage
} from './types';

export class HeartbeatServiceImpl implements HeartbeatService {
  storage: HeartbeatStorageImpl;
  heartbeatsCache: HeartbeatsByUserAgent[] | null = null;
  heartbeatsCachePromise: Promise<HeartbeatsByUserAgent[]>;
  constructor(private readonly container: ComponentContainer) {
    const app = this.container.getProvider('app').getImmediate();
    this.storage = new HeartbeatStorageImpl(app);
    this.heartbeatsCachePromise = this.storage
      .read()
      .then(result => (this.heartbeatsCache = result));
  }
  async triggerHeartbeat(): Promise<void> {
    const platformLogger = this.container
      .getProvider('platform-logger')
      .getImmediate();
    const userAgent = platformLogger.getPlatformInfoString();
    const date = getDateString();
    if (!this.heartbeatsCache) {
      await this.heartbeatsCachePromise;
    }
    let heartbeatsEntry = this.heartbeatsCache!.find(
      heartbeats => heartbeats.userAgent === userAgent
    );
    if (heartbeatsEntry) {
      if (heartbeatsEntry.dates.includes(date)) {
        return;
      } else {
        heartbeatsEntry.dates.push(date);
      }
    } else {
      heartbeatsEntry = {
        userAgent,
        dates: [date]
      };
    }
    return this.storage.overwrite([]);
  }
  async getHeartbeatsHeader(): Promise<string> {
    if (!this.heartbeatsCache) {
      await this.heartbeatsCachePromise;
    }
    return base64Encode(JSON.stringify(this.heartbeatsCache!));
  }
}

function getDateString(): string {
  const today = new Date();
  const yearString = today.getFullYear().toString();
  const month = today.getMonth() + 1;
  const monthString = month < 10 ? '0' + month : month.toString();
  const date = today.getDate();
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
