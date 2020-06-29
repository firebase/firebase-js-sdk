/**
 * @license
 * Copyright 2018 Google LLC
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

import { debugAssert, fail } from '../../src/util/assert';
import { DocumentLike, WindowLike } from '../../src/util/types';

/* eslint-disable no-restricted-globals */

/**
 * `Window` fake that implements the event and storage API that is used by
 * Firestore.
 */
export class FakeWindow implements WindowLike {
  private readonly fakeStorageArea: Storage;
  private readonly fakeIndexedDb: IDBFactory | null;

  private storageListeners: EventListener[] = [];

  constructor(
    sharedFakeStorage: SharedFakeWebStorage,
    fakeIndexedDb?: IDBFactory
  ) {
    this.fakeStorageArea = sharedFakeStorage.getStorageArea(event => {
      for (const listener of this.storageListeners) {
        listener(event);
      }
    });
    this.fakeIndexedDb =
      fakeIndexedDb ||
      (typeof window !== 'undefined' && window.indexedDB) ||
      null;
  }

  get localStorage(): Storage {
    return this.fakeStorageArea;
  }

  get indexedDB(): IDBFactory | null {
    return this.fakeIndexedDb;
  }

  addEventListener(type: string, listener: EventListener): void {
    switch (type) {
      case 'storage':
        this.storageListeners.push(listener);
        break;
      case 'unload':
      case 'visibilitychange':
        // The spec tests currently do not rely on `unload`/`visibilitychange`
        // listeners.
        break;
      default:
        fail(`MockWindow doesn't support events of type '${type}'`);
    }
  }

  removeEventListener(type: string, listener: EventListener): void {
    if (type === 'storage') {
      const oldCount = this.storageListeners.length;
      this.storageListeners = this.storageListeners.filter(
        registeredListener => listener !== registeredListener
      );
      const newCount = this.storageListeners.length;
      debugAssert(
        newCount === oldCount - 1,
        "Listener passed to 'removeEventListener' doesn't match any registered listener."
      );
    }
  }
}

export function testWindow(
  sharedWebStorage = new SharedFakeWebStorage()
): FakeWindow {
  return new FakeWindow(sharedWebStorage);
}

/**
 * `Document` fake that implements the `visibilitychange` API used by Firestore.
 */
export class FakeDocument implements DocumentLike {
  private _visibilityState: VisibilityState = 'hidden';
  private visibilityListener: EventListener | null = null;

  get visibilityState(): VisibilityState {
    return this._visibilityState;
  }

  addEventListener(type: string, listener: EventListener): void {
    debugAssert(
      type === 'visibilitychange',
      "FakeDocument only supports events of type 'visibilitychange'"
    );
    this.visibilityListener = listener;
  }

  removeEventListener(type: string, listener: EventListener): void {
    if (listener === this.visibilityListener) {
      this.visibilityListener = null;
    }
  }

  raiseVisibilityEvent(visibility: VisibilityState): void {
    this._visibilityState = visibility;
    if (this.visibilityListener) {
      this.visibilityListener(new Event('visibilitychange'));
    }
  }
}

export function testDocument(): FakeDocument {
  return new FakeDocument();
}

/**
 * `WebStorage` mock that implements the WebStorage behavior for multiple
 * clients. To get a client-specific storage area that implements the WebStorage
 * API, invoke `getStorageArea(storageListener)`.
 */
export class SharedFakeWebStorage {
  private readonly data = new Map<string, string>();
  private readonly activeClients: Array<{
    storageListener: EventListener;
    storageArea: Storage;
  }> = [];

  getStorageArea(storageListener: EventListener): Storage {
    const clientIndex = this.activeClients.length;
    const self = this;

    const storageArea: Storage = {
      get length(): number {
        return self.length;
      },
      getItem: (key: string) => this.getItem(key),
      key: (index: number) => this.key(index),
      clear: () => this.clear(),
      removeItem: (key: string) => {
        const oldValue = this.getItem(key);
        this.removeItem(key);
        this.raiseStorageEvent(clientIndex, key, oldValue, null);
      },
      setItem: (key: string, value: string) => {
        const oldValue = this.getItem(key);
        this.setItem(key, value);
        this.raiseStorageEvent(clientIndex, key, oldValue, value);
      }
    };

    this.activeClients[clientIndex] = { storageListener, storageArea };

    return storageArea;
  }

  private clear(): void {
    this.data.clear();
  }

  private getItem(key: string): string | null {
    return this.data.has(key) ? this.data.get(key)! : null;
  }

  private key(index: number): string | null {
    const key = Array.from(this.data.keys())[index];
    return key !== undefined ? key : null;
  }

  private removeItem(key: string): void {
    this.data.delete(key);
  }

  private setItem(key: string, data: string): void {
    this.data.set(key, data);
  }

  private get length(): number {
    return this.data.size;
  }

  private raiseStorageEvent(
    sourceClientIndex: number,
    key: string,
    oldValue: string | null,
    newValue: string | null
  ): void {
    this.activeClients.forEach((client, index) => {
      // WebStorage doesn't raise events for writes from the originating client.
      if (sourceClientIndex === index) {
        return;
      }

      client.storageListener({
        key,
        oldValue,
        newValue,
        storageArea: client.storageArea
      } as any); /* eslint-disable-line @typescript-eslint/no-explicit-any*/ // Not mocking entire Event type.
    });
  }
}
