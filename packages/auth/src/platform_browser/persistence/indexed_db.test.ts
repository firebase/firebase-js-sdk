/**
 * @license
 * Copyright 2026 Google LLC
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

import { FakeServiceWorker } from '../../../test/helpers/fake_service_worker';
import { testAuth, testUser } from '../../../test/helpers/mock_auth';
import { PersistenceInternal, PersistenceType } from '../../core/persistence';
import {
  SingletonInstantiator,
  _getInstance
} from '../../core/util/instantiator';
import {
  _EventType,
  KeyChangedRequest,
  _TimeoutDuration
} from '../messagechannel/index';
import { Receiver } from '../messagechannel/receiver';
import { Sender } from '../messagechannel/sender';
import * as workerUtil from '../util/worker';
import {
  _deleteObject,
  indexedDBLocalPersistence,
  _clearDatabase,
  _openDatabase,
  _POLLING_INTERVAL_MS,
  _TRANSACTION_RETRY_COUNT,
  _putObject
} from './indexed_db';
import { MockInstance } from 'vitest';

vi.mock('../util/worker', { spy: true });

interface TestPersistence extends PersistenceInternal {
  _workerInitializationPromise: Promise<void>;
}

describe('platform_browser/persistence/indexed_db', () => {
  const persistence: PersistenceInternal = _getInstance(
    indexedDBLocalPersistence
  );

  beforeEach(() => {
    (persistence as any).dbPromise = null;
    (persistence as any).listeners = {};
    (persistence as any).localCache = {};
    (persistence as any).pendingWrites = 0;
    (persistence as any).stopPolling();
  });

  afterEach(() => {
    (persistence as any).stopPolling();
    sinon.restore();
    vi.restoreAllMocks();
  });

  async function waitUntilPoll(clock: sinon.SinonFakeTimers): Promise<void> {
    clock.tick(_POLLING_INTERVAL_MS + 1);
    clock.restore();
    // Wait a little for the poll operation to complete
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  it('should work with persistence type', async () => {
    const key = 'my-super-special-persistence-type';
    const value = PersistenceType.LOCAL;
    expect(await persistence._get(key)).toBeNull();
    await persistence._set(key, value);
    expect(await persistence._get(key)).toBe(value);
    expect(await persistence._get('other-key')).toBeNull();
    await persistence._remove(key);
    expect(await persistence._get(key)).toBeNull();
  });

  it('should return blobified user value', async () => {
    const key = 'my-super-special-user';
    const auth = await testAuth();
    const value = testUser(auth, 'some-uid');

    expect(await persistence._get(key)).toBeNull();
    await persistence._set(key, value.toJSON());
    const out = await persistence._get(key);
    expect(out).toEqual(value.toJSON());
    await persistence._remove(key);
    expect(await persistence._get(key)).toBeNull();
  });

  describe('#isAvailable', () => {
    it('should return true if db is available', async () => {
      expect(await persistence._isAvailable()).toBe(true);
    });

    it('should return false if db creation errors repeatedly', async () => {
      (persistence as any).dbPromise = null;
      vi.spyOn(indexedDB, 'open').mockReturnValue({
        addEventListener(evt: string, cb: () => void) {
          if (evt === 'error') {
            cb();
          }
        },
        error: new DOMException('yes there was an error')
      } as any);

      expect(await persistence._isAvailable()).toBe(false);
      expect((indexedDB.open as MockInstance).mock.calls.length).toBe(
        _TRANSACTION_RETRY_COUNT + 2
      );
    });

    it('should retry if db creation errors temporarily and then succeed', async () => {
      (persistence as any).dbPromise = null;
      const originalOpen = indexedDB.open.bind(indexedDB);
      let errorsToThrow = 2;

      vi.spyOn(indexedDB, 'open').mockImplementation(((
        name: string,
        version?: number
      ) => {
        if (errorsToThrow > 0) {
          errorsToThrow--;
          return {
            addEventListener(evt: string, cb: () => void) {
              if (evt === 'error') {
                cb();
              }
            },
            error: new DOMException('temporary error')
          } as any;
        }
        return originalOpen(name, version);
      }) as typeof indexedDB.open);

      expect(await persistence._isAvailable()).toBe(true);
      expect((indexedDB.open as MockInstance).mock.calls.length).toBe(3);
    });
  });

  describe('#addEventListener', () => {
    let clock: sinon.SinonFakeTimers;
    const key = 'my-key';
    const newValue = 'new-value';
    let callback: MockInstance;
    let db: IDBDatabase;

    beforeAll(async () => {
      db = await _openDatabase();
    });

    afterAll(async () => {
      db.close();
    });

    beforeEach(async () => {
      clock = sinon.useFakeTimers();
      callback = vi.fn();
      persistence._addListener(key, callback);
    });

    afterEach(async () => {
      persistence._removeListener(key, callback);
      await _clearDatabase(db);
      clock.restore();
    });

    it('should not trigger a listener when there are no changes', async () => {
      await waitUntilPoll(clock);
      expect(callback).not.toHaveBeenCalled();
    });

    it('should trigger a listener when the key changes', async () => {
      await persistence._get(key); // Ensure cache is populated before change
      await _putObject(db, key, newValue);

      await waitUntilPoll(clock);

      expect(callback).toHaveBeenCalledWith(newValue);
    });

    it('should trigger the listener when the key is removed', async () => {
      await _putObject(db, key, newValue);
      await waitUntilPoll(clock);
      callback.mockClear();

      await _deleteObject(db, key);

      await waitUntilPoll(clock);

      expect(callback).toHaveBeenCalledExactlyOnceWith(null);
    });

    it('should not trigger the listener when a different key changes', async () => {
      await persistence._get(key); // Ensure cache is populated
      await _putObject(db, 'other-key', newValue);

      await waitUntilPoll(clock);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should not trigger if a write is pending', async () => {
      await persistence._get(key); // Ensure cache is populated
      await _putObject(db, key, newValue);
      (persistence as any)['pendingWrites'] = 1;

      await waitUntilPoll(clock);

      expect(callback).not.toHaveBeenCalled();
      (persistence as any)['pendingWrites'] = 0;
    });

    describe('with multiple listeners', () => {
      let otherCallback: MockInstance;

      beforeEach(() => {
        otherCallback = vi.fn();
        persistence._addListener(key, otherCallback);
      });

      afterEach(() => {
        persistence._removeListener(key, otherCallback);
      });

      it('should trigger both listeners if multiple listeners are registered', async () => {
        await persistence._get(key); // Ensure cache is populated
        await _putObject(db, key, newValue);

        await waitUntilPoll(clock);

        expect(callback).toHaveBeenCalledWith(newValue);
        expect(otherCallback).toHaveBeenCalledWith(newValue);
      });
    });
  });

  describe('service worker integration', () => {
    let serviceWorker: ServiceWorker;
    let persistence: TestPersistence;

    beforeEach(() => {
      serviceWorker = new FakeServiceWorker() as unknown as ServiceWorker;
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    describe('as a service worker', () => {
      let sender: Sender;
      let db: IDBDatabase;

      beforeEach(async () => {
        sender = new Sender(serviceWorker);
        vi.spyOn(workerUtil, '_isWorker').mockReturnValue(true);
        vi.spyOn(workerUtil, '_getWorkerGlobalScope').mockReturnValue(
          serviceWorker
        );
        persistence = new (
          indexedDBLocalPersistence as unknown as SingletonInstantiator<TestPersistence>
        )();
        db = await _openDatabase();
      });

      it('should respond to pings', async () => {
        await persistence._workerInitializationPromise;
        const response = await sender._send(
          _EventType.PING,
          {},
          _TimeoutDuration.ACK
        );

        expect(response).to.have.deep.members([
          {
            fulfilled: true,
            value: [_EventType.KEY_CHANGED]
          }
        ]);
      });

      it('should let us know if the key didnt actually change on a key changed event', async () => {
        await persistence._workerInitializationPromise;
        const response = await sender._send(
          _EventType.KEY_CHANGED,
          {
            key: 'foo'
          },
          _TimeoutDuration.LONG_ACK
        );

        expect(response).to.have.deep.members([
          {
            fulfilled: true,
            value: {
              keyProcessed: false
            }
          }
        ]);
      });

      it('should refresh on key changed events when a key has changed', async () => {
        await persistence._workerInitializationPromise;
        await _putObject(db, 'foo', 'bar');
        const response = await sender._send(
          _EventType.KEY_CHANGED,
          {
            key: 'foo'
          },
          _TimeoutDuration.LONG_ACK
        );

        expect(response).to.have.deep.members([
          {
            fulfilled: true,
            value: {
              keyProcessed: true
            }
          }
        ]);
      });
    });

    describe('as a service worker controller', () => {
      let receiver: Receiver;

      beforeEach(() => {
        receiver = Receiver._getInstance(serviceWorker);
        vi.spyOn(workerUtil, '_isWorker').mockReturnValue(false);
        vi.spyOn(workerUtil, '_getActiveServiceWorker').mockResolvedValue(
          serviceWorker
        );
        vi.spyOn(workerUtil, '_getServiceWorkerController').mockReturnValue(
          serviceWorker
        );
        persistence = new (
          indexedDBLocalPersistence as unknown as SingletonInstantiator<TestPersistence>
        )();
      });

      it('should send a ping on init', async () => {
        return new Promise<void>(resolve => {
          receiver._subscribe(_EventType.PING, () => {
            resolve();
            return [_EventType.KEY_CHANGED];
          });
          persistence = new (
            indexedDBLocalPersistence as unknown as SingletonInstantiator<TestPersistence>
          )();
        });
      });

      it('should send a key changed event when a key is set', async () => {
        return new Promise(async resolve => {
          await persistence._workerInitializationPromise;
          const handler = (
            _origin: string,
            data: KeyChangedRequest
          ): { keyProcessed: boolean } => {
            expect(data.key).toBe('foo');
            receiver._unsubscribe(_EventType.KEY_CHANGED, handler);
            resolve();
            return {
              keyProcessed: true
            };
          };
          receiver._subscribe(_EventType.KEY_CHANGED, handler);
          return persistence._set('foo', 'bar');
        });
      });

      it('should send a key changed event when a key is removed', async () => {
        return new Promise(async resolve => {
          const handler = async (
            _origin: string,
            data: KeyChangedRequest
          ): Promise<{ keyProcessed: boolean }> => {
            expect(data.key).toBe('foo');
            const persistedValue = await persistence
              ._get('foo')
              .catch(() => null);
            if (!persistedValue) {
              receiver._unsubscribe(_EventType.KEY_CHANGED, handler);
              resolve();
            }
            return {
              keyProcessed: true
            };
          };
          receiver._subscribe(_EventType.KEY_CHANGED, handler);
          await persistence._workerInitializationPromise;
          await persistence._set('foo', 'bar');
          return persistence._remove('foo');
        });
      });
    });
  });

  describe('closed IndexedDB connection', () => {
    it('should retry by reopening the connection', async () => {
      const closeDb = async (): Promise<void> => {
        const db = await (
          persistence as unknown as {
            _openDb(): Promise<IDBDatabase>;
          }
        )._openDb();
        db.close();
      };
      const key = 'my-super-special-persistence-type';
      const value = PersistenceType.LOCAL;

      expect(await persistence._get(key)).toBeNull();

      await closeDb();
      await persistence._set(key, value);

      await closeDb();
      expect(await persistence._get(key)).toBe(value);

      await closeDb();
      await persistence._remove(key);
      expect(await persistence._get(key)).toBeNull();
    });
  });

  describe('page lifecycle events', () => {
    let clock: sinon.SinonFakeTimers;
    const key = 'my-key';
    const value = 'my-value';
    let callback: MockInstance;
    let db: IDBDatabase;

    beforeAll(async () => {
      db = await _openDatabase();
    });

    afterAll(async () => {
      db.close();
    });

    beforeEach(async () => {
      clock = sinon.useFakeTimers();
      callback = vi.fn();
      // Ensure we start fresh
      (persistence as any).isClosing = false;
      (persistence as any).dbPromise = null;
    });

    afterEach(() => {
      persistence._removeListener(key, callback);
      (persistence as any).stopPolling();
      clock.restore();
      vi.restoreAllMocks();
    });

    it('should register event listeners when first listener is added and unregister when last is removed', () => {
      const addSpy = vi.spyOn(window, 'addEventListener');
      const removeSpy = vi.spyOn(window, 'removeEventListener');
      const docAddSpy = vi.spyOn(document, 'addEventListener');

      persistence._addListener(key, callback);
      expect(addSpy).toHaveBeenCalledWith('pagehide', expect.anything());
      expect(addSpy).toHaveBeenCalledWith('pageshow', expect.anything());
      expect(docAddSpy).not.toHaveBeenCalledWith(
        'visibilitychange',
        expect.anything()
      );

      persistence._removeListener(key, callback);
      expect(removeSpy).toHaveBeenCalledWith('pagehide', expect.anything());
      expect(removeSpy).toHaveBeenCalledWith('pageshow', expect.anything());
    });

    it('should pause polling and close DB on pagehide, and resume on pageshow', async () => {
      persistence._addListener(key, callback);
      await persistence._set(key, value);

      // Trigger pagehide
      window.dispatchEvent(new Event('pagehide'));
      expect((persistence as any).isClosing).toBe(true);
      expect((persistence as any).pollTimer).toBeNull();
      expect((persistence as any).dbPromise).toBeNull();

      // Ensure polling doesn't run even if clock ticks
      callback.mockClear();
      clock.tick(_POLLING_INTERVAL_MS + 1);
      expect(callback).not.toHaveBeenCalled();

      // Trigger pageshow
      window.dispatchEvent(new Event('pageshow'));
      expect((persistence as any).isClosing).toBe(false);
      expect((persistence as any).pollTimer).not.toBeNull();

      // Modify DB in background, ensure polling picks it up after pageshow
      await _putObject(db, key, 'new-value');
      await waitUntilPoll(clock);
      expect(callback).toHaveBeenCalledWith('new-value');
    });

    it('should not close DB or set isClosing on visibilitychange', async () => {
      persistence._addListener(key, callback);
      await persistence._set(key, value);

      // Mock document.visibilityState to 'hidden' and dispatch visibilitychange
      vi.spyOn(Document.prototype, 'visibilityState', 'get').mockReturnValue(
        'hidden'
      );
      document.dispatchEvent(new Event('visibilitychange'));

      expect((persistence as any).isClosing).toBe(false);
      expect((persistence as any).pollTimer).not.toBeNull();

      // Persistence writes should continue to succeed while document is hidden
      await persistence._set(key, 'another-value');
      expect(await persistence._get(key)).toBe('another-value');
    });

    it('should allow _openDb() to resolve and open database even when isClosing is true', async () => {
      (persistence as any).isClosing = true;
      const openedDb = await (
        persistence as unknown as {
          _openDb(): Promise<IDBDatabase>;
        }
      )._openDb();
      expect(openedDb).toBeTruthy();
      openedDb.close();
    });

    it('should allow persistence operations to succeed after pagehide', async () => {
      persistence._addListener(key, callback);
      await persistence._set(key, value);
      window.dispatchEvent(new Event('pagehide'));
      expect((persistence as any).isClosing).toBe(true);

      // Persistence operations should succeed by reopening connection
      await persistence._set(key, 'value-after-pagehide');
      expect(await persistence._get(key)).toBe('value-after-pagehide');
      await persistence._remove(key);
      expect(await persistence._get(key)).toBeNull();
    });

    it('should discard in-flight poll results if pagehide occurs before poll completes', async () => {
      // 1. Seed local cache and listener
      await persistence._set(key, value);
      persistence._addListener(key, callback);
      callback.mockClear();

      // 2. Intercept the _withRetries / getAll call to trigger pagehide before it resolves
      const originalWithRetries = (persistence as any)._withRetries.bind(
        persistence
      );
      vi.spyOn(persistence as any, '_withRetries').mockImplementation(
        async op => {
          // Dispatch pagehide before the operation completes
          window.dispatchEvent(new Event('pagehide'));
          return originalWithRetries(op);
        }
      );

      // 3. Trigger a manual poll (or wait for the timer)
      await (persistence as any)._poll();

      // 4. Assert that the listener was NOT notified with null (sign-out prevented)
      expect(callback).not.toHaveBeenCalledWith(null);
    });
  });
});
