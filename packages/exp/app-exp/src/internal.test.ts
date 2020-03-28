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
import { createTestComponent, TestService } from '../test/util';
import { initializeApp, getApps, deleteApp } from './api';
import {
  addComponent,
  addOrOverwriteComponent,
  registerComponent,
  components,
  clearComponents
} from './internal';
import { FirebaseAppInternal } from '@firebase/app-types-exp';

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
  });

  describe('addComponent', () => {
    it('registers component with App', () => {
      const app = initializeApp({}) as FirebaseAppInternal;
      const testComp = createTestComponent('test');

      addComponent(app, testComp);

      expect(app.container.getProvider('test').getComponent()).to.equal(
        testComp
      );
    });
    it('does NOT throw registering duplicate components', () => {
      const app = initializeApp({}) as FirebaseAppInternal;
      const testComp = createTestComponent('test');

      addComponent(app, testComp);

      expect(() => addComponent(app, testComp)).to.not.throw();
      expect(app.container.getProvider('test').getComponent()).to.equal(
        testComp
      );
    });
  });

  describe('addOrOverwriteComponent', () => {
    it('registers component with App', () => {
      const app = initializeApp({}) as FirebaseAppInternal;
      const testComp = createTestComponent('test');

      addOrOverwriteComponent(app, testComp);

      expect(app.container.getProvider('test').getComponent()).to.equal(
        testComp
      );
    });

    it('overwrites an existing component with the same name', () => {
      const app = initializeApp({}) as FirebaseAppInternal;
      const testComp1 = createTestComponent('test');
      const testComp2 = createTestComponent('test');

      addOrOverwriteComponent(app, testComp1);
      addOrOverwriteComponent(app, testComp2);

      expect(app.container.getProvider('test').getComponent()).to.equal(
        testComp2
      );
    });
  });

  describe('registerComponent', () => {
    afterEach(() => {
      clearComponents();
    });

    it('caches a component and registers it with all Apps', () => {
      const app1 = initializeApp({}) as FirebaseAppInternal;
      const app2 = initializeApp({}, 'app2') as FirebaseAppInternal;

      const stub1 = stub(app1.container, 'addComponent').callThrough();
      const stub2 = stub(app2.container, 'addComponent').callThrough();

      const testComp = createTestComponent('test');
      registerComponent(testComp);

      expect(components.get('test')).to.equal(testComp);
      expect(stub1).to.have.been.calledWith(testComp);
      expect(stub2).to.have.been.calledWith(testComp);
    });

    it('returns true if registration is successful', () => {
      const testComp = createTestComponent('test');
      expect(components.size).to.equal(0);
      expect(registerComponent(testComp)).to.be.true;
      expect(components.get('test')).to.equal(testComp);
    });

    it('does NOT throw when registering duplicate components and returns false', () => {
      const testComp1 = createTestComponent('test');
      const testComp2 = createTestComponent('test');
      expect(components.size).to.equal(0);
      expect(registerComponent(testComp1)).to.be.true;
      expect(components.get('test')).to.equal(testComp1);
      expect(registerComponent(testComp2)).to.be.false;
      expect(components.get('test')).to.equal(testComp1);
    });
  });
});
