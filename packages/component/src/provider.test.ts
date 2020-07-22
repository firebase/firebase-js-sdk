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

import { expect } from 'chai';
import { fake, SinonSpy } from 'sinon';
import { ComponentContainer } from './component_container';
import { FirebaseService } from '@firebase/app-types/private';
import { _FirebaseService } from '@firebase/app-types-exp';
import { Provider } from './provider';
import { getFakeApp, getFakeComponent } from '../test/util';
import '../test/setup';
import { InstantiationMode } from './types';

// define the types for the fake services we use in the tests
declare module './types' {
  interface NameServiceMapping {
    test: {};
    badtest: {};
  }
}

describe('Provider', () => {
  let provider: Provider<'test'>;

  beforeEach(() => {
    provider = new Provider('test', new ComponentContainer('test-container'));
  });

  it('throws if setComponent() is called with a component with a different name than the provider name', () => {
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      provider.setComponent(getFakeComponent('badtest', () => ({})) as any)
    ).to.throw(/^Mismatching Component/);
    expect(() =>
      provider.setComponent(getFakeComponent('test', () => ({})))
    ).to.not.throw();
  });

  it('does not throw if instance factory throws when calling getImmediate() with optional flag', () => {
    provider.setComponent(
      getFakeComponent('test', () => {
        throw Error('something went wrong!');
      })
    );
    expect(() => provider.getImmediate({ optional: true })).to.not.throw();
  });

  it('throws if instance factory throws when calling getImmediate() without optional flag', () => {
    provider.setComponent(
      getFakeComponent('test', () => {
        throw Error('something went wrong!');
      })
    );
    expect(() => provider.getImmediate()).to.throw();
  });

  it('does not throw if instance factory throws when calling get()', () => {
    provider.setComponent(
      getFakeComponent('test', () => {
        throw Error('something went wrong!');
      })
    );
    expect(() => provider.get()).to.not.throw();
  });

  it('does not throw if instance factory throws when registering an eager component', () => {
    const eagerComponent = getFakeComponent(
      'test',
      () => {
        throw Error('something went wrong!');
      },
      false,
      InstantiationMode.EAGER
    );

    expect(() => provider.setComponent(eagerComponent)).to.not.throw();
  });

  it('does not throw if instance factory throws when registering a component with a pending promise', () => {
    // create a pending promise
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    provider.get();
    const component = getFakeComponent('test', () => {
      throw Error('something went wrong!');
    });
    expect(() => provider.setComponent(component)).to.not.throw();
  });

  describe('Provider (multipleInstances = false)', () => {
    describe('getImmediate()', () => {
      it('throws if the service is not available', () => {
        expect(provider.getImmediate.bind(provider)).to.throw(
          'Service test is not available'
        );
      });

      it('returns null if the service is not available with optional flag', () => {
        expect(provider.getImmediate({ optional: true })).to.equal(null);
      });

      it('returns the service instance synchronously', () => {
        provider.setComponent(getFakeComponent('test', () => ({ test: true })));
        expect(provider.getImmediate()).to.deep.equal({ test: true });
      });

      it('returns the cached service instance', () => {
        provider.setComponent(getFakeComponent('test', () => ({ test: true })));
        const service1 = provider.getImmediate();
        const service2 = provider.getImmediate();
        expect(service1).to.equal(service2);
      });

      it('ignores parameter identifier and return the default service', () => {
        provider.setComponent(getFakeComponent('test', () => ({ test: true })));
        const defaultService = provider.getImmediate();
        expect(provider.getImmediate({ identifier: 'spider1' })).to.equal(
          defaultService
        );
        expect(provider.getImmediate({ identifier: 'spider2' })).to.equal(
          defaultService
        );
      });
    });

    describe('get()', () => {
      it('get the service instance asynchronouly', async () => {
        provider.setComponent(getFakeComponent('test', () => ({ test: true })));
        await expect(provider.get()).to.eventually.deep.equal({ test: true });
      });

      it('ignore parameter identifier and return the default service instance asyn', async () => {
        provider.setComponent(getFakeComponent('test', () => ({ test: true })));
        const defaultService = provider.getImmediate();
        await expect(provider.get('spider1')).to.eventually.equal(
          defaultService
        );
        await expect(provider.get('spider2')).to.eventually.equal(
          defaultService
        );
      });
    });

    describe('provideFactory()', () => {
      it('instantiates the service if there is a pending promise and the service is eager', () => {
        // create a pending promise
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        provider.get();

        provider.setComponent(
          getFakeComponent('test', () => ({}), false, InstantiationMode.EAGER)
        );
        expect((provider as any).instances.size).to.equal(1);
      });

      it('instantiates the service if there is a pending promise and the service is NOT eager', () => {
        // create a pending promise
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        provider.get();

        provider.setComponent(getFakeComponent('test', () => ({})));
        expect((provider as any).instances.size).to.equal(1);
      });

      it('instantiates the service if there is no pending promise and the service is eager', () => {
        provider.setComponent(
          getFakeComponent('test', () => ({}), false, InstantiationMode.EAGER)
        );
        expect((provider as any).instances.size).to.equal(1);
      });

      it('does NOT instantiate the service if there is no pending promise and the service is not eager', () => {
        provider.setComponent(getFakeComponent('test', () => ({})));
        expect((provider as any).instances.size).to.equal(0);
      });

      it('instantiates only the default service even if there are pending promises with identifiers', async () => {
        // create a pending promise with identifiers.
        const promise1 = provider.get('name1');
        const promise2 = provider.get('name2');

        provider.setComponent(getFakeComponent('test', () => ({})));
        expect((provider as any).instances.size).to.equal(1);

        const defaultService = provider.getImmediate();

        await expect(promise1).to.eventually.equal(defaultService);
        await expect(promise2).to.eventually.equal(defaultService);
      });
    });

    describe('delete()', () => {
      it('calls delete() on the service instance that implements legacy FirebaseService', () => {
        const deleteFake = fake();
        const myService: FirebaseService = {
          app: getFakeApp(),
          INTERNAL: {
            delete: deleteFake
          }
        };

        // provide factory and create a service instance
        provider.setComponent(
          getFakeComponent(
            'test',
            () => myService,
            false,
            InstantiationMode.EAGER
          )
        );

        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        provider.delete();

        expect(deleteFake).to.have.been.called;
      });

      it('calls delete() on the service instance that implements next FirebaseService', () => {
        const deleteFake = fake();
        const myService: _FirebaseService = {
          app: getFakeApp(),
          delete: deleteFake
        };

        // provide factory and create a service instance
        provider.setComponent(
          getFakeComponent(
            'test',
            () => myService,
            false,
            InstantiationMode.EAGER
          )
        );

        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        provider.delete();

        expect(deleteFake).to.have.been.called;
      });
    });

    describe('clearCache()', () => {
      it('removes the service instance from cache', () => {
        provider.setComponent(getFakeComponent('test', () => ({})));
        // create serviec instance
        const instance = provider.getImmediate();
        expect((provider as any).instances.size).to.equal(1);

        provider.clearInstance();
        expect((provider as any).instances.size).to.equal(0);

        // get a new instance after cache has been cleared
        const newInstance = provider.getImmediate();
        expect(newInstance).to.not.eq(instance);
      });
    });
  });

  describe('Provider (multipleInstances = true)', () => {
    describe('getImmediate(identifier)', () => {
      it('throws if the service is not available', () => {
        expect(
          provider.getImmediate.bind(provider, { identifier: 'guardian' })
        ).to.throw();
      });

      it('returns null if the service is not available with optional flag', () => {
        expect(
          provider.getImmediate({ identifier: 'guardian', optional: true })
        ).to.equal(null);
      });

      it('returns different service instances for different identifiers synchronously', () => {
        provider.setComponent(
          getFakeComponent('test', () => ({ test: true }), true)
        );
        const defaultService = provider.getImmediate();
        const service1 = provider.getImmediate({ identifier: 'guardian' });
        const service2 = provider.getImmediate({ identifier: 'servant' });

        expect(defaultService).to.deep.equal({ test: true });
        expect(service1).to.deep.equal({ test: true });
        expect(service2).to.deep.equal({ test: true });
        expect(defaultService).to.not.equal(service1);
        expect(defaultService).to.not.equal(service2);
        expect(service1).to.not.equal(service2);
      });
    });

    describe('get(identifier)', () => {
      it('returns different service instances for different identifiers asynchronouly', async () => {
        provider.setComponent(
          getFakeComponent('test', () => ({ test: true }), true)
        );

        const defaultService = await provider.get();
        const service1 = await provider.get('name1');
        const service2 = await provider.get('name2');

        expect(defaultService).to.deep.equal({ test: true });
        expect(service1).to.deep.equal({ test: true });
        expect(service2).to.deep.equal({ test: true });
        expect(defaultService).to.not.equal(service1);
        expect(defaultService).to.not.equal(service2);
        expect(service1).to.not.equal(service2);
      });
    });

    describe('provideFactory()', () => {
      it('instantiates services for the pending promises for all instance identifiers', async () => {
        /* eslint-disable @typescript-eslint/no-floating-promises */
        // create 3 promises for 3 different identifiers
        provider.get();
        provider.get('name1');
        provider.get('name2');
        /* eslint-enable @typescript-eslint/no-floating-promises */

        provider.setComponent(
          getFakeComponent('test', () => ({ test: true }), true)
        );

        expect((provider as any).instances.size).to.equal(3);
      });

      it('instantiates the default service if there is no pending promise and the service is eager', () => {
        provider.setComponent(
          getFakeComponent(
            'test',
            () => ({ test: true }),
            true,
            InstantiationMode.EAGER
          )
        );
        expect((provider as any).instances.size).to.equal(1);
      });

      it(`instantiates the default serviec if there are pending promises for other identifiers 
            but not for the default identifer and the service is eager`, () => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        provider.get('name1');
        provider.setComponent(
          getFakeComponent(
            'test',
            () => ({ test: true }),
            true,
            InstantiationMode.EAGER
          )
        );

        expect((provider as any).instances.size).to.equal(2);
      });
    });

    describe('delete()', () => {
      it('calls delete() on all service instances that implement FirebaseService', () => {
        const deleteFakes: SinonSpy[] = [];

        function getService(): FirebaseService {
          const deleteFake = fake();
          deleteFakes.push(deleteFake);
          return {
            app: getFakeApp(),
            INTERNAL: {
              delete: deleteFake
            }
          };
        }

        // provide factory that produces mulitpleInstances
        provider.setComponent(getFakeComponent('test', getService, true));

        // create 2 service instances with different names
        provider.getImmediate({ identifier: 'instance1' });
        provider.getImmediate({ identifier: 'instance2' });

        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        provider.delete();

        expect(deleteFakes.length).to.equal(2);
        for (const f of deleteFakes) {
          expect(f).to.have.been.called;
        }
      });
    });
    describe('clearCache()', () => {
      it('returns new service instances sync after cache is cleared', () => {
        provider.setComponent(getFakeComponent('test', () => ({}), true));
        // create serviec instances with different identifiers
        const defaultInstance = provider.getImmediate();
        const instance1 = provider.getImmediate({ identifier: 'instance1' });

        expect((provider as any).instances.size).to.equal(2);

        // remove the default instance from cache and create a new default instance
        provider.clearInstance();
        expect((provider as any).instances.size).to.equal(1);
        const newDefaultInstance = provider.getImmediate();
        expect(newDefaultInstance).to.not.eq(defaultInstance);
        expect((provider as any).instances.size).to.equal(2);

        // remove the named instance from cache and create a new instance with the same identifier
        provider.clearInstance('instance1');
        expect((provider as any).instances.size).to.equal(1);
        const newInstance1 = provider.getImmediate({ identifier: 'instance1' });
        expect(newInstance1).to.not.eq(instance1);
        expect((provider as any).instances.size).to.equal(2);
      });

      it('returns new services asynchronously after cache is cleared', async () => {
        provider.setComponent(getFakeComponent('test', () => ({}), true));
        // create serviec instances with different identifiers
        const defaultInstance = await provider.get();
        const instance1 = await provider.get('instance1');

        expect((provider as any).instances.size).to.equal(2);
        expect((provider as any).instancesDeferred.size).to.equal(2);

        // remove the default instance from cache and create a new default instance
        provider.clearInstance();
        expect((provider as any).instances.size).to.equal(1);
        expect((provider as any).instancesDeferred.size).to.equal(1);

        const newDefaultInstance = await provider.get();
        expect(newDefaultInstance).to.not.eq(defaultInstance);
        expect((provider as any).instances.size).to.equal(2);
        expect((provider as any).instancesDeferred.size).to.equal(2);

        // remove the named instance from cache and create a new instance with the same identifier
        provider.clearInstance('instance1');
        expect((provider as any).instances.size).to.equal(1);
        expect((provider as any).instancesDeferred.size).to.equal(1);
        const newInstance1 = await provider.get('instance1');
        expect(newInstance1).to.not.eq(instance1);
        expect((provider as any).instances.size).to.equal(2);
        expect((provider as any).instancesDeferred.size).to.equal(2);
      });
    });
  });
});
