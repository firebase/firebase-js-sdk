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
import { EagerGarbageCollector } from '../../../../src/firestore/local/eager_garbage_collector';
import { ReferenceSet } from '../../../../src/firestore/local/reference_set';
import { expectSetToEqual, key } from '../../util/helpers';
import { asyncIt } from '../../util/helpers';

describe('EagerGarbageCollector', () => {
  asyncIt('can add or remove references', () => {
    const gc = new EagerGarbageCollector();
    const referenceSet = new ReferenceSet();
    gc.addGarbageSource(referenceSet);

    const documentKey = key('foo/bar');
    referenceSet.addReference(documentKey, 1);
    return gc
      .collectGarbage(null)
      .toPromise()
      .then(garbage => {
        expectSetToEqual(garbage, []);
        expect(referenceSet.isEmpty()).to.equal(false);

        referenceSet.removeReference(documentKey, 1);
        return gc.collectGarbage(null).toPromise();
      })
      .then(garbage => {
        expectSetToEqual(garbage, [documentKey]);
        expect(referenceSet.isEmpty()).to.equal(true);
      });
  });

  asyncIt('can remove all references for ID', () => {
    const gc = new EagerGarbageCollector();
    const referenceSet = new ReferenceSet();
    gc.addGarbageSource(referenceSet);

    const key1 = key('foo/bar');
    const key2 = key('foo/baz');
    const key3 = key('foo/blah');
    referenceSet.addReference(key1, 1);
    referenceSet.addReference(key2, 1);
    referenceSet.addReference(key3, 2);
    expect(referenceSet.isEmpty()).to.equal(false);

    referenceSet.removeReferencesForId(1);
    return gc
      .collectGarbage(null)
      .toPromise()
      .then(garbage => {
        expectSetToEqual(garbage, [key1, key2]);
        expect(referenceSet.isEmpty()).to.equal(false);

        referenceSet.removeReferencesForId(2);
        return gc.collectGarbage(true).toPromise();
      })
      .then(garbage => {
        expectSetToEqual(garbage, [key3]);
        expect(referenceSet.isEmpty()).to.equal(true);
      });
  });

  asyncIt('can handle two reference sets at the same time', () => {
    const remoteTargets = new ReferenceSet();
    const localViews = new ReferenceSet();
    const mutations = new ReferenceSet();

    const gc = new EagerGarbageCollector();
    gc.addGarbageSource(remoteTargets);
    gc.addGarbageSource(localViews);
    gc.addGarbageSource(mutations);

    const key1 = key('foo/bar');
    remoteTargets.addReference(key1, 1);
    localViews.addReference(key1, 1);
    mutations.addReference(key1, 10);

    const key2 = key('foo/baz');
    mutations.addReference(key2, 10);

    expect(remoteTargets.isEmpty()).to.equal(false);
    expect(localViews.isEmpty()).to.equal(false);
    expect(mutations.isEmpty()).to.equal(false);

    localViews.removeReferencesForId(1);
    return gc
      .collectGarbage(null)
      .toPromise()
      .then(garbage => {
        expectSetToEqual(garbage, []);

        remoteTargets.removeReferencesForId(1);
        return gc.collectGarbage(null).toPromise();
      })
      .then(garbage => {
        expectSetToEqual(garbage, []);

        mutations.removeReference(key1, 10);
        return gc.collectGarbage(null).toPromise();
      })
      .then(garbage => {
        expectSetToEqual(garbage, [key1]);

        mutations.removeReference(key2, 10);
        return gc.collectGarbage(null).toPromise();
      })
      .then(garbage => {
        expectSetToEqual(garbage, [key2]);

        expect(remoteTargets.isEmpty()).to.equal(true);
        expect(localViews.isEmpty()).to.equal(true);
        expect(mutations.isEmpty()).to.equal(true);
      });
  });
});
