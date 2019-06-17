/**
 * @license
 * Copyright 2017 Google Inc.
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

import { FirebaseApp, FirebaseNamespace } from '@firebase/app-types';
import {
  _FirebaseApp,
  _FirebaseNamespace,
  FirebaseService
} from '@firebase/app-types/private';
import { createFirebaseNamespace } from '../src/firebaseNamespace';
import { createFirebaseNamespaceLite } from '../src/lite/firebaseNamespaceLite';
import { assert } from 'chai';

executeFirebaseTests();
executeFirebaseLiteTests();

function executeFirebaseTests(): void {
  firebaseAppTests('Firebase App Tests', createFirebaseNamespace);

  describe('Firebase Service Registration', () => {
    let firebase: FirebaseNamespace;

    beforeEach(() => {
      firebase = createFirebaseNamespace();
    });
    it('Register App Hook', done => {
      const events = ['create', 'delete'];
      let hookEvents = 0;
      (firebase as _FirebaseNamespace).INTERNAL.registerService(
        'test',
        (app: FirebaseApp) => {
          return new TestService(app);
        },
        undefined,
        (event: string, _app: FirebaseApp) => {
          assert.equal(event, events[hookEvents]);
          hookEvents += 1;
          if (hookEvents === events.length) {
            done();
          }
        }
      );
      const app = firebase.initializeApp({});
      // Ensure the hook is called synchronously
      assert.equal(hookEvents, 1);
      // tslint:disable-next-line:no-floating-promises
      app.delete();
    });

    it('Only calls createService on first use (per app).', () => {
      let registrations = 0;
      (firebase as _FirebaseNamespace).INTERNAL.registerService(
        'test',
        (app: FirebaseApp) => {
          registrations += 1;
          return new TestService(app);
        }
      );
      let app = firebase.initializeApp({});
      assert.equal(registrations, 0);
      (firebase as any).test();
      assert.equal(registrations, 1);
      (firebase as any).test();
      assert.equal(registrations, 1);
      (firebase as any).test(app);
      assert.equal(registrations, 1);
      (app as any).test();
      assert.equal(registrations, 1);

      app = firebase.initializeApp({}, 'second');
      assert.equal(registrations, 1);
      (app as any).test();
      assert.equal(registrations, 2);
    });

    it('Can lazy load a service', () => {
      let registrations = 0;

      const app1 = firebase.initializeApp({});
      assert.isUndefined((app1 as any).lazyService);

      (firebase as _FirebaseNamespace).INTERNAL.registerService(
        'lazyService',
        (app: FirebaseApp) => {
          registrations += 1;
          return new TestService(app);
        }
      );

      assert.isDefined((app1 as any).lazyService);

      // Initial service registration happens on first invocation
      assert.equal(registrations, 0);

      // Verify service has been registered
      (firebase as any).lazyService();
      assert.equal(registrations, 1);

      // Service should only be created once
      (firebase as any).lazyService();
      assert.equal(registrations, 1);

      // Service should only be created once... regardless of how you invoke the function
      (firebase as any).lazyService(app1);
      assert.equal(registrations, 1);

      // Service should already be defined for the second app
      const app2 = firebase.initializeApp({}, 'second');
      assert.isDefined((app1 as any).lazyService);

      // Service still should not have registered for the second app
      assert.equal(registrations, 1);

      // Service should initialize once called
      (app2 as any).lazyService();
      assert.equal(registrations, 2);
    });

    it('Can lazy register App Hook', done => {
      const events = ['create', 'delete'];
      let hookEvents = 0;
      const app = firebase.initializeApp({});
      (firebase as _FirebaseNamespace).INTERNAL.registerService(
        'lazyServiceWithHook',
        (app: FirebaseApp) => {
          return new TestService(app);
        },
        undefined,
        (event: string, _app: FirebaseApp) => {
          assert.equal(event, events[hookEvents]);
          hookEvents += 1;
          if (hookEvents === events.length) {
            done();
          }
        }
      );
      // Ensure the hook is called synchronously
      assert.equal(hookEvents, 1);
      // tslint:disable-next-line:no-floating-promises
      app.delete();
    });

    it('Can register multiple instances of some services', () => {
      // Register Multi Instance Service
      (firebase as _FirebaseNamespace).INTERNAL.registerService(
        'multiInstance',
        (...args) => {
          const [app, , instanceIdentifier] = args;
          return new TestService(app, instanceIdentifier);
        },
        undefined,
        undefined,
        true
      );
      firebase.initializeApp({});

      // Capture a given service ref
      const service = (firebase.app() as any).multiInstance();
      assert.strictEqual(service, (firebase.app() as any).multiInstance());

      // Capture a custom instance service ref
      const serviceIdentifier = 'custom instance identifier';
      const service2 = (firebase.app() as any).multiInstance(serviceIdentifier);
      assert.strictEqual(
        service2,
        (firebase.app() as any).multiInstance(serviceIdentifier)
      );

      // Ensure that the two services **are not equal**
      assert.notStrictEqual(
        service.instanceIdentifier,
        service2.instanceIdentifier,
        '`instanceIdentifier` is not being set correctly'
      );
      assert.notStrictEqual(service, service2);
      assert.notStrictEqual(
        (firebase.app() as any).multiInstance(),
        (firebase.app() as any).multiInstance(serviceIdentifier)
      );
    });

    it(`Should return the same instance of a service if a service doesn't support multi instance`, () => {
      // Register Multi Instance Service
      (firebase as _FirebaseNamespace).INTERNAL.registerService(
        'singleInstance',
        (...args) => {
          const [app, , instanceIdentifier] = args;
          return new TestService(app, instanceIdentifier);
        },
        undefined,
        undefined,
        false // <-- multi instance flag
      );
      firebase.initializeApp({});

      // Capture a given service ref
      const serviceIdentifier = 'custom instance identifier';
      const service = (firebase.app() as any).singleInstance();
      const service2 = (firebase.app() as any).singleInstance(
        serviceIdentifier
      );

      // Ensure that the two services **are equal**
      assert.strictEqual(
        service.instanceIdentifier,
        service2.instanceIdentifier,
        '`instanceIdentifier` is not being set correctly'
      );
      assert.strictEqual(service, service2);
    });

    it(`Should pass null to the factory method if using default instance`, () => {
      // Register Multi Instance Service
      (firebase as _FirebaseNamespace).INTERNAL.registerService(
        'testService',
        (...args) => {
          const [app, , instanceIdentifier] = args;
          assert.isUndefined(
            instanceIdentifier,
            '`instanceIdentifier` is not `undefined`'
          );
          return new TestService(app, instanceIdentifier);
        }
      );
      firebase.initializeApp({});
    });

    it(`Should extend INTERNAL per app instance`, () => {
      let counter: number = 0;
      (firebase as _FirebaseNamespace).INTERNAL.registerService(
        'test',
        (app: FirebaseApp, extendApp: any) => {
          const service = new TestService(app);
          (service as any).token = 'tokenFor' + counter++;
          extendApp({
            INTERNAL: {
              getToken: () => {
                return Promise.resolve({
                  accessToken: (service as any).token
                });
              }
            }
          });
          return service;
        }
      );
      // Initialize 2 apps and their corresponding services.
      const app = firebase.initializeApp({});
      (app as any).test();
      const app2 = firebase.initializeApp({}, 'app2');
      (app2 as any).test();
      // Confirm extended INTERNAL getToken resolve with the corresponding
      // service's value.
      return (app as _FirebaseApp).INTERNAL.getToken()
        .then(token => {
          assert.isNotNull(token);
          assert.equal('tokenFor0', token!.accessToken);
          return (app2 as _FirebaseApp).INTERNAL.getToken();
        })
        .then(token => {
          assert.isNotNull(token);
          assert.equal('tokenFor1', token!.accessToken);
        });
    });
  });
}

function executeFirebaseLiteTests(): void {
  firebaseAppTests('Firebase App Lite Tests', createFirebaseNamespaceLite);

  describe('Firebase Lite Service Registration', () => {
    let firebase: FirebaseNamespace;

    beforeEach(() => {
      firebase = createFirebaseNamespaceLite();
    });

    it('should allow Performance service to register', () => {
      (firebase as _FirebaseNamespace).INTERNAL.registerService(
        'performance',
        (app: FirebaseApp) => {
          return new TestService(app);
        }
      );
      const app = firebase.initializeApp({});
      const perf = (app as any).performance();
      assert.isTrue(perf instanceof TestService);
    });

    it('should NOT allow services other than Performance to register', () => {
      assert.throws(() => {
        (firebase as _FirebaseNamespace).INTERNAL.registerService(
          'test',
          (app: FirebaseApp) => {
            return new TestService(app);
          }
        );
      });
    });
  });
}

function firebaseAppTests(
  testName: string,
  firebaseNamespaceFactory: () => FirebaseNamespace
): void {
  describe(testName, () => {
    let firebase: FirebaseNamespace;

    beforeEach(() => {
      firebase = firebaseNamespaceFactory();
    });

    it('No initial apps.', () => {
      assert.equal(firebase.apps.length, 0);
    });

    it('Can initialize DEFAULT App.', () => {
      const app = firebase.initializeApp({});
      assert.equal(firebase.apps.length, 1);
      assert.strictEqual(app, firebase.apps[0]);
      assert.equal(app.name, '[DEFAULT]');
      assert.strictEqual(firebase.app(), app);
      assert.strictEqual(firebase.app('[DEFAULT]'), app);
    });

    it('Can get options of App.', () => {
      const options = { test: 'option' };
      const app = firebase.initializeApp(options);
      assert.deepEqual(app.options as any, options as any);
    });

    it('Can delete App.', () => {
      const app = firebase.initializeApp({});
      assert.equal(firebase.apps.length, 1);
      return app.delete().then(() => {
        assert.equal(firebase.apps.length, 0);
      });
    });

    it('Can create named App.', () => {
      const app = firebase.initializeApp({}, 'my-app');
      assert.equal(firebase.apps.length, 1);
      assert.equal(app.name, 'my-app');
      assert.strictEqual(firebase.app('my-app'), app);
    });

    it('Can create named App and DEFAULT app.', () => {
      firebase.initializeApp({}, 'my-app');
      assert.equal(firebase.apps.length, 1);
      firebase.initializeApp({});
      assert.equal(firebase.apps.length, 2);
    });

    it('Can get app via firebase namespace.', () => {
      firebase.initializeApp({});
    });

    it('Duplicate DEFAULT initialize is an error.', () => {
      firebase.initializeApp({});
      assert.throws(() => {
        firebase.initializeApp({});
      }, /\[DEFAULT\].*exists/i);
    });

    it('Duplicate named App initialize is an error.', () => {
      firebase.initializeApp({}, 'abc');
      assert.throws(() => {
        firebase.initializeApp({}, 'abc');
      }, /'abc'.*exists/i);
    });

    it('automaticDataCollectionEnabled is `false` by default', () => {
      const app = firebase.initializeApp({}, 'my-app');
      assert.equal(app.automaticDataCollectionEnabled, false);
    });

    it('automaticDataCollectionEnabled can be set via the config object', () => {
      const app = firebase.initializeApp(
        {},
        { automaticDataCollectionEnabled: true }
      );
      assert.equal(app.automaticDataCollectionEnabled, true);
    });

    it('Modifying options object does not change options.', () => {
      const options = { opt: 'original', nested: { opt: 123 } };
      firebase.initializeApp(options);
      options.opt = 'changed';
      options.nested.opt = 456;
      assert.deepEqual(firebase.app().options, {
        opt: 'original',
        nested: { opt: 123 }
      });
    });

    it('Error to use app after it is deleted.', () => {
      const app = firebase.initializeApp({});
      return app.delete().then(() => {
        assert.throws(() => {
          console.log(app.name);
        }, /already.*deleted/);
      });
    });

    it('OK to create same-name app after it is deleted.', () => {
      const app = firebase.initializeApp({}, 'app-name');
      return app.delete().then(() => {
        const app2 = firebase.initializeApp({}, 'app-name');
        assert.ok(app !== app2, 'Expect new instance.');
        // But original app id still orphaned.
        assert.throws(() => {
          console.log(app.name);
        }, /already.*deleted/);
      });
    });

    it('OK to use Object.prototype member names as app name.', () => {
      const app = firebase.initializeApp({}, 'toString');
      assert.equal(firebase.apps.length, 1);
      assert.equal(app.name, 'toString');
      assert.strictEqual(firebase.app('toString'), app);
    });

    it('Error to get uninitialized app using Object.prototype member name.', () => {
      assert.throws(() => {
        firebase.app('toString');
      }, /'toString'.*created/i);
    });

    describe('Check for bad app names', () => {
      const tests = ['', 123, false, null];
      for (const data of tests) {
        it("where name == '" + data + "'", () => {
          assert.throws(() => {
            firebase.initializeApp({}, data as string);
          }, /Illegal app name/i);
        });
      }
    });
    describe('Check for bad app names, passed as an object', () => {
      const tests = ['', 123, false, null];
      for (const name of tests) {
        it("where name == '" + name + "'", () => {
          assert.throws(() => {
            firebase.initializeApp({}, { name: name as string });
          }, /Illegal app name/i);
        });
      }
    });
  });
}

class TestService implements FirebaseService {
  constructor(private app_: FirebaseApp, public instanceIdentifier?: string) {}

  // TODO(koss): Shouldn't this just be an added method on
  // the service instance?
  get app(): FirebaseApp {
    return this.app_;
  }

  delete(): Promise<void> {
    return new Promise((resolve: (v?: void) => void) => {
      setTimeout(() => resolve(), 10);
    });
  }
}
