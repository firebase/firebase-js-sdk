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

import { ReferenceSet } from '../../../src/local/reference_set';
import { key } from '../../util/helpers';

describe('ReferenceSet', () => {
  it('can add/remove references', () => {
    const documentKey = key('foo/bar');

    const refSet = new ReferenceSet();
    expect(refSet.isEmpty()).to.be.true;
    expect(refSet.containsKey(documentKey)).to.be.false;
    refSet.addReference(documentKey, 1);
    expect(refSet.isEmpty()).to.be.false;
    expect(refSet.containsKey(documentKey)).to.be.true;
    refSet.addReference(documentKey, 2);
    expect(refSet.containsKey(documentKey)).to.be.true;
    refSet.removeReference(documentKey, 1);
    expect(refSet.containsKey(documentKey)).to.be.true;
    refSet.removeReference(documentKey, 3);
    expect(refSet.containsKey(documentKey)).to.be.true;
    refSet.removeReference(documentKey, 2);
    expect(refSet.containsKey(documentKey)).to.be.false;
    expect(refSet.isEmpty()).to.be.true;
  });

  it('can remove all references for a target ID', () => {
    const key1 = key('foo/bar');
    const key2 = key('foo/baz');
    const key3 = key('foo/blah');
    const refSet = new ReferenceSet();

    refSet.addReference(key1, 1);
    refSet.addReference(key2, 1);
    refSet.addReference(key3, 2);
    expect(refSet.isEmpty()).to.be.false;
    expect(refSet.containsKey(key1)).to.be.true;
    expect(refSet.containsKey(key2)).to.be.true;
    expect(refSet.containsKey(key3)).to.be.true;
    refSet.removeReferencesForId(1);
    expect(refSet.isEmpty()).to.be.false;
    expect(refSet.containsKey(key1)).to.be.false;
    expect(refSet.containsKey(key2)).to.be.false;
    expect(refSet.containsKey(key3)).to.be.true;
    refSet.removeReferencesForId(2);
    expect(refSet.isEmpty()).to.be.true;
    expect(refSet.containsKey(key1)).to.be.false;
    expect(refSet.containsKey(key2)).to.be.false;
    expect(refSet.containsKey(key3)).to.be.false;
  });
});
