/**
 * @license
 * Copyright 2019 Google Inc.
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
import { stub } from 'sinon';
import '../../test/setup';
import {
  initializeApp,
  getApps,
  deleteApp,
  getApp,
  registerVersion
} from './api';
import { DEFAULT_ENTRY_NAME } from '../constants';
import { FirebaseAppInternalNext } from '@firebase/app-types/next';
import { clearComponents, components, registerComponent } from './internal';
import { createTestComponent } from '../../test/util';

describe('API tests', () => {
  afterEach(() => {
    for (const app of getApps()) {
      deleteApp(app).catch(() => {});
    }
  });

  describe('initializeApp', () => {
    it('creats DEFAULT App', () => {
      const app = initializeApp({});
      expect(app.name).to.equal(DEFAULT_ENTRY_NAME);
    });

    it('creates named App', () => {
      const appName = 'MyApp';
      const app = initializeApp({}, appName);
      expect(app.name).to.equal(appName);
    });

    it('creates named and DEFAULT App', () => {
      const appName = 'MyApp';
      const app1 = initializeApp({});
      const app2 = initializeApp({}, appName);

      expect(app1.name).to.equal(DEFAULT_ENTRY_NAME);
      expect(app2.name).to.equal(appName);
    });

    it('throws when creating duplicate DEDAULT Apps', () => {
      initializeApp({});
      expect(() => initializeApp({})).throws(/\[DEFAULT\].*exists/i);
    });

    it('throws when creating duplicate named Apps', () => {
      const appName = 'MyApp';
      initializeApp({}, appName);
      expect(() => initializeApp({}, appName)).throws(/'MyApp'.*exists/i);
    });

    it('takes an object as the second parameter to create named App', () => {
      const appName = 'MyApp';
      const app = initializeApp({}, { name: appName });
      expect(app.name).to.equal(appName);
    });

    it('takes an object as the second parameter to create named App', () => {
      const appName = 'MyApp';
      const app = initializeApp({}, { name: appName });
      expect(app.name).to.equal(appName);
    });

    it('sets automaticDataCollectionEnabled', () => {
      const app = initializeApp({}, { automaticDataCollectionEnabled: true });
      expect(app.automaticDataCollectionEnabled).to.be.true;
    });

    it('adds registered components to App', () => {
      clearComponents();
      const comp1 = createTestComponent('test1');
      const comp2 = createTestComponent('test2');
      registerComponent(comp1);
      registerComponent(comp2);

      const app = initializeApp({}) as FirebaseAppInternalNext;
      expect(app.container.getProviders().length).to.equal(components.size);
    });
  });

  describe('getApp', () => {
    it('retrieves DEFAULT App', () => {
      const app = initializeApp({});
      expect(getApp()).to.equal(app);
    });

    it('retrives named App', () => {
      const appName = 'MyApp';
      const app = initializeApp({}, appName);
      expect(getApp(appName)).to.equal(app);
    });

    it('throws retrieving a non existing App', () => {
      expect(() => getApp('RandomName')).throws(/No Firebase App 'RandomName'/);
    });
  });

  describe('getApps', () => {
    it('retrives all Apps that have been created', () => {
      const app1 = initializeApp({});
      const app2 = initializeApp({}, 'App2');

      const apps = getApps();

      expect(apps.length).to.equal(2);
      expect(apps[0]).to.equal(app1);
      expect(apps[1]).to.equal(app2);
    });

    it('does NOT return deleted Apps', () => {
      const app1 = initializeApp({});
      const app2 = initializeApp({}, 'App2');

      deleteApp(app1).catch(() => {});

      const apps = getApps();

      expect(apps.length).to.equal(1);
      expect(apps[0]).to.equal(app2);
    });
  });

  describe('deleteApp', () => {
    it('marks an App as deleted', async () => {
      const app = initializeApp({});
      expect((app as FirebaseAppInternalNext).isDeleted).to.be.false;

      await deleteApp(app).catch(() => {});
      expect((app as FirebaseAppInternalNext).isDeleted).to.be.true;
    });

    it('removes App from the cache', () => {
      const app = initializeApp({});
      expect(getApps().length).to.equal(1);

      deleteApp(app).catch(() => {});
      expect(getApps().length).to.equal(0);
    });
  });

  describe('registerVersion', () => {
    afterEach(() => {
      clearComponents();
    });

    it('will register an official version component without warnings', () => {
      const warnStub = stub(console, 'warn');
      const initialSize = components.size;

      registerVersion('@firebase/analytics', '1.2.3');
      expect(components.get('fire-analytics-version')).to.exist;
      expect(components.size).to.equal(initialSize + 1);

      expect(warnStub.called).to.be.false;
    });

    it('will register an arbitrary version component without warnings', () => {
      const warnStub = stub(console, 'warn');
      const initialSize = components.size;

      registerVersion('angularfire', '1.2.3');
      expect(components.get('angularfire-version')).to.exist;
      expect(components.size).to.equal(initialSize + 1);

      expect(warnStub.called).to.be.false;
    });

    it('will do nothing if registerVersion() is given illegal characters', () => {
      const warnStub = stub(console, 'warn');
      const initialSize = components.size;

      registerVersion('remote config', '1.2.3');
      expect(warnStub.args[0][1]).to.include('library name "remote config"');
      expect(components.size).to.equal(initialSize);

      registerVersion('remote-config', '1.2/3');
      expect(warnStub.args[1][1]).to.include('version name "1.2/3"');
      expect(components.size).to.equal(initialSize);
    });
  });
});
