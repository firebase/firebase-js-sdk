/**
 * @license
 * Copyright 2017 Google LLC
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

import {
  FirebaseApp,
  FirebaseNamespace,
  FirebaseOptions
} from '@firebase/app-types';
import {
  _FirebaseApp,
  _FirebaseNamespace,
  FirebaseService
} from '@firebase/app-types/private';
import { createFirebaseNamespace } from '../src/firebaseNamespace';
import { createFirebaseNamespaceLite } from '../src/lite/firebaseNamespaceLite';
import { expect } from 'chai';
import { stub } from 'sinon';
import { Component, ComponentType } from '@firebase/component';
import './setup';

executeFirebaseTests();
executeFirebaseLiteTests();

function executeFirebaseTests(): void {
  firebaseAppTests('Firebase App Tests', createFirebaseNamespace);

  describe('Firebase Service Registration', () => {
    let firebase: FirebaseNamespace;

    beforeEach(() => {
      firebase = createFirebaseNamespace();
    });

    it('will do nothing if registerComponent is called again with the same name', () => {
      const registerStub = stub(
        (firebase as _FirebaseNamespace).INTERNAL,
        'registerComponent'
      ).callThrough();

      const testComponent = createTestComponent('test');

      (firebase as _FirebaseNamespace).INTERNAL.registerComponent(
        testComponent
      );
      firebase.initializeApp({});
      const serviceNamespace = (firebase as any).test;

      (firebase as _FirebaseNamespace).INTERNAL.registerComponent(
        testComponent
      );

      const serviceNamespace2 = (firebase as any).test;

      expect(serviceNamespace).to.eq(serviceNamespace2);
      expect(registerStub).to.have.not.thrown();
    });

    it('returns cached service instances', () => {
      firebase.initializeApp({});
      (firebase as _FirebaseNamespace).INTERNAL.registerComponent(
        createTestComponent('test')
      );

      const service = (firebase as any).test();

      expect(service).to.eq((firebase as any).test());
    });

    it(`creates a new instance of a service after removing the existing instance`, () => {
      const app = firebase.initializeApp({});
      (firebase as _FirebaseNamespace).INTERNAL.registerComponent(
        createTestComponent('test')
      );

      const service = (firebase as any).test();

      expect(service).to.eq((firebase as any).test());

      (app as _FirebaseApp)._removeServiceInstance('test');

      expect(service, (firebase as any).test());
    });

    it(`creates a new instance of a service after removing the existing instance - for service that supports multiple instances`, () => {
      const app = firebase.initializeApp({});
      (firebase as _FirebaseNamespace).INTERNAL.registerComponent(
        createTestComponent('multiInstance', true)
      );

      // default instance
      const instance1 = (firebase.app() as any).multiInstance();
      const serviceIdentifier = 'custom instance identifier';
      const instance2 = (firebase.app() as any).multiInstance(
        serviceIdentifier
      );

      (app as _FirebaseApp)._removeServiceInstance(
        'multiInstance',
        serviceIdentifier
      );

      // default instance should not be changed
      expect(instance1).to.eq((firebase.app() as any).multiInstance());

      expect(instance2).to.not.eq(
        (firebase.app() as any).multiInstance(serviceIdentifier)
      );
    });
  });

  describe('Firebase Version Registration', () => {
    let firebase: FirebaseNamespace;

    beforeEach(() => {
      firebase = createFirebaseNamespace();
    });

    it('will register an official version component without warnings', () => {
      const warnStub = stub(console, 'warn');
      const { components } = (firebase as _FirebaseNamespace).INTERNAL;
      const initialSize = components.size;

      firebase.registerVersion('@firebase/analytics', '1.2.3');
      expect(components.get('fire-analytics-version')).to.exist;
      expect(components.size).to.equal(initialSize + 1);

      expect(warnStub.called).to.be.false;
    });

    it('will register an arbitrary version component without warnings', () => {
      const warnStub = stub(console, 'warn');
      const { components } = (firebase as _FirebaseNamespace).INTERNAL;
      const initialSize = components.size;

      firebase.registerVersion('angularfire', '1.2.3');
      expect(components.get('angularfire-version')).to.exist;
      expect(components.size).to.equal(initialSize + 1);

      expect(warnStub.called).to.be.false;
    });

    it('will do nothing if registerVersion() is given illegal characters', () => {
      const warnStub = stub(console, 'warn');
      const { components } = (firebase as _FirebaseNamespace).INTERNAL;
      const initialSize = components.size;

      firebase.registerVersion('remote config', '1.2.3');
      expect(warnStub.args[0][1]).to.include('library name "remote config"');
      expect(components.size).to.equal(initialSize);

      firebase.registerVersion('remote-config', '1.2/3');
      expect(warnStub.args[1][1]).to.include('version name "1.2/3"');
      expect(components.size).to.equal(initialSize);
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

    it('allows Performance service to register', () => {
      (firebase as _FirebaseNamespace).INTERNAL.registerComponent(
        createTestComponent('performance')
      );
      const app = firebase.initializeApp({});
      const perf = (app as any).performance();
      expect(perf).to.be.instanceof(TestService);
    });

    it('allows Installations service to register', () => {
      (firebase as _FirebaseNamespace).INTERNAL.registerComponent(
        createTestComponent('installations')
      );
      const app = firebase.initializeApp({});
      const perf = (app as any).installations();
      expect(perf).to.be.instanceof(TestService);
    });

    it('does NOT allow services other than Performance and installations to register', () => {
      expect(() =>
        (firebase as _FirebaseNamespace).INTERNAL.registerComponent(
          createTestComponent('auth')
        )
      ).to.throw();
    });

    it('allows any private component to register', () => {
      expect(() =>
        (firebase as _FirebaseNamespace).INTERNAL.registerComponent(
          createTestComponent('auth-internal', false, ComponentType.PRIVATE)
        )
      ).to.not.throw();
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

    it(' has no initial apps.', () => {
      expect(firebase.apps.length).to.eq(0);
    });

    it('Can get app via firebase namespace.', () => {
      const app = firebase.initializeApp({});
      expect(app).to.be.not.null;
    });

    it('can initialize DEFAULT App.', () => {
      const app = firebase.initializeApp({});
      expect(firebase.apps.length).to.eq(1);
      expect(app).to.eq(firebase.apps[0]);
      expect(app.name).to.eq('[DEFAULT]');
      expect(firebase.app()).to.eq(app);
      expect(firebase.app('[DEFAULT]')).to.eq(app);
    });

    it('can get options of App.', () => {
      const options: FirebaseOptions = { projectId: 'projectId' };
      const app = firebase.initializeApp(options);
      expect(app.options).to.deep.eq(options);
    });

    it('can delete App.', async () => {
      const app = firebase.initializeApp({});
      expect(firebase.apps.length).to.eq(1);
      await app.delete();
      expect(firebase.apps.length).to.eq(0);
    });

    it('can create named App.', () => {
      const app = firebase.initializeApp({}, 'my-app');
      expect(firebase.apps.length).to.eq(1);
      expect(app.name).to.eq('my-app');
      expect(firebase.app('my-app')).to.eq(app);
    });

    it('can create named App and DEFAULT app.', () => {
      firebase.initializeApp({}, 'my-app');
      expect(firebase.apps.length).to.eq(1);
      firebase.initializeApp({});
      expect(firebase.apps.length).to.eq(2);
    });

    it('duplicate DEFAULT initialize is an error.', () => {
      firebase.initializeApp({});
      expect(() => firebase.initializeApp({})).throws(/\[DEFAULT\].*exists/i);
    });

    it('duplicate named App initialize is an error.', () => {
      firebase.initializeApp({}, 'abc');

      expect(() => firebase.initializeApp({}, 'abc')).throws(/'abc'.*exists/i);
    });

    it('automaticDataCollectionEnabled is `false` by default', () => {
      const app = firebase.initializeApp({}, 'my-app');
      expect(app.automaticDataCollectionEnabled).to.eq(false);
    });

    it('automaticDataCollectionEnabled can be set via the config object', () => {
      const app = firebase.initializeApp(
        {},
        { automaticDataCollectionEnabled: true }
      );
      expect(app.automaticDataCollectionEnabled).to.eq(true);
    });

    it('Modifying options object does not change options.', () => {
      const options: FirebaseOptions = {
        appId: 'original',
        measurementId: 'someId'
      };
      firebase.initializeApp(options);
      options.appId = 'changed';
      delete options.measurementId;
      expect(firebase.app().options).to.deep.eq({
        appId: 'original',
        measurementId: 'someId'
      });
    });

    it('Error to use app after it is deleted.', async () => {
      const app = firebase.initializeApp({});
      await app.delete();
      expect(() => console.log(app.name)).throws(/already.*deleted/);
    });

    it('OK to create same-name app after it is deleted.', async () => {
      const app = firebase.initializeApp({}, 'app-name');
      await app.delete();

      const app2 = firebase.initializeApp({}, 'app-name');
      expect(app).to.not.eq(app2, 'Expect new instance.');
      // But original app id still orphaned.
      expect(() => console.log(app.name)).throws(/already.*deleted/);
    });

    it('OK to use Object.prototype member names as app name.', () => {
      const app = firebase.initializeApp({}, 'toString');
      expect(firebase.apps.length).to.eq(1);
      expect(app.name).to.eq('toString');
      expect(firebase.app('toString')).to.eq(app);
    });

    it('Error to get uninitialized app using Object.prototype member name.', () => {
      expect(() => firebase.app('toString')).throws(/'toString'.*created/i);
    });

    describe('Check for bad app names', () => {
      const tests = ['', 123, false, null];
      for (const data of tests) {
        it("where name == '" + data + "'", () => {
          expect(() => firebase.initializeApp({}, data as string)).throws(
            /Illegal app name/i
          );
        });
      }
    });

    describe('Check for bad app names, passed as an object', () => {
      const tests = ['', 123, false, null];
      for (const name of tests) {
        it("where name == '" + name + "'", () => {
          expect(() =>
            firebase.initializeApp({}, { name: name as string })
          ).throws(/Illegal app name/i);
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

function createTestComponent(
  name: string,
  multiInstances = false,
  type = ComponentType.PUBLIC
): Component {
  const component = new Component(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    name as any,
    container => new TestService(container.getProvider('app').getImmediate()),
    type
  );
  component.setMultipleInstances(multiInstances);
  return component;
}
