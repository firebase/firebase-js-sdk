/**
 * @license
 * Copyright 2022 Google LLC
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

import { assert } from 'chai';

import { diffArrays } from '../../../src/util/array';

describe('diffArrays', () => {
  it('Missing Element', () => {
    validateDiffArray(['a', 'b', 'c'], ['a', 'b']);
    validateDiffArray(['a', 'b', 'c', 'd'], ['a', 'b']);
  });

  it('AddedElement', () => {
    validateDiffArray(['a', 'b'], ['a', 'b', 'c']);
    validateDiffArray(['a', 'b'], ['a', 'b', 'c', 'd']);
  });

  it('Without Ordering', () => {
    validateDiffArray(['a', 'b'], ['b', 'a']);
    validateDiffArray(['a', 'b', 'c'], ['c', 'b', 'a']);
  });

  it('Empty Lists', () => {
    validateDiffArray(['a'], []);
    validateDiffArray([], ['a']);
    validateDiffArray([], []);
  });

  function validateDiffArray(before: string[], after: string[]): void {
    const result = new Set<string>(before);
    diffArrays(
      before,
      after,
      (a, b) => a.localeCompare(b),
      v => {
        assert.notInclude(before, v);
        assert.include(after, v);
        result.add(v);
      },
      v => {
        assert.include(before, v);
        assert.notInclude(after, v);
        result.delete(v);
      }
    );
    assert.equal(result.size, after.length);
    for (const v of after) {
      assert.include(result, v);
    }
  }
});
