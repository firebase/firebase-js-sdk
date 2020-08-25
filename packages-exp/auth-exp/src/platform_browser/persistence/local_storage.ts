/**
 * @license
 * Copyright 2020 Google LLC
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

import * as externs from '@firebase/auth-types-exp';

import { getUA } from '@firebase/util';
import {
  _isSafari,
  _isIOS,
  _isIframe,
  _isMobileBrowser,
  _isIE10
} from '../../core/util/browser';
import {
  Persistence,
  PersistenceType,
  StorageEventListener
} from '../../core/persistence';
import { BrowserPersistenceClass } from './browser';

function _iframeCannotSyncWebStorage(): boolean {
  const ua = getUA();
  return _isSafari(ua) || _isIOS(ua);
}

// The polling period in case events are not supported
export const _POLLING_INTERVAL_MS = 1000;

// The IE 10 localStorage cross tab synchronization delay in milliseconds
const IE10_LOCAL_STORAGE_SYNC_DELAY = 10;

class BrowserLocalPersistence extends BrowserPersistenceClass
  implements Persistence {
  static type: 'LOCAL' = 'LOCAL';

  constructor() {
    super(localStorage, PersistenceType.LOCAL);
  }

  private readonly listeners: Record<string, Set<StorageEventListener>> = {};
  private readonly localCache: Record<string, string | null> = {};
  // setTimeout return value is platform specific
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private pollTimer: any | null = null;

  // Safari or iOS browser and embedded in an iframe.
  private readonly safariLocalStorageNotSynced =
    _iframeCannotSyncWebStorage() && _isIframe();
  // Whether to use polling instead of depending on window events
  private readonly fallbackToPolling = _isMobileBrowser();

  private forAllChangedKeys(
    cb: (key: string, oldValue: string | null, newValue: string | null) => void
  ): void {
    // Check all keys with listeners on them.
    for (const key of Object.keys(this.listeners)) {
      // Get value from localStorage.
      const newValue = this.storage.getItem(key);
      const oldValue = this.localCache[key];
      // If local map value does not match, trigger listener with storage event.
      // Differentiate this simulated event from the real storage event.
      if (newValue !== oldValue) {
        cb(key, oldValue, newValue);
      }
    }
  }

  private onStorageEvent(event: StorageEvent, poll: boolean = false): void {
    // Key would be null in some situations, like when localStorage is cleared
    if (!event.key) {
      this.forAllChangedKeys(
        (key: string, _oldValue: string | null, newValue: string | null) => {
          this.notifyListeners(key, newValue);
        }
      );
      return;
    }

    const key = event.key;

    // Ignore keys that have no listeners.
    if (!this.listeners[key]) {
      return;
    }

    // Check the mechanism how this event was detected.
    // The first event will dictate the mechanism to be used.
    if (poll) {
      // Environment detects storage changes via polling.
      // Remove storage event listener to prevent possible event duplication.
      this.detachListener();
    } else {
      // Environment detects storage changes via storage event listener.
      // Remove polling listener to prevent possible event duplication.
      this.stopPolling();
    }

    // Safari embedded iframe. Storage event will trigger with the delta
    // changes but no changes will be applied to the iframe localStorage.
    if (this.safariLocalStorageNotSynced) {
      // Get current iframe page value.
      const storedValue = this.storage.getItem(key);
      // Value not synchronized, synchronize manually.
      if (event.newValue !== storedValue) {
        if (event.newValue !== null) {
          // Value changed from current value.
          this.storage.setItem(key, event.newValue);
        } else {
          // Current value deleted.
          this.storage.removeItem(key);
        }
      } else if (this.localCache[key] === event.newValue && !poll) {
        // Already detected and processed, do not trigger listeners again.
        return;
      }
    }

    const triggerListeners = (): void => {
      // Keep local map up to date in case storage event is triggered before
      // poll.
      const storedValue = this.storage.getItem(key);
      if (!poll && this.localCache[key] === storedValue) {
        // Real storage event which has already been detected, do nothing.
        // This seems to trigger in some IE browsers for some reason.
        return;
      }
      this.notifyListeners(key, storedValue);
    };

    const storedValue = this.storage.getItem(key);
    if (
      _isIE10() &&
      storedValue !== event.newValue &&
      event.newValue !== event.oldValue
    ) {
      // IE 10 has this weird bug where a storage event would trigger with the
      // correct key, oldValue and newValue but localStorage.getItem(key) does
      // not yield the updated value until a few milliseconds. This ensures
      // this recovers from that situation.
      setTimeout(triggerListeners, IE10_LOCAL_STORAGE_SYNC_DELAY);
    } else {
      triggerListeners();
    }
  }

  private notifyListeners(key: string, value: string | null): void {
    if (!this.listeners[key]) {
      return;
    }
    this.localCache[key] = value;
    for (const listener of Array.from(this.listeners[key])) {
      listener(value ? JSON.parse(value) : value);
    }
  }

  private startPolling(): void {
    this.stopPolling();

    this.pollTimer = setInterval(() => {
      this.forAllChangedKeys(
        (key: string, oldValue: string | null, newValue: string | null) => {
          this.onStorageEvent(
            new StorageEvent('storage', {
              key,
              oldValue,
              newValue
            }),
            /* poll */ true
          );
        }
      );
    }, _POLLING_INTERVAL_MS);
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private attachListener(): void {
    window.addEventListener('storage', this.onStorageEvent.bind(this));
  }

  private detachListener(): void {
    window.removeEventListener('storage', this.onStorageEvent);
  }

  _addListener(key: string, listener: StorageEventListener): void {
    this.localCache[key] = this.storage.getItem(key);
    if (Object.keys(this.listeners).length === 0) {
      // Whether browser can detect storage event when it had already been pushed to the background.
      // This may happen in some mobile browsers. A localStorage change in the foreground window
      // will not be detected in the background window via the storage event.
      // This was detected in iOS 7.x mobile browsers
      if (this.fallbackToPolling) {
        this.startPolling();
      } else {
        this.attachListener();
      }
    }
    this.listeners[key] = this.listeners[key] || new Set();
    this.listeners[key].add(listener);
  }

  _removeListener(key: string, listener: StorageEventListener): void {
    if (this.listeners[key]) {
      this.listeners[key].delete(listener);

      if (this.listeners[key].size === 0) {
        delete this.listeners[key];
        delete this.localCache[key];
      }
    }

    if (Object.keys(this.listeners).length === 0) {
      this.detachListener();
      this.stopPolling();
    }
  }
}

export const browserLocalPersistence: externs.Persistence = BrowserLocalPersistence;
