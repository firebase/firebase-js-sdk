/**
 * Copyright 2017 Google Inc.
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
import { ReferenceSet } from '../../../../src/firestore/local/reference_set';
import { asyncIt, expectSetToEqual, key } from '../../util/helpers';

describe('ReferenceSet', () => {
  asyncIt('can add/remove references', async () => {
    const documentKey = key('foo/bar');

    const refSet = new ReferenceSet();
    expect(refSet.isEmpty()).to.equal(true);
    expect(await refSet.containsKey(null, documentKey).toPromise()).to.equal(
      false
    );
    refSet.addReference(documentKey, 1);
    expect(refSet.isEmpty()).to.equal(false);
    expect(await refSet.containsKey(null, documentKey).toPromise()).to.equal(
      true
    );
    refSet.addReference(documentKey, 2);
    expect(await refSet.containsKey(null, documentKey).toPromise()).to.equal(
      true
    );
    refSet.removeReference(documentKey, 1);
    expect(await refSet.containsKey(null, documentKey).toPromise()).to.equal(
      true
    );
    refSet.removeReference(documentKey, 3);
    expect(await refSet.containsKey(null, documentKey).toPromise()).to.equal(
      true
    );
    refSet.removeReference(documentKey, 2);
    expect(await refSet.containsKey(null, documentKey).toPromise()).to.equal(
      false
    );
    expect(refSet.isEmpty()).to.equal(true);
  });

  asyncIt('can remove all references for a target ID', async () => {
    const key1 = key('foo/bar');
    const key2 = key('foo/baz');
    const key3 = key('foo/blah');
    const refSet = new ReferenceSet();

    refSet.addReference(key1, 1);
    refSet.addReference(key2, 1);
    refSet.addReference(key3, 2);
    expect(refSet.isEmpty()).to.equal(false);
    expect(await refSet.containsKey(null, key1).toPromise()).to.equal(true);
    expect(await refSet.containsKey(null, key2).toPromise()).to.equal(true);
    expect(await refSet.containsKey(null, key3).toPromise()).to.equal(true);
    refSet.removeReferencesForId(1);
    expect(refSet.isEmpty()).to.equal(false);
    expect(await refSet.containsKey(null, key1).toPromise()).to.equal(false);
    expect(await refSet.containsKey(null, key2).toPromise()).to.equal(false);
    expect(await refSet.containsKey(null, key3).toPromise()).to.equal(true);
    refSet.removeReferencesForId(2);
    expect(refSet.isEmpty()).to.equal(true);
    expect(await refSet.containsKey(null, key1).toPromise()).to.equal(false);
    expect(await refSet.containsKey(null, key2).toPromise()).to.equal(false);
    expect(await refSet.containsKey(null, key3).toPromise()).to.equal(false);
  });
});
