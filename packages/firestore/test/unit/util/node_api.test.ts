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

import { expect } from 'chai';

import { NodeCallback, nodePromise } from '../../../src/util/node_api';

describe('nodePromise', () => {
  it('resolves on success value', () => {
    return nodePromise((callback: NodeCallback<string>) => {
      callback(null, 'success');
    }).then((value: string) => {
      expect(value).to.equal('success');
    });
  });

  it('rejects on error', () => {
    const expected = new Error('error');

    return nodePromise((callback: NodeCallback<string>) => {
      callback(expected);
    })
      .then((value: string) => {
        expect.fail('should not have returned a value, got: ' + value);
      })
      .catch((err: unknown) => {
        expect(err).to.equal(expected);
      });
  });
});
