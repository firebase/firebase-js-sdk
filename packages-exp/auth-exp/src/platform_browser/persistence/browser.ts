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

import * as externs from '@firebase/auth-types-exp';
import { getUA } from '@firebase/util';

import {
  Persistence,
  PersistenceType,
  PersistenceValue,
  STORAGE_AVAILABLE_KEY,
  StorageEventListener
} from '../../core/persistence';
import {
  _isSafari,
  _isIOS,
  _isIframe,
  _isIE10,
  _isFirefox,
  _isMobileBrowser
} from '../../core/util/browser';

// There are two different browser persistence types: local and session.
// Both have the same implementation but use a different underlying storage
// object. Using class inheritance compiles down to an es5 polyfill, which
// prevents rollup from tree shaking. By making these "methods" free floating
// functions bound to the classes, the two different types can share the
// implementation without subclassing.

interface BrowserPersistenceClass extends Persistence {
  storage: Storage;
}

function isAvailable(this: BrowserPersistenceClass): Promise<boolean> {
  try {
    if (!this.storage) {
      return Promise.resolve(false);
    }
    this.storage.setItem(STORAGE_AVAILABLE_KEY, '1');
    this.storage.removeItem(STORAGE_AVAILABLE_KEY);
    return Promise.resolve(true);
  } catch {
    return Promise.resolve(false);
  }
}

function _iframeCannotSyncWebStorage(): boolean {
  const ua = getUA();
  return _isSafari(ua) || _isIOS(ua);
}

function set(
  this: BrowserPersistenceClass,
  key: string,
  value: PersistenceValue
): Promise<void> {
  this.storage.setItem(key, JSON.stringify(value));
  return Promise.resolve();
}

function get<T extends PersistenceValue>(
  this: BrowserPersistenceClass,
  key: string
): Promise<T | null> {
  const json = this.storage.getItem(key);
  return Promise.resolve(json ? JSON.parse(json) : null);
}

function remove(this: BrowserPersistenceClass, key: string): Promise<void> {
  this.storage.removeItem(key);
  return Promise.resolve();
}

class BrowserLocalPersistence implements BrowserPersistenceClass {
  static type: 'LOCAL' = 'LOCAL';
  type = PersistenceType.LOCAL;
  storage = localStorage;
  isAvailable = isAvailable;

  set = set;
  get = get;
  remove = remove;

  // The polling period in case events are not supported
  private static readonly POLLING_TIMER_INTERVAL = 1000;
  // The IE 10 localStorage cross tab synchronization delay in milliseconds
  private static readonly IE10_LOCAL_STORAGE_SYNC_DELAY = 10;

  private readonly listeners: Record<string, Set<StorageEventListener>> = {};
  private readonly localCache: Record<string, string | null> = {};
  private pollTimer: NodeJS.Timeout | null = null;

  // Safari or iOS browser and embedded in an iframe.
  private readonly safariLocalStorageNotSynced =
    _iframeCannotSyncWebStorage() && _isIframe();

  _forAllChangedKeys(
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
    };
  }

  _onStorageEvent(event: StorageEvent, poll: boolean = false): void {
    // Key would be null in some situations, like when localStorage is cleared
    if (!event.key) {
      this._forAllChangedKeys(
        (key: string, _oldValue: string | null, newValue: string | null) => {
          this._notifyListeners(key, newValue);
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
      this._detachListener();
    } else {
      // Environment detects storage changes via storage event listener.
      // Remove polling listener to prevent possible event duplication.
      this._stopPolling();
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
      this._notifyListeners(key, storedValue);
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
      setTimeout(
        triggerListeners,
        BrowserLocalPersistence.IE10_LOCAL_STORAGE_SYNC_DELAY
      );
    } else {
      triggerListeners();
    }
  }

  _notifyListeners(key: string, value: string | null): void {
    if (!this.listeners[key]) {
      return;
    }
    for (const listener of Array.from(this.listeners[key])) {
      this.localCache[key] = value;
      listener(value ? JSON.parse(value) : value);
    };
  }

  _startPolling(): void {
    this._stopPolling();

    this.pollTimer = setInterval(() => {
      this._forAllChangedKeys(
        (key: string, oldValue: string | null, newValue: string | null) => {
          this._onStorageEvent(
            new StorageEvent('storage', {
              key,
              oldValue,
              newValue
            }),
            /* poll */ true
          );
        }
      );
    }, BrowserLocalPersistence.POLLING_TIMER_INTERVAL);
  }

  _stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  _attachListener(): void {
    window.addEventListener('storage', this._onStorageEvent);
  }

  _detachListener(): void {
    window.removeEventListener('storage', this._onStorageEvent);
  }

  addListener(key: string, listener: StorageEventListener): void {
    this.localCache[key] = this.storage.getItem(key);
    if (Object.keys(this.listeners).length === 0) {
      // Whether browser can detect storage event when it had already been pushed to the background.
      // This may happen in some mobile browsers. A localStorage change in the foreground window
      // will not be detected in the background window via the storage event.
      // This was detected in iOS 7.x mobile browsers
      if (_isMobileBrowser()) {
        this._startPolling();
      } else {
        this._attachListener();
      }
    }
    this.listeners[key] = this.listeners[key] || [];
    this.listeners[key].add(listener);
  }

  removeListener(key: string, listener: StorageEventListener): void {
    if (this.listeners[key]) {
      this.listeners[key].delete(listener);

      if (this.listeners[key].size === 0) {
        delete this.listeners[key];
        delete this.localCache[key];
      }
    }

    if (Object.keys(this.listeners).length === 0) {
      this._detachListener();
      this._stopPolling();
    }
  }
}

class BrowserSessionPersistence implements BrowserPersistenceClass {
  static type: 'SESSION' = 'SESSION';
  type = PersistenceType.SESSION;
  storage = sessionStorage;
  isAvailable = isAvailable;

  set = set;
  get = get;
  remove = remove;

  addListener(_key: string, _listener: StorageEventListener): void {
    // Listeners are not supported for session storage since it cannot be shared across windows
    return;
  }

  removeListener(_key: string, _listener: StorageEventListener): void {
    // Listeners are not supported for session storage since it cannot be shared across windows
    return;
  }
}

export const browserLocalPersistence: externs.Persistence = BrowserLocalPersistence;

export const browserSessionPersistence: externs.Persistence = BrowserSessionPersistence;
