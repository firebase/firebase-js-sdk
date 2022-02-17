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
import { expect } from 'chai';

import { User } from '../../../src/auth/user';
import { IndexedDbPersistence } from '../../../src/local/indexeddb_persistence';
import { Persistence } from '../../../src/local/persistence';
import { documentKeySet, DocumentKeySet } from '../../../src/model/collections';
import { DocumentKey } from '../../../src/model/document_key';
import { Mutation, mutationEquals } from '../../../src/model/mutation';
import { Overlay } from '../../../src/model/overlay';
import { addEqualityMatcher } from '../../util/equality_matcher';
import {
  deleteMutation,
  key,
  patchMutation,
  path,
  setMutation
} from '../../util/helpers';

import * as persistenceHelpers from './persistence_test_helpers';
import { TestDocumentOverlayCache } from './test_document_overlay_cache';

let persistence: Persistence;
let overlayCache: TestDocumentOverlayCache;

describe('MemoryDocumentOverlayCache', () => {
  beforeEach(() => {
    return persistenceHelpers.testMemoryEagerPersistence().then(p => {
      persistence = p;
    });
  });

  genericDocumentOverlayCacheTests();
});

describe('IndexedDbDocumentOverlayCache', () => {
  if (!IndexedDbPersistence.isAvailable()) {
    console.warn('No IndexedDB. Skipping IndexedDbMutationQueue tests.');
    return;
  }

  beforeEach(() => {
    return persistenceHelpers.testIndexedDbPersistence().then(p => {
      persistence = p;
    });
  });

  genericDocumentOverlayCacheTests();
});

/**
 * Defines the set of tests to run against both document overlay cache
 * implementations.
 */
