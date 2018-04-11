/**
 * Copyright 2017 Google Inc.
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

import { VapidDetails } from '../interfaces/vapid-details';
import { DBInterface } from './db-interface';
import { ERROR_CODES } from './errors';

const UNCOMPRESSED_PUBLIC_KEY_SIZE = 65;

export class VapidDetailsModel extends DBInterface {
  protected readonly dbName: string = 'fcm_vapid_details_db';
  protected readonly dbVersion: number = 1;
  protected readonly objectStoreName: string = 'fcm_vapid_object_Store';

  protected onDbUpgrade(request: IDBOpenDBRequest): void {
    const db: IDBDatabase = request.result;
    db.createObjectStore(this.objectStoreName, { keyPath: 'swScope' });
  }

  /**
   * Given a service worker scope, this method will look up the vapid key
   * in indexedDB.
   */
  async getVapidFromSWScope(swScope: string): Promise<Uint8Array | undefined> {
    if (typeof swScope !== 'string' || swScope.length === 0) {
      throw this.errorFactory.create(ERROR_CODES.BAD_SCOPE);
    }

    const result = await this.get<VapidDetails>(swScope);
    return result ? result.vapidKey : undefined;
  }

  /**
   * Save a vapid key against a swScope for later date.
   */
  async saveVapidDetails(swScope: string, vapidKey: Uint8Array): Promise<void> {
    if (typeof swScope !== 'string' || swScope.length === 0) {
      throw this.errorFactory.create(ERROR_CODES.BAD_SCOPE);
    }

    if (vapidKey === null || vapidKey.length !== UNCOMPRESSED_PUBLIC_KEY_SIZE) {
      throw this.errorFactory.create(ERROR_CODES.BAD_VAPID_KEY);
    }

    const details: VapidDetails = {
      swScope,
      vapidKey
    };

    return this.put(details);
  }

  /**
   * This method deletes details of the current FCM VAPID key for a SW scope.
   * Resolves once the scope/vapid details have been deleted and returns the
   * deleted vapid key.
   */
  async deleteVapidDetails(swScope: string): Promise<Uint8Array> {
    const vapidKey = await this.getVapidFromSWScope(swScope);
    if (!vapidKey) {
      throw this.errorFactory.create(ERROR_CODES.DELETE_SCOPE_NOT_FOUND);
    }

    await this.delete(swScope);
    return vapidKey;
  }
}
