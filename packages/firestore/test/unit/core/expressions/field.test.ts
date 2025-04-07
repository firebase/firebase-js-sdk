/**
 * @license
 * Copyright 2025 Google LLC
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

import {
  constant,
  eq,
  field,
  gt,
  gte,
  lt,
  lte,
  neq
} from '../../../../src/lite-api/expressions';
import { evaluateToResult, evaluateToValue } from './utils';
import { EvaluateResult } from '../../../../src/core/expressions';
import { TRUE_VALUE } from '../../../../src/model/values';

describe('Field expression', () => {
  it('can get field', () => {
    expect(evaluateToValue(field('exists'), { exists: true })).to.deep.equal(
      TRUE_VALUE
    );
  });

  it('error if not found', () => {
    expect(evaluateToResult(field('not-exists'))).to.deep.equal(
      EvaluateResult.newUnset()
    );
  });
});