function genericDocumentOverlayCacheTests(): void {
  addEqualityMatcher();

  beforeEach(() => {
    overlayCache = new TestDocumentOverlayCache(
      persistence,
      persistence.getDocumentOverlayCache(new User('user'))
    );
  });

  afterEach(async () => {
    await persistence.shutdown();
    await persistenceHelpers.clearTestPersistence();
  });

  function saveOverlaysForMutations(
    largestBatch: number,
    ...mutations: Mutation[]
  ): Promise<void> {
    const data: Map<DocumentKey, Mutation> = new Map<DocumentKey, Mutation>();
    for (const mutation of mutations) {
      data.set(mutation.key, mutation);
    }
    return overlayCache.saveOverlays(largestBatch, data);
  }

  function saveOverlaysForKeys(
    largestBatch: number,
    ...overlayKeys: string[]
  ): Promise<void> {
    const data: Map<DocumentKey, Mutation> = new Map<DocumentKey, Mutation>();
    for (const overlayKey of overlayKeys) {
      data.set(key(overlayKey), setMutation(overlayKey, {}));
    }
    return overlayCache.saveOverlays(largestBatch, data);
  }

  function verifyEqualMutations(
    m1: Mutation | null,
    m2: Mutation | null
  ): void {
    expect(m1 === null).to.equal(m2 === null);
    if (m1 !== null && m2 !== null) {
      expect(mutationEquals(m1!, m2!)).to.equal(true);
    }
  }

  function verifyOverlayContains(
    overlays: Map<DocumentKey, Overlay>,
    ...keys: string[]
  ): void {
    const overlayKeys: DocumentKeySet = documentKeySet(
      ...Array.from(overlays.keys())
    );
    const expectedKeys: DocumentKeySet = documentKeySet(
      ...Array.from(keys.map(value => key(value)))
    );
    expect(overlayKeys.isEqual(expectedKeys)).to.equal(true);
  }

  it('returns null when overlay is not found', async () => {
    expect(await overlayCache.getOverlay(key('coll/doc1'))).to.equal(null);
  });

  it('can read saved overlay', async () => {
    const m = patchMutation('coll/doc1', { 'foo': 'bar' });
    await saveOverlaysForMutations(2, m);
    verifyEqualMutations(await overlayCache.getOverlayMutation('coll/doc1'), m);
  });

  it('can read saved overlays', async () => {
    const m1 = patchMutation('coll/doc1', { 'foo': 'bar' });
    const m2 = setMutation('coll/doc2', { 'foo': 'bar' });
    const m3 = deleteMutation('coll/doc3');
    await saveOverlaysForMutations(3, m1, m2, m3);
    verifyEqualMutations(
      await overlayCache.getOverlayMutation('coll/doc1'),
      m1
    );
    verifyEqualMutations(
      await overlayCache.getOverlayMutation('coll/doc2'),
      m2
    );
    verifyEqualMutations(
      await overlayCache.getOverlayMutation('coll/doc3'),
      m3
    );
  });

  it('can overwrite overlays', async () => {
    const m1 = patchMutation('coll/doc1', { 'foo': 'bar' });
    const m2 = setMutation('coll/doc1', { 'foo': 'set', 'bar': 42 });
    await saveOverlaysForMutations(2, m1);
    await saveOverlaysForMutations(2, m2);
    verifyEqualMutations(
      await overlayCache.getOverlayMutation('coll/doc1'),
      m2
    );
  });

  it('can delete overlays repeatedly', async () => {
    const m = patchMutation('coll/doc1', { 'foo': 'bar' });
    await saveOverlaysForMutations(2, m);
    await overlayCache.removeOverlaysForBatchId(
      documentKeySet(key('coll/doc1')),
      2
    );
    expect(await overlayCache.getOverlay(key('coll/doc1'))).to.equal(null);

    // Repeat
    await overlayCache.removeOverlaysForBatchId(
      documentKeySet(key('coll/doc1')),
      2
    );
    expect(await overlayCache.getOverlay(key('coll/doc1'))).to.equal(null);
  });

  it('can delete overlays', async () => {
    const m1 = patchMutation('coll1/doc1', { 'a': 'b' });
    const m2 = patchMutation('coll1/doc2', { 'a': 'b' });
    const m3 = patchMutation('coll1/doc3', { 'a': 'b' });
    const m4 = patchMutation('coll1/doc4', { 'a': 'b' });
    const m5 = patchMutation('coll2/doc1/coll3/doc1', { 'a': 'b' });
    const m6 = patchMutation('coll2/doc2/coll3/doc2', { 'a': 'b' });
    await saveOverlaysForMutations(2, m1, m2);
    await saveOverlaysForMutations(3, m3);
    await saveOverlaysForMutations(4, m4);
    await saveOverlaysForMutations(2, m5, m6);

    // Remove documents with batch id 2.
    const set1 = documentKeySet(
      key('coll1/doc1'),
      key('coll1/doc2'),
      key('coll2/doc1/coll3/doc1'),
      key('coll2/doc2/coll3/doc2')
    );
    await overlayCache.removeOverlaysForBatchId(set1, 2);
    expect(await overlayCache.getOverlay(key('coll1/doc1'))).to.equal(null);
    expect(await overlayCache.getOverlay(key('coll1/doc2'))).to.equal(null);
    expect(
      await overlayCache.getOverlay(key('coll2/doc1/coll3/doc1'))
    ).to.equal(null);
    expect(
      await overlayCache.getOverlay(key('coll2/doc2/coll3/doc2'))
    ).to.equal(null);
    expect(await overlayCache.getOverlay(key('coll1/doc3'))).to.not.equal(null);
    expect(await overlayCache.getOverlay(key('coll1/doc4'))).to.not.equal(null);

    // Remove documents with batch id 3.
    await overlayCache.removeOverlaysForBatchId(
      documentKeySet(key('coll1/doc3')),
      3
    );
    expect(await overlayCache.getOverlay(key('coll1/doc3'))).to.equal(null);
    expect(await overlayCache.getOverlay(key('coll1/doc4'))).to.not.equal(null);

    // Remove documents with batch id 4.
    await overlayCache.removeOverlaysForBatchId(
      documentKeySet(key('coll1/doc4')),
      4
    );
    expect(await overlayCache.getOverlay(key('coll1/doc4'))).to.equal(null);
  });

  it('can get all overlays for collection', async () => {
    const m1 = patchMutation('coll/doc1', { 'foo': 'bar' });
    const m2 = setMutation('coll/doc2', { 'foo': 'bar' });
    const m3 = deleteMutation('coll/doc3');
    // m4 and m5 are not under "coll"
    const m4 = setMutation('coll/doc1/sub/sub_doc', { 'foo': 'bar' });
    const m5 = setMutation('other/doc1', { 'foo': 'bar' });
    await saveOverlaysForMutations(3, m1, m2, m3, m4, m5);

    const overlays = await overlayCache.getOverlaysForCollection(
      path('coll'),
      -1
    );
    verifyOverlayContains(overlays, 'coll/doc1', 'coll/doc2', 'coll/doc3');
  });

  it('can get all overlays since batch ID', async () => {
    await saveOverlaysForKeys(2, 'coll/doc1', 'coll/doc2');
    await saveOverlaysForKeys(3, 'coll/doc3');
    await saveOverlaysForKeys(4, 'coll/doc4');

    const overlays = await overlayCache.getOverlaysForCollection(
      path('coll'),
      2
    );
    verifyOverlayContains(overlays, 'coll/doc3', 'coll/doc4');
  });

  it('can get all overlays for collection group', async () => {
    await saveOverlaysForKeys(2, 'coll1/doc1', 'coll2/doc1');
    await saveOverlaysForKeys(3, 'coll2/doc1/coll1/doc2');
    await saveOverlaysForKeys(4, 'coll2/doc2');

    const overlays = await overlayCache.getOverlaysForCollectionGroup(
      'coll1',
      -1,
      50
    );
    verifyOverlayContains(overlays, 'coll1/doc1', 'coll2/doc1/coll1/doc2');
  });

  it('getting overlays from collection group enforces batch ID', async () => {
    await saveOverlaysForKeys(2, 'coll/doc1');
    await saveOverlaysForKeys(3, 'coll/doc2');

    const overlays = await overlayCache.getOverlaysForCollectionGroup(
      'coll',
      2,
      50
    );
    verifyOverlayContains(overlays, 'coll/doc2');
  });

  it('getting overlays from collection group enforces count limit', async () => {
    await saveOverlaysForKeys(1, 'coll/doc1');
    await saveOverlaysForKeys(2, 'coll/doc2');
    await saveOverlaysForKeys(3, 'coll/doc3');

    const overlays = await overlayCache.getOverlaysForCollectionGroup(
      'coll',
      -1,
      2
    );
    verifyOverlayContains(overlays, 'coll/doc1', 'coll/doc2');
  });

  it('getting overlays from collection group does not return partial batches', async () => {
    await saveOverlaysForKeys(1, 'coll/doc1');
    await saveOverlaysForKeys(2, 'coll/doc2', 'coll/doc3');

    const overlays = await overlayCache.getOverlaysForCollectionGroup(
      'coll',
      -1,
      2
    );
    verifyOverlayContains(overlays, 'coll/doc1', 'coll/doc2', 'coll/doc3');
  });

  it('updating an overlay removes the old entry for that overlay', async () => {
    const m1 = patchMutation('coll/doc', { 'foo': '1' });
    const m2 = patchMutation('coll/doc', { 'foo': '2' });
    await saveOverlaysForMutations(1, m1);
    await saveOverlaysForMutations(2, m2);

    // Verify that `getOverlay()` returns the updated mutation.
    const overlay = await overlayCache.getOverlay(key('coll/doc'));
    verifyEqualMutations(overlay!.mutation, m2);

    // Verify that `removeOverlaysForBatchId()` removes the overlay completely.
    await overlayCache.removeOverlaysForBatchId(
      documentKeySet(key('coll/doc')),
      2
    );
    expect(await overlayCache.getOverlay(key('coll/doc'))).to.equal(null);
  });
}
