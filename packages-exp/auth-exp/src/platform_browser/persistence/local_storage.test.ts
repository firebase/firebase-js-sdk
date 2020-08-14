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

import { expect, use } from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { testAuth, testUser } from '../../../test/helpers/mock_auth';
import {
  PersistedBlob,
  Persistence,
  PersistenceType
} from '../../core/persistence';
import { _getInstance } from '../../core/util/instantiator';
import { browserLocalPersistence, POLLING_INTERVAL_MS } from './local_storage';

use(sinonChai);

describe('browserLocalPersistence', () => {
  const persistence: Persistence = _getInstance(browserLocalPersistence);

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => sinon.restore());

  it('should work with persistence type', async () => {
    const key = 'my-super-special-persistence-type';
    const value = PersistenceType.LOCAL;
    expect(await persistence.get(key)).to.be.null;
    await persistence.set(key, value);
    expect(await persistence.get(key)).to.be.eq(value);
    expect(await persistence.get('other-key')).to.be.null;
    await persistence.remove(key);
    expect(await persistence.get(key)).to.be.null;
  });

  it('should return persistedblob from user', async () => {
    const key = 'my-super-special-user';
    const auth = await testAuth();
    const value = testUser(auth, 'some-uid');

    expect(await persistence.get(key)).to.be.null;
    await persistence.set(key, value.toJSON());
    const out = await persistence.get<PersistedBlob>(key);
    expect(out!['uid']).to.eql(value.uid);
    await persistence.remove(key);
    expect(await persistence.get(key)).to.be.null;
  });

  describe('#isAvailable', () => {
    it('should emit false if localStorage setItem throws', async () => {
      sinon.stub(localStorage, 'setItem').throws(new Error('nope'));
      expect(await persistence.isAvailable()).to.be.false;
    });

    it('should emit false if localStorage removeItem throws', async () => {
      sinon.stub(localStorage, 'removeItem').throws(new Error('nope'));
      expect(await persistence.isAvailable()).to.be.false;
    });

    it('should emit true if everything works properly', async () => {
      expect(await persistence.isAvailable()).to.be.true;
    });
  });

  describe('#addEventListener', () => {
    const key = 'my-key';
    const newValue = 'new-value';

    let callback: sinon.SinonSpy;

    beforeEach(() => {
      callback = sinon.spy();
    });

    context('with events', () => {
      beforeEach(() => {
        persistence.addListener(key, callback);
      });

      afterEach(() => {
        persistence.removeListener(key, callback);
      });

      context('with multiple listeners', () => {
        let otherCallback: sinon.SinonSpy;

        beforeEach(() => {
          otherCallback = sinon.spy();
          persistence.addListener(key, otherCallback);
          localStorage.setItem(key, JSON.stringify(newValue));
        });

        afterEach(() => {
          persistence.removeListener(key, otherCallback);
        });

        it('should trigger both listeners if multiple listeners are registered', () => {
          window.dispatchEvent(
            new StorageEvent('storage', {
              key,
              oldValue: null,
              newValue: JSON.stringify(newValue)
            })
          );

          expect(callback).to.have.been.calledWith(newValue);
          expect(otherCallback).to.have.been.calledWith(newValue);
        });
      });

      context('with a change in the underlying storage', () => {
        beforeEach(() => {
          localStorage.setItem(key, JSON.stringify(newValue));
        });

        it('should trigger on storage event for the same key', () => {
          window.dispatchEvent(
            new StorageEvent('storage', {
              key,
              oldValue: null,
              newValue: JSON.stringify(newValue)
            })
          );

          expect(callback).to.have.been.calledWith(newValue);
        });

        it('should not trigger after unsubscribe', () => {
          persistence.removeListener(key, callback);
          window.dispatchEvent(
            new StorageEvent('storage', {
              key,
              oldValue: null,
              newValue: JSON.stringify(newValue)
            })
          );

          expect(callback).not.to.have.been.called;
        });

        it('should trigger even if the event had no key', () => {
          window.dispatchEvent(new StorageEvent('storage', {}));

          expect(callback).to.have.been.calledWith(newValue);
        });
      });

      context('without a change in the underlying storage', () => {
        it('should not trigger', () => {
          window.dispatchEvent(
            new StorageEvent('storage', {
              key,
              oldValue: null,
              newValue: JSON.stringify(newValue)
            })
          );

          expect(callback).not.to.have.been.called;
        });

        it('should not trigger on storage event for a different key', () => {
          localStorage.setItem('other-key', JSON.stringify(newValue));
          window.dispatchEvent(
            new StorageEvent('storage', {
              key: 'other-key',
              oldValue: null,
              newValue: JSON.stringify(newValue)
            })
          );

          expect(callback).not.to.have.been.called;
        });

        it('should not trigger if the listener was added after the storage was updated', () => {
          const otherCallback = sinon.spy();
          persistence.addListener(key, otherCallback);

          window.dispatchEvent(
            new StorageEvent('storage', {
              key,
              oldValue: null,
              newValue: JSON.stringify(newValue)
            })
          );

          expect(otherCallback).not.to.have.been.called;
          persistence.removeListener(key, otherCallback);
        });
      });
    });

    context('with polling (mobile browsers)', () => {
      let clock: sinon.SinonFakeTimers;

      beforeEach(() => {
        clock = sinon.useFakeTimers();
        (persistence as any)['fallbackToPolling'] = true;
        persistence.addListener(key, callback);
      });

      afterEach(() => {
        persistence.removeListener(key, callback);
        clock.restore();
      });

      it('should catch persistence changes', async () => {
        localStorage.setItem(key, JSON.stringify(newValue));

        clock.tick(POLLING_INTERVAL_MS + 1);

        expect(callback).to.have.been.calledWith(newValue);
      });

      it('should not trigger twice if event still occurs after poll', async () => {
        localStorage.setItem(key, JSON.stringify(newValue));

        clock.tick(POLLING_INTERVAL_MS + 1);
        window.dispatchEvent(
          new StorageEvent('storage', {
            key,
            oldValue: null,
            newValue: JSON.stringify(newValue)
          })
        );

        expect(callback).to.have.been.calledOnceWith(newValue);
      });

      it('should not trigger twice if poll occurs after event', async () => {
        localStorage.setItem(key, JSON.stringify(newValue));

        window.dispatchEvent(
          new StorageEvent('storage', {
            key,
            oldValue: null,
            newValue: JSON.stringify(newValue)
          })
        );
        clock.tick(POLLING_INTERVAL_MS + 1);

        expect(callback).to.have.been.calledOnceWith(newValue);
      });
    });
  });
});
