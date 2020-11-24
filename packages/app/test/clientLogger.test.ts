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

import { FirebaseNamespace, VersionService } from '@firebase/app-types';
import { _FirebaseNamespace } from '@firebase/app-types/private';
import { createFirebaseNamespace } from '../src/firebaseNamespace';
import { expect } from 'chai';
import { spy as Spy } from 'sinon';
import './setup';
import { Logger } from '@firebase/logger';
import { registerCoreComponents } from '../src/registerCoreComponents';
import { Component, ComponentType } from '@firebase/component';

declare module '@firebase/component' {
  interface NameServiceMapping {
    'vs1': VersionService;
    'vs2': VersionService;
    'test-shell': Promise<void>;
  }
}

describe('User Log Methods', () => {
  describe('Integration Tests', () => {
    let firebase: FirebaseNamespace;
    let result: any = null;
    const warnSpy = Spy(console, 'warn');
    const infoSpy = Spy(console, 'info');
    const logSpy = Spy(console, 'log');

    beforeEach(() => {
      firebase = createFirebaseNamespace();
    });

    it(`respects log level set through firebase.setLogLevel()`, () => {
      firebase.initializeApp({});
      registerCoreComponents(firebase);
      (firebase as _FirebaseNamespace).INTERNAL.registerComponent(
        new Component(
          'test-shell',
          async () => {
            const logger = new Logger('@firebase/logger-test');
            logger.warn('hello');
            expect(warnSpy.called).to.be.true;
            (firebase as _FirebaseNamespace).setLogLevel('warn');
            logger.info('hi');
            expect(infoSpy.called).to.be.false;
            logger.log('hi');
            expect(logSpy.called).to.be.false;
            logSpy.resetHistory();
            infoSpy.resetHistory();
            (firebase as _FirebaseNamespace).setLogLevel('debug');
            logger.info('hi');
            expect(infoSpy.called).to.be.true;
            logger.log('hi');
            expect(logSpy.called).to.be.true;
          },
          ComponentType.PUBLIC
        )
      );
      return (firebase as any)['test-shell']();
    });

    it(`correctly triggers callback given to firebase.onLog()`, () => {
      // Note: default log level is INFO.
      firebase.initializeApp({});
      registerCoreComponents(firebase);
      (firebase as _FirebaseNamespace).INTERNAL.registerComponent(
        new Component(
          'test-shell',
          async () => {
            const logger = new Logger('@firebase/logger-test');
            (firebase as _FirebaseNamespace).onLog(logData => {
              result = logData;
            });
            logger.info('hi');
            expect(result.level).to.equal('info');
            expect(result.message).to.equal('hi');
            expect(result.args).to.deep.equal(['hi']);
            expect(result.type).to.equal('@firebase/logger-test');
            expect(infoSpy.called).to.be.true;
          },
          ComponentType.PUBLIC
        )
      );
      return (firebase as any)['test-shell']();
    });
  });
});
