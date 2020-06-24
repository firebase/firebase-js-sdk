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
import { stub } from 'sinon';
import '../test/setup';
import { createTestComponent, TestService } from '../test/util';
import { initializeApp, getApps, deleteApp } from './api';
import {
  _addComponent,
  _addOrOverwriteComponent,
  _registerComponent,
  _components,
  _clearComponents,
  _getProvider,
  _removeServiceInstance
} from './internal';
import { _FirebaseAppInternal } from '@firebase/app-types-exp';

declare module '@firebase/component' {
  interface NameServiceMapping {
    'test': TestService;
  }
}

describe('Internal API tests', () => {
  afterEach(() => {
    for (const app of getApps()) {
      deleteApp(app).catch(() => {});
    }
    _clearComponents();
  });

  describe('_addComponent', () => {
    it('registers component with App', () => {
      const app = initializeApp({}) as _FirebaseAppInternal;
      const testComp = createTestComponent('test');

      _addComponent(app, testComp);

      expect(app.container.getProvider('test').getComponent()).to.equal(
        testComp
      );
    });

    it('does NOT throw registering duplicate components', () => {
      const app = initializeApp({}) as _FirebaseAppInternal;
      const testComp = createTestComponent('test');

      _addComponent(app, testComp);

      expect(() => _addComponent(app, testComp)).to.not.throw();
      expect(app.container.getProvider('test').getComponent()).to.equal(
        testComp
      );
    });
  });

  describe('_addOrOverwriteComponent', () => {
    it('registers component with App', () => {
      const app = initializeApp({}) as _FirebaseAppInternal;
      const testComp = createTestComponent('test');

      _addOrOverwriteComponent(app, testComp);

      expect(app.container.getProvider('test').getComponent()).to.equal(
        testComp
      );
    });

    it('overwrites an existing component with the same name', () => {
      const app = initializeApp({}) as _FirebaseAppInternal;
      const testComp1 = createTestComponent('test');
      const testComp2 = createTestComponent('test');

      _addOrOverwriteComponent(app, testComp1);
      _addOrOverwriteComponent(app, testComp2);

      expect(app.container.getProvider('test').getComponent()).to.equal(
        testComp2
      );
    });
  });

  describe('_registerComponent', () => {
    it('caches a component and registers it with all Apps', () => {
      const app1 = initializeApp({}) as _FirebaseAppInternal;
      const app2 = initializeApp({}, 'app2') as _FirebaseAppInternal;

      const stub1 = stub(app1.container, 'addComponent').callThrough();
      const stub2 = stub(app2.container, 'addComponent').callThrough();

      const testComp = createTestComponent('test');
      _registerComponent(testComp);

      expect(_components.get('test')).to.equal(testComp);
      expect(stub1).to.have.been.calledWith(testComp);
      expect(stub2).to.have.been.calledWith(testComp);
    });

    it('returns true if registration is successful', () => {
      const testComp = createTestComponent('test');
      expect(_components.size).to.equal(0);
      expect(_registerComponent(testComp)).to.be.true;
      expect(_components.get('test')).to.equal(testComp);
    });

    it('does NOT throw when registering duplicate components and returns false', () => {
      const testComp1 = createTestComponent('test');
      const testComp2 = createTestComponent('test');
      expect(_components.size).to.equal(0);
      expect(_registerComponent(testComp1)).to.be.true;
      expect(_components.get('test')).to.equal(testComp1);
      expect(_registerComponent(testComp2)).to.be.false;
      expect(_components.get('test')).to.equal(testComp1);
    });
  });

  describe('_getProvider', () => {
    it('gets provider for a service', () => {
      const app1 = initializeApp({}) as _FirebaseAppInternal;
      const testComp = createTestComponent('test');
      _registerComponent(testComp);

      const provider = _getProvider(app1, 'test');
      expect(provider.getComponent()).to.equal(testComp);
    });
  });

  describe('_removeServiceInstance', () => {
    it('removes a service instance', () => {
      const app1 = initializeApp({}) as _FirebaseAppInternal;
      const testComp = createTestComponent('test');
      _registerComponent(testComp);
      const provider = app1.container.getProvider('test');

      // instantiate a service instance
      const instance1 = provider.getImmediate();
      _removeServiceInstance(app1, 'test');

      // should get a new instance since the previous instance has been removed
      const instance2 = provider.getImmediate();

      expect(instance1).to.not.equal(instance2);
    });
  });
});
