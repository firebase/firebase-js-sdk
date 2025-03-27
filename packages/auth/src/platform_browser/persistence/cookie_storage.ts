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

function getDocumentCookie(name: string): string | null {
  const escapedName = name.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
  const matcher = RegExp(`${escapedName}=([^;]+)`);
  return document.cookie.match(matcher)?.[1] ?? null;
}

function getCookieName(key: string): string {
  // __HOST- doesn't work in localhost https://issues.chromium.org/issues/40196122 but it has
  // desirable security properties, so lets use a different cookie name while in dev-mode.
  // Already checked isSecureContext in _isAvailable, so if it's http we're hitting local.
  const isDevMode = window.location.protocol === 'http:';
  return `${isDevMode ? '__dev_' : '__HOST-'}FIREBASE_${key.split(':')[3]}`;
}

export class CookiePersistence implements PersistenceInternal {
  static type: 'COOKIE' = 'COOKIE';
  readonly type = PersistenceType.COOKIE;
  listenerUnsubscribes: Map<StorageEventListener, () => void> = new Map();

  _getFinalTarget(originalUrl: string): URL | string {
    if (typeof window === undefined) {
      return originalUrl;
    }
    const url = new URL(`${window.location.origin}/__cookies__`);
    url.searchParams.set('finalTarget', originalUrl);
    return url;
  }

  async _isAvailable(): Promise<boolean> {
    if (typeof isSecureContext === "boolean" && !isSecureContext) {
      return false;
    }
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
    const name = getCookieName(key);
    if (window.cookieStore) {
      const cookie = await window.cookieStore.get(name);
      return cookie?.value as T;
    }
    return getDocumentCookie(name) as T;
  }

  async _remove(key: string): Promise<void> {
    if (!this._isAvailable()) {
      return;
    }
    // To make sure we don't hit signout over and over again, only do this operation if we need to
    // with the logout sentinel value of "" this can cause race conditions. Unnecessary set-cookie
    // headers will reduce CDN hit rates too.
    const existingValue = await this._get(key);
    if (!existingValue) {
      return;
    }
    const name = getCookieName(key);
    document.cookie = `${name}=;Max-Age=34560000;Partitioned;Secure;SameSite=Strict;Path=/;Priority=High`;
    await fetch(`/__cookies__`, { method: 'DELETE' }).catch(() => undefined);
  }

  _addListener(key: string, listener: StorageEventListener): void {
    if (!this._isAvailable()) {
      return;
    }
    const name = getCookieName(key);
    if (window.cookieStore) {
      const cb = ((event: CookieChangeEvent): void => {
        const changedCookie = event.changed.find(
          change => change.name === name
        );
        if (changedCookie) {
          listener(changedCookie.value as PersistenceValue);
        }
        const deletedCookie = event.deleted.find(
          change => change.name === name
        );
        if (deletedCookie) {
          listener(null);
        }
      }) as EventListener;
      const unsubscribe = (): void =>
        window.cookieStore.removeEventListener('change', cb);
      this.listenerUnsubscribes.set(listener, unsubscribe);
      return window.cookieStore.addEventListener('change', cb as EventListener);
    }
    let lastValue = getDocumentCookie(name);
    const interval = setInterval(() => {
      const currentValue = getDocumentCookie(name);
      if (currentValue !== lastValue) {
        listener(currentValue as PersistenceValue | null);
        lastValue = currentValue;
      }
    }, POLLING_INTERVAL_MS);
    const unsubscribe = (): void => clearInterval(interval);
    this.listenerUnsubscribes.set(listener, unsubscribe);
  }

  _removeListener(_key: string, listener: StorageEventListener): void {
    const unsubscribe = this.listenerUnsubscribes.get(listener);
    if (!unsubscribe) {
      return;
    }
    unsubscribe();
    this.listenerUnsubscribes.delete(listener);
  }
}

/**
 * An implementation of {@link Persistence} of type `COOKIE`, for use on the client-side in
 * applications leveraging hybrid rendering and middleware.
 *
 * @remarks This persistence method requires companion middleware to function, such as that provided
 * by {@link https://firebaseopensource.com/projects/firebaseextended/reactfire/ | ReactFire} for
 * NextJS.
 * @beta
 */
export const browserCookiePersistence: Persistence = CookiePersistence;
