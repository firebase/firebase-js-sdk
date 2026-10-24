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

import { use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import Module from 'module';

use(chaiAsPromised);
use(sinonChai);

// If @firebase/firestore is not built in this monorepo workspace, provide a fallback mock
// so unit tests for rules-unit-testing can execute without building unbuilt sibling packages.
try {
  require.resolve('@firebase/firestore');
} catch {
  const origResolve = (Module as any)._resolveFilename;
  (Module as any)._resolveFilename = function (
    request: string,
    parent: any,
    isMain: boolean,
    options: any
  ) {
    if (request === '@firebase/firestore') {
      return '@firebase/firestore-mock';
    }
    return origResolve.apply(this, arguments);
  };

  class MockTimestamp {
    constructor(readonly seconds: number, readonly nanoseconds: number) {}
    static now() {
      return new MockTimestamp(Math.floor(Date.now() / 1000), 0);
    }
  }

  require.cache['@firebase/firestore-mock'] = {
    id: '@firebase/firestore-mock',
    filename: '@firebase/firestore-mock',
    loaded: true,
    exports: {
      initializeFirestore: sinon.stub().callsFake((app: any, settings: any) => ({
        app,
        type: 'firestore',
        _settings: settings
      })),
      connectFirestoreEmulator: sinon.stub(),
      serverTimestamp: () => ({ _methodName: 'serverTimestamp' }),
      Timestamp: MockTimestamp
    }
  } as any;
}

export const mochaHooks = {
  afterEach() {
    sinon.restore();
  }
};

