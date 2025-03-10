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

import { Persistence } from '../../model/public_types';

import {
  PersistenceInternal,
  PersistenceType,
  PersistenceValue,
  StorageEventListener
} from '../../core/persistence';

export class CookiePersistence implements PersistenceInternal {
  static type: 'COOKIE' = 'COOKIE';
  readonly type = PersistenceType.COOKIE;
  listeners: Map<StorageEventListener, (e: any) => void> = new Map();

  async _isAvailable(): Promise<boolean> {
    return navigator.hasOwnProperty('cookieEnabled') ?
      navigator.cookieEnabled :
      true;
  }

  async _set(_key: string, _value: PersistenceValue): Promise<void> {
    return;
  }

  async _get<T extends PersistenceValue>(key: string): Promise<T | null> {
    const cookie = await (window as any).cookieStore.get(key);
    return cookie?.value;
  }

  async _remove(key: string): Promise<void> {
    const cookie = await (window as any).cookieStore.get(key);
    if (!cookie) {
      return;
    }
    await (window as any).cookieStore.set({ ...cookie, value: "" });
    await fetch(`/__cookies__`, { method: 'DELETE' }).catch(() => undefined);
  }

  _addListener(_key: string, _listener: StorageEventListener): void {
    // TODO fallback to polling if cookieStore is not available
    const cb = (event: any) => {
      const cookie = event.changed.find((change: any) => change.name === _key);
      if (cookie) {
        _listener(cookie.value);
      }
    };
    this.listeners.set(_listener, cb);
    (window as any).cookieStore.addEventListener('change', cb);
  }

  _removeListener(_key: string, _listener: StorageEventListener): void {
    const cb = this.listeners.get(_listener);
    if (!cb) {
      return;
    }
    (window as any).cookieStore.removeEventListener('change', cb);
  }
}

/**
 * An implementation of {@link Persistence} of type 'NONE'.
 *
 * @public
 */
export const cookiePersistence: Persistence = CookiePersistence;
