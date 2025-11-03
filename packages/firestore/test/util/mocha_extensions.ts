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

/* eslint-disable no-restricted-properties */

import { USE_EMULATOR } from '../integration/util/settings';

// Helper to make a type itselt (T) and optionally union that with (T['skip'])
type tOrSkipT<T> = T | (T extends { skip: unknown } ? T['skip'] : T);

interface ExtendMochaTypeWithHelpers<T> {
  // Declare helpers
  skipEmulator: tOrSkipT<T>;
  skipEnterprise: tOrSkipT<T>;
  skipClassic: tOrSkipT<T>;
}

declare module 'mocha' {
  // TODO add mocha types that must be extended
  interface TestFunction extends ExtendMochaTypeWithHelpers<TestFunction> {}
  interface PendingTestFunction
    extends ExtendMochaTypeWithHelpers<PendingTestFunction> {}
  interface SuiteFunction extends ExtendMochaTypeWithHelpers<SuiteFunction> {}
  interface PendingSuiteFunction
    extends ExtendMochaTypeWithHelpers<PendingTestFunction> {}
}

// Define helpers
export function mixinSkipImplementations(obj: unknown): void {
  Object.defineProperty(obj, 'skipEmulator', {
    get(): unknown {
      if (this === it.skip) {
        return this;
      }
      if (this === describe.skip) {
        return this;
      }
      if (USE_EMULATOR) {
        return this.skip;
      }
      return this;
    }
  });

  Object.defineProperty(obj, 'skipEnterprise', {
    get(): unknown {
      if (this === it.skip) {
        return this;
      }
      if (this === describe.skip) {
        return this;
      }
      if (process.env.RUN_ENTERPRISE_TESTS) {
        return this.skip;
      }
      return this;
    }
  });

  Object.defineProperty(obj, 'skipClassic', {
    get(): unknown {
      if (this === it.skip) {
        return this;
      }
      if (this === describe.skip) {
        return this;
      }
      if (!process.env.RUN_ENTERPRISE_TESTS) {
        return this.skip;
      }
      return this;
    }
  });
}

// TODO add mocha functions that must be extended
[global.it, global.it.skip, global.describe, global.describe.skip].forEach(
  mixinSkipImplementations
);

// Export modified it and describe.
const it = global.it;
const describe = global.describe;
export { it, describe };
