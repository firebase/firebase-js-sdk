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

import { expect } from 'chai';

import { _getInstance } from './instantiator';

describe('src/core/util/instantiator', () => {
  context('_getInstance', () => {
    // All tests define their own classes since the Class object is used in the
    // global map.

    it('instantiates a new class', () => {
      let classInstantiated = false;
      class Persistence {
        static type: 'LOCAL' = 'LOCAL';
        constructor() {
          classInstantiated = true;
        }
      }

      _getInstance(Persistence);
      expect(classInstantiated).to.be.true;
    });

    it('instantiates a class only once', () => {
      let instantiationCount = 0;
      class Persistence {
        static type: 'LOCAL' = 'LOCAL';
        constructor() {
          instantiationCount++;
        }
      }

      _getInstance(Persistence);
      _getInstance(Persistence);
      _getInstance(Persistence);

      expect(instantiationCount).to.eq(1);
    });

    it('caches correctly', () => {
      class PersistenceA {
        static type: 'LOCAL' = 'LOCAL';
      }
      class PersistenceB {
        static type: 'LOCAL' = 'LOCAL';
      }

      const a = _getInstance(PersistenceA);
      const b = _getInstance(PersistenceB);
      expect(_getInstance(PersistenceA)).to.eq(a);
      expect(_getInstance(PersistenceB)).to.eq(b);
    });

    it('instantiates any class', () => {
      class Test {}

      const a = _getInstance(Test);
      const b = _getInstance(Test);

      expect(a).to.be.instanceOf(Test);
      expect(a).to.eq(b);
    });
  });
});
