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

import { expect, use } from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { FakeServiceWorker } from '../../../test/helpers/fake_service_worker';
import { testAuth, testUser } from '../../../test/helpers/mock_auth';
import { Persistence, PersistenceType } from '../../core/persistence';
import {
  SingletonInstantiator,
  _getInstance
} from '../../core/util/instantiator';
import { EventType, KeyChangedRequest } from '../messagechannel/index';
import { Receiver } from '../messagechannel/receiver';
import { Sender, TimeoutDuration } from '../messagechannel/sender';
import * as workerUtil from '../util/worker';
import {
  indexedDBLocalPersistence,
  _clearDatabase,
  _openDatabase,
  _POLLING_INTERVAL_MS,
  _putObject
} from './indexed_db';

use(sinonChai);

interface TestPersistence extends Persistence {
  _workerInitializationPromise: Promise<void>;
}

describe('platform_browser/persistence/indexed_db', () => {
  const persistence: Persistence = _getInstance(indexedDBLocalPersistence);

  afterEach(sinon.restore);

  async function waitUntilPoll(clock: sinon.SinonFakeTimers): Promise<void> {
    clock.tick(_POLLING_INTERVAL_MS + 1);
    clock.restore();
    // Wait a little for the poll operation to complete
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  it('should work with persistence type', async () => {
    const key = 'my-super-special-persistence-type';
    const value = PersistenceType.LOCAL;
    expect(await persistence._get(key)).to.be.null;
    await persistence._set(key, value);
    expect(await persistence._get(key)).to.be.eq(value);
    expect(await persistence._get('other-key')).to.be.null;
    await persistence._remove(key);
    expect(await persistence._get(key)).to.be.null;
  });

  it('should return blobified user value', async () => {
    const key = 'my-super-special-user';
    const auth = await testAuth();
    const value = testUser(auth, 'some-uid');

    expect(await persistence._get(key)).to.be.null;
    await persistence._set(key, value.toJSON());
    const out = await persistence._get(key);
    expect(out).to.eql(value.toJSON());
    await persistence._remove(key);
    expect(await persistence._get(key)).to.be.null;
  });

  describe('#isAvaliable', () => {
    it('should return true if db is available', async () => {
      expect(await persistence._isAvailable()).to.be.true;
    });

    it('should return false if db creation errors', async () => {
      sinon.stub(indexedDB, 'open').returns({
        addEventListener(evt: string, cb: () => void) {
          if (evt === 'error') {
            cb();
          }
        },
        error: new DOMException('yes there was an error')
      } as any);

      expect(await persistence._isAvailable()).to.be.false;
    });
  });

  describe('#addEventListener', () => {
    let clock: sinon.SinonFakeTimers;
    const key = 'my-key';
    const newValue = 'new-value';
    let callback: sinon.SinonSpy;
    let db: IDBDatabase;

    before(async () => {
      db = await _openDatabase();
    });

    beforeEach(async () => {
      clock = sinon.useFakeTimers();
      callback = sinon.spy();
      persistence._addListener(key, callback);
    });

    afterEach(async () => {
      persistence._removeListener(key, callback);
      await _clearDatabase(db);
      clock.restore();
    });

    it('should trigger a listener when the key changes', async () => {
      await _putObject(db, key, newValue);

      await waitUntilPoll(clock);

      expect(callback).to.have.been.calledWith(newValue);
    });

    it('should not trigger the listener when a different key changes', async () => {
      await _putObject(db, 'other-key', newValue);

      await waitUntilPoll(clock);

      expect(callback).not.to.have.been.called;
    });

    it('should not trigger if a write is pending', async () => {
      await _putObject(db, key, newValue);
      (persistence as any)['pendingWrites'] = 1;

      await waitUntilPoll(clock);

      expect(callback).not.to.have.been.called;
      (persistence as any)['pendingWrites'] = 0;
    });

    context('with multiple listeners', () => {
      let otherCallback: sinon.SinonSpy;

      beforeEach(() => {
        otherCallback = sinon.spy();
        persistence._addListener(key, otherCallback);
      });

      afterEach(() => {
        persistence._removeListener(key, otherCallback);
      });

      it('should trigger both listeners if multiple listeners are registered', async () => {
        await _putObject(db, key, newValue);

        await waitUntilPoll(clock);

        expect(callback).to.have.been.calledWith(newValue);
        expect(otherCallback).to.have.been.calledWith(newValue);
      });
    });
  });

  context('service worker integration', () => {
    let serviceWorker: ServiceWorker;
    let persistence: TestPersistence;

    beforeEach(() => {
      serviceWorker = (new FakeServiceWorker() as unknown) as ServiceWorker;
    });

    afterEach(() => {
      sinon.restore();
    });

    context('as a service worker', () => {
      let sender: Sender;
      let db: IDBDatabase;

      beforeEach(async () => {
        sender = new Sender(serviceWorker);
        sinon.stub(workerUtil, '_isWorker').returns(true);
        sinon.stub(workerUtil, '_getWorkerGlobalScope').returns(serviceWorker);
        persistence = new ((indexedDBLocalPersistence as unknown) as SingletonInstantiator<
          TestPersistence
        >)();
        db = await _openDatabase();
      });

      it('should respond to pings', async () => {
        await persistence._workerInitializationPromise;
        const response = await sender._send(
          EventType.PING,
          {},
          TimeoutDuration.ACK
        );

        expect(response).to.have.deep.members([
          {
            fulfilled: true,
            value: [EventType.KEY_CHANGED]
          }
        ]);
      });

      it('should let us know if the key didnt actually change on a key changed event', async () => {
        await persistence._workerInitializationPromise;
        const response = await sender._send(
          EventType.KEY_CHANGED,
          {
            key: 'foo'
          },
          TimeoutDuration.LONG_ACK
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
          EventType.KEY_CHANGED,
          {
            key: 'foo'
          },
          TimeoutDuration.LONG_ACK
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

    context('as a service worker controller', () => {
      let receiver: Receiver;

      beforeEach(() => {
        receiver = Receiver._getInstance(serviceWorker);
        sinon.stub(workerUtil, '_isWorker').returns(false);
        sinon
          .stub(workerUtil, '_getActiveServiceWorker')
          .returns(Promise.resolve(serviceWorker));
        sinon
          .stub(workerUtil, '_getServiceWorkerController')
          .returns(serviceWorker);
        persistence = new ((indexedDBLocalPersistence as unknown) as SingletonInstantiator<
          TestPersistence
        >)();
      });

      it('should send a ping on init', async () => {
        return new Promise(resolve => {
          receiver._subscribe(EventType.PING, () => {
            resolve();
            return [EventType.KEY_CHANGED];
          });
          return persistence._workerInitializationPromise;
        });
      });

      it('should send a key changed event when a key is set', async () => {
        return new Promise(async resolve => {
          await persistence._workerInitializationPromise;
          receiver._subscribe(
            EventType.KEY_CHANGED,
            (_origin: string, data: KeyChangedRequest) => {
              expect(data.key).to.eq('foo');
              resolve();
              return {
                keyProcessed: true
              };
            }
          );
          return persistence._set('foo', 'bar');
        });
      });

      it('should send a key changed event when a key is removed', async () => {
        return new Promise(async resolve => {
          receiver._subscribe(
            EventType.KEY_CHANGED,
            async (_origin: string, data: KeyChangedRequest) => {
              expect(data.key).to.eq('foo');
              const persistedValue = await persistence._get('foo');
              if (!persistedValue) {
                resolve();
              }
              return {
                keyProcessed: true
              };
            }
          );
          await persistence._workerInitializationPromise;
          await persistence._set('foo', 'bar');
          return persistence._remove('foo');
        });
      });
    });
  });
});
