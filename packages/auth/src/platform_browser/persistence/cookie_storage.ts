/**
 * @license
 * Copyright 2025 Google LLC
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
import type { CookieChangeEvent } from 'cookie-store';

const POLLING_INTERVAL_MS = 1_000;

import {
  PersistenceInternal,
  PersistenceType,
  PersistenceValue,
  StorageEventListener
} from '../../core/persistence';

const getDocumentCookie = (name: string): string | null => {
  const escapedName = name.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
  const matcher = RegExp(`${escapedName}=([^;]+)`);
  return document.cookie.match(matcher)?.[1] ?? null;
};

export class CookiePersistence implements PersistenceInternal {
  static type: 'COOKIE' = 'COOKIE';
  readonly type = PersistenceType.COOKIE;
  cookieStoreListeners: Map<
    StorageEventListener,
    (event: CookieChangeEvent) => void
  > = new Map();
  cookiePollingIntervals: Map<StorageEventListener, NodeJS.Timeout> = new Map();

  async _isAvailable(): Promise<boolean> {
    if (typeof navigator === 'undefined' || typeof document === 'undefined') {
      return false;
    }
    return navigator.cookieEnabled ?? true;
  }

  async _set(_key: string, _value: PersistenceValue): Promise<void> {
    return;
  }

  async _get<T extends PersistenceValue>(key: string): Promise<T | null> {
    if (!this._isAvailable()) {
      return null;
    }
    if (window.cookieStore) {
      const cookie = await window.cookieStore.get(key);
      return cookie?.value as T;
    } else {
      return getDocumentCookie(key) as T;
    }
  }

  async _remove(key: string): Promise<void> {
    if (!this._isAvailable()) {
      return;
    }
    if (window.cookieStore) {
      const cookie = await window.cookieStore.get(key);
      if (!cookie) {
        return;
      }
      await window.cookieStore.delete(cookie);
    } else {
      // TODO how do I get the cookie properties?
      document.cookie = `${key}=;Max-Age=34560000;Partitioned;Secure;SameSite=Strict;Path=/`;
    }
    await fetch(`/__cookies__`, { method: 'DELETE' }).catch(() => undefined);
  }

  _addListener(key: string, listener: StorageEventListener): void {
    if (!this._isAvailable()) {
      return;
    }
    if (window.cookieStore) {
      const cb = (event: CookieChangeEvent): void => {
        const changedCookie = event.changed.find(change => change.name === key);
        if (changedCookie) {
          listener(changedCookie.value as PersistenceValue);
        }
        const deletedCookie = event.deleted.find(change => change.name === key);
        if (deletedCookie) {
          listener(null);
        }
      };
      this.cookieStoreListeners.set(listener, cb);
      window.cookieStore.addEventListener('change', cb as EventListener);
    } else {
      let lastValue = getDocumentCookie(key);
      const interval = setInterval(() => {
        const currentValue = getDocumentCookie(key);
        if (currentValue !== lastValue) {
          listener(currentValue as PersistenceValue | null);
          lastValue = currentValue;
        }
      }, POLLING_INTERVAL_MS);
      this.cookiePollingIntervals.set(listener, interval);
    }
  }

  // TODO can we tidy this logic up into a single unsubscribe function? () => void;
  _removeListener(_key: string, listener: StorageEventListener): void {
    if (!this._isAvailable()) {
      return;
    }
    if (window.cookieStore) {
      const cb = this.cookieStoreListeners.get(listener);
      if (!cb) {
        return;
      }
      window.cookieStore.removeEventListener('change', cb as EventListener);
      this.cookieStoreListeners.delete(listener);
    } else {
      const interval = this.cookiePollingIntervals.get(listener);
      if (!interval) {
        return;
      }
      clearInterval(interval);
      this.cookiePollingIntervals.delete(listener);
    }
  }
}

/**
 * An implementation of {@link Persistence} of type 'COOKIE'.
 *
 * @public
 */
export const cookiePersistence: Persistence = CookiePersistence;
