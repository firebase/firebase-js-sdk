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

import { extractDependencies } from '../../../../../scripts/exp/extract-deps.helpers';
import * as pkg from '../../../package.json';
import { forEach } from '../../../src/util/obj';

import * as dependencies from './dependencies.json';

// TODO(firestorexp): Enable test
// eslint-disable-next-line no-restricted-properties
describe.skip('Dependencies', () => {
  forEach(dependencies, (api, { dependencies }) => {
    it(api, () => {
      return extractDependencies(api, pkg.exp).then(extractedDependencies => {
        expect(extractedDependencies.classes).to.have.members(
          dependencies.classes,
          'for classes'
        );
        expect(extractedDependencies.functions).to.have.members(
          dependencies.functions,
          'for functions'
        );
        expect(extractedDependencies.variables).to.have.members(
          dependencies.variables,
          'for variables'
        );
      });
    });
  });
});
