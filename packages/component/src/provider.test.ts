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
import { fake, SinonSpy, match } from 'sinon';
import { ComponentContainer } from './component_container';
import { FirebaseService } from '@firebase/app-types/private';
// eslint-disable-next-line import/no-extraneous-dependencies
import { _FirebaseService } from '@firebase/app';
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
    void provider.get();
    const component = getFakeComponent('test', () => {
      throw Error('something went wrong!');
    });
    expect(() => provider.setComponent(component)).to.not.throw();
  });

  describe('initialize()', () => {
    it('throws if the provider is already initialized', () => {
      provider.setComponent(getFakeComponent('test', () => ({})));
      provider.initialize();

      expect(() => provider.initialize()).to.throw();
    });

    it('throws if the component has not been registered', () => {
      expect(() => provider.initialize()).to.throw();
    });

    it('accepts an options parameter and passes it to the instance factory', () => {
      const options = {
        configurable: true,
        test: true
      };
      provider.setComponent(
        getFakeComponent('test', (_container, opts) => ({
          options: opts.options
        }))
      );
      const instance = provider.initialize({ options });

      expect((instance as any).options).to.deep.equal(options);
    });

    it('resolve pending promises created by Provider.get() with the same identifier', () => {
      provider.setComponent(
        getFakeComponent(
          'test',
          () => ({ test: true }),
          false,
          InstantiationMode.EXPLICIT
        )
      );
      const servicePromise = provider.get();
      expect((provider as any).instances.size).to.equal(0);

      provider.initialize();
      expect((provider as any).instances.size).to.equal(1);
      return expect(servicePromise).to.eventually.deep.equal({ test: true });
    });

    it('invokes onInit callbacks synchronously', () => {
      provider.setComponent(
        getFakeComponent(
          'test',
          () => ({ test: true }),
          false,
          InstantiationMode.EXPLICIT
        )
      );
      const callback1 = fake();
      provider.onInit(callback1);

      provider.initialize();
      expect(callback1).to.have.been.calledOnce;
    });
  });

  describe('onInit', () => {
    it('registers onInit callbacks', () => {
      provider.setComponent(
        getFakeComponent(
          'test',
          () => ({ test: true }),
          false,
          InstantiationMode.EXPLICIT
        )
      );
      const callback1 = fake();
      const callback2 = fake();
      provider.onInit(callback1);
      provider.onInit(callback2);

      provider.initialize();
      expect(callback1).to.have.been.calledOnce;
      expect(callback2).to.have.been.calledOnce;
    });

    it('invokes callback for existing instance', () => {
      provider.setComponent(
        getFakeComponent(
          'test',
          () => ({ test: true }),
          false,
          InstantiationMode.EXPLICIT
        )
      );
      const callback = fake();
      provider.initialize();
      provider.onInit(callback);

      expect(callback).to.have.been.calledOnce;
    });

    it('passes service instance', () => {
      const serviceInstance = { test: true };
      provider.setComponent(getFakeComponent('test', () => serviceInstance));
      const callback = fake();

      // initialize the service instance
      provider.getImmediate();

      provider.onInit(callback);

      expect(callback).to.have.been.calledOnce;
      expect(callback).to.have.been.calledWith(serviceInstance);
    });

    it('passes instance identifier', () => {
      provider.setComponent(
        getFakeComponent(
          'test',
          () => ({ test: true }),
          true,
          InstantiationMode.EAGER
        )
      );
      const callback1 = fake();
      const callback2 = fake();

      provider.getImmediate({ identifier: 'id1' });
      provider.getImmediate({ identifier: 'id2' });

      provider.onInit(callback1, 'id1');
      provider.onInit(callback2, 'id2');

      expect(callback1).to.have.been.calledOnce;
      expect(callback1).to.have.been.calledWith(match.any, 'id1');
      expect(callback2).to.have.been.calledOnce;
      expect(callback2).to.have.been.calledWith(match.any, 'id2');
    });

    it('returns a function to unregister the callback', () => {
      provider.setComponent(
        getFakeComponent(
          'test',
          () => ({ test: true }),
          false,
          InstantiationMode.EXPLICIT
        )
      );
      const callback1 = fake();
      const callback2 = fake();
      provider.onInit(callback1);
      const unregister = provider.onInit(callback2);
      unregister();

      provider.initialize();
      expect(callback1).to.have.been.calledOnce;
      expect(callback2).to.not.have.been.called;
    });
  });

  describe('Provider (multipleInstances = false)', () => {
    describe('getImmediate()', () => {
      it('throws if component has not been registered', () => {
        expect(provider.getImmediate.bind(provider)).to.throw(
          'Service test is not available'
        );
      });

      it('returns null with the optional flag set if component has not been registered ', () => {
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
      it('get the service instance asynchronously', async () => {
        provider.setComponent(getFakeComponent('test', () => ({ test: true })));
        await expect(provider.get()).to.eventually.deep.equal({ test: true });
      });

      it('ignore parameter identifier and return the default service instance async', async () => {
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

    describe('setComponent()', () => {
      it('instantiates the service if there is a pending promise and the service is eager', () => {
        // create a pending promise
        void provider.get();

        provider.setComponent(
          getFakeComponent('test', () => ({}), false, InstantiationMode.EAGER)
        );
        expect((provider as any).instances.size).to.equal(1);
      });

      it('instantiates the service if there is a pending promise and the service is NOT eager', () => {
        // create a pending promise
        void provider.get();

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

        void provider.delete();

        expect(deleteFake).to.have.been.called;
      });

      it('calls delete() on the service instance that implements next FirebaseService', () => {
        const deleteFake = fake();
        const myService: _FirebaseService = {
          app: getFakeApp(),
          _delete: deleteFake
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

        void provider.delete();

        expect(deleteFake).to.have.been.called;
      });
    });

    describe('clearCache()', () => {
      it('removes the service instance from cache', () => {
        provider.setComponent(getFakeComponent('test', () => ({})));
        // create service instance
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
      it('returns different service instances for different identifiers asynchronously', async () => {
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

    describe('setComponent()', () => {
      it('instantiates services for the pending promises for all instance identifiers', async () => {
        // create 3 promises for 3 different identifiers
        void provider.get();
        void provider.get('name1');
        void provider.get('name2');

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

      it(`instantiates the default service if there are pending promises for other identifiers 
            but not for the default identifer and the service is eager`, () => {
        void provider.get('name1');
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

        // provide factory that produces multipleInstances
        provider.setComponent(getFakeComponent('test', getService, true));

        // create 2 service instances with different names
        provider.getImmediate({ identifier: 'instance1' });
        provider.getImmediate({ identifier: 'instance2' });

        void provider.delete();

        expect(deleteFakes.length).to.equal(2);
        for (const f of deleteFakes) {
          expect(f).to.have.been.called;
        }
      });
    });
    describe('clearCache()', () => {
      it('returns new service instances sync after cache is cleared', () => {
        provider.setComponent(getFakeComponent('test', () => ({}), true));
        // create service instances with different identifiers
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
        // create service instances with different identifiers
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

  describe('InstantiationMode: EXPLICIT', () => {
    it('setComponent() does NOT auto-initialize the service', () => {
      // create a pending promise which should trigger initialization if instantiationMode is non-EXPLICIT
      void provider.get();

      provider.setComponent(
        getFakeComponent('test', () => ({}), false, InstantiationMode.EXPLICIT)
      );
      expect((provider as any).instances.size).to.equal(0);
    });

    it('get() does NOT auto-initialize the service', () => {
      provider.setComponent(
        getFakeComponent('test', () => ({}), false, InstantiationMode.EXPLICIT)
      );
      expect((provider as any).instances.size).to.equal(0);
      void provider.get();
      expect((provider as any).instances.size).to.equal(0);
    });

    it('getImmediate() does NOT auto-initialize the service and throws if the service has not been initialized', () => {
      provider.setComponent(
        getFakeComponent('test', () => ({}), false, InstantiationMode.EXPLICIT)
      );
      expect((provider as any).instances.size).to.equal(0);

      expect(() => provider.getImmediate()).to.throw(
        'Service test is not available'
      );
      expect((provider as any).instances.size).to.equal(0);
    });

    it('getImmediate() does NOT auto-initialize the service and returns null if the optional flag is set', () => {
      provider.setComponent(
        getFakeComponent('test', () => ({}), false, InstantiationMode.EXPLICIT)
      );
      expect((provider as any).instances.size).to.equal(0);

      expect(provider.getImmediate({ optional: true })).to.equal(null);
      expect((provider as any).instances.size).to.equal(0);
    });
  });
});
