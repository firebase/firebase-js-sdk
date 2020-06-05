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

import { Query } from '../../../src/core/query';
import { View } from '../../../src/core/view';
import { ChangeType } from '../../../src/core/view_snapshot';
import { documentKeySet } from '../../../src/model/collections';
import {
  ackTarget,
  applyDocChanges,
  doc,
  documentSetAsArray,
  documentUpdates,
  filter,
  keySet,
  limboChanges,
  orderBy,
  path,
  updateMapping,
  version
} from '../../util/helpers';

describe('View', () => {
  it('adds documents based on query', () => {
    // shallow ancestor query
    const query = Query.atPath(path('rooms/eros/messages'));
    const view = new View(query, documentKeySet());

    const doc1 = doc('rooms/eros/messages/1', 0, { text: 'msg1' });
    const doc2 = doc('rooms/eros/messages/2', 0, { text: 'msg2' });
    const doc3 = doc('rooms/other/messages/1', 0, { text: 'msg3' });

    const changes = view.computeDocChanges(documentUpdates(doc1, doc2, doc3));
    const snapshot = view.applyChanges(
      changes,
      true,
      ackTarget(doc1, doc2, doc3)
    ).snapshot!;

    expect(snapshot.query).to.deep.equal(query);
    expect(documentSetAsArray(snapshot.docs)).to.deep.equal([doc1, doc2]);
    expect(snapshot.docChanges).to.deep.equal([
      { type: ChangeType.Added, doc: doc1 },
      { type: ChangeType.Added, doc: doc2 }
    ]);
    expect(snapshot.fromCache).to.equal(false);
    expect(snapshot.syncStateChanged).to.equal(true);
    expect(snapshot.hasPendingWrites).to.equal(false);
  });

  it('removes documents', () => {
    // shallow ancestor query
    const query = Query.atPath(path('rooms/eros/messages'));
    const view = new View(query, documentKeySet());

    const doc1 = doc('rooms/eros/messages/1', 0, { text: 'msg1' });
    const doc2 = doc('rooms/eros/messages/2', 0, { text: 'msg2' });
    const doc3 = doc('rooms/eros/messages/3', 0, { text: 'msg3' });

    // initial state
    applyDocChanges(view, doc1, doc2);

    // delete doc2, add doc3
    const changes = view.computeDocChanges(documentUpdates(doc2.key, doc3));
    const snapshot = view.applyChanges(changes, true, ackTarget(doc1, doc3))
      .snapshot!;

    expect(snapshot.query).to.deep.equal(query);
    expect(documentSetAsArray(snapshot.docs)).to.deep.equal([doc1, doc3]);
    expect(snapshot.docChanges).to.deep.equal([
      { type: ChangeType.Removed, doc: doc2 },
      { type: ChangeType.Added, doc: doc3 }
    ]);
    expect(snapshot.fromCache).to.equal(false);
    expect(snapshot.syncStateChanged).to.equal(true);
  });

  it('returns null if there are no changes', () => {
    // shallow ancestor query
    const query = Query.atPath(path('rooms/eros/messages'));
    const view = new View(query, documentKeySet());

    const doc1 = doc('rooms/eros/messages/1', 0, { text: 'msg1' });
    const doc2 = doc('rooms/eros/messages/2', 0, { text: 'msg2' });

    // initial state
    applyDocChanges(view, doc1, doc2);

    // reapply same docs, no changes
    expect(applyDocChanges(view, doc1, doc2).snapshot).to.be.undefined;
  });

  it('does not return null for the first changes', () => {
    const query = Query.atPath(path('rooms/eros/messages'));
    const view = new View(query, documentKeySet());
    expect(applyDocChanges(view)).not.to.equal(null);
  });

  it('filters documents based on query with filter', () => {
    // shallow ancestor query
    const query = Query.atPath(path('rooms/eros/messages')).addFilter(
      filter('sort', '<=', 2)
    );
    const view = new View(query, documentKeySet());

    const doc1 = doc('rooms/eros/messages/1', 0, { sort: 1 });
    const doc2 = doc('rooms/eros/messages/2', 0, { sort: 2 });
    const doc3 = doc('rooms/eros/messages/3', 0, { sort: 3 });
    const doc4 = doc('rooms/eros/messages/4', 0, {}); // no sort, no match
    const doc5 = doc('rooms/eros/messages/5', 0, { sort: 1 });

    const snapshot = applyDocChanges(view, doc1, doc2, doc3, doc4, doc5)
      .snapshot!;

    expect(snapshot.query).to.deep.equal(query);
    expect(documentSetAsArray(snapshot.docs)).to.deep.equal([doc1, doc5, doc2]);
    expect(snapshot.docChanges).to.deep.equal([
      { type: ChangeType.Added, doc: doc1 },
      { type: ChangeType.Added, doc: doc5 },
      { type: ChangeType.Added, doc: doc2 }
    ]);
    expect(snapshot.fromCache).to.equal(true);
    expect(snapshot.syncStateChanged).to.equal(true);
  });

  it('updates documents based on query with filter', () => {
    // shallow ancestor query
    const query = Query.atPath(path('rooms/eros/messages')).addFilter(
      filter('sort', '<=', 2)
    );
    const view = new View(query, documentKeySet());

    const doc1 = doc('rooms/eros/messages/1', 0, { sort: 1 });
    const doc2 = doc('rooms/eros/messages/2', 0, { sort: 3 });
    const doc3 = doc('rooms/eros/messages/3', 0, { sort: 2 });
    const doc4 = doc('rooms/eros/messages/4', 0, {});

    let snapshot = applyDocChanges(view, doc1, doc2, doc3, doc4).snapshot!;
    expect(documentSetAsArray(snapshot.docs)).to.deep.equal([doc1, doc3]);

    const newDoc2 = doc('rooms/eros/messages/2', 1, { sort: 2 });
    const newDoc3 = doc('rooms/eros/messages/3', 1, { sort: 3 });
    const newDoc4 = doc('rooms/eros/messages/4', 1, { sort: 0 });

    snapshot = applyDocChanges(view, newDoc2, newDoc3, newDoc4).snapshot!;
    expect(snapshot.query).to.deep.equal(query);

    expect(documentSetAsArray(snapshot.docs)).to.deep.equal([
      newDoc4,
      doc1,
      newDoc2
    ]);
    expect(snapshot.docChanges).to.deep.equal([
      { type: ChangeType.Removed, doc: doc3 },
      { type: ChangeType.Added, doc: newDoc4 },
      { type: ChangeType.Added, doc: newDoc2 }
    ]);
  });

  it('removes documents for query with limit', () => {
    // shallow ancestor query
    const query = Query.atPath(path('rooms/eros/messages')).withLimitToFirst(2);
    const view = new View(query, documentKeySet());

    const doc1 = doc('rooms/eros/messages/1', 0, { text: 'msg1' });
    const doc2 = doc('rooms/eros/messages/2', 0, { text: 'msg2' });
    const doc3 = doc('rooms/eros/messages/3', 0, { text: 'msg3' });

    // initial state
    applyDocChanges(view, doc1, doc3);

    // add doc2, which should push out doc3
    const changes = view.computeDocChanges(documentUpdates(doc2));
    const snapshot = view.applyChanges(
      changes,
      true,
      ackTarget(doc1, doc2, doc3)
    ).snapshot!;

    expect(snapshot.query).to.deep.equal(query);
    expect(documentSetAsArray(snapshot.docs)).to.deep.equal([doc1, doc2]);
    expect(snapshot.docChanges).to.deep.equal([
      { type: ChangeType.Removed, doc: doc3 },
      { type: ChangeType.Added, doc: doc2 }
    ]);
    expect(snapshot.fromCache).to.equal(false);
    expect(snapshot.syncStateChanged).to.equal(true);
  });

  it("doesn't report changes for documents beyond limit of query", () => {
    // shallow ancestor query
    const query = Query.atPath(path('rooms/eros/messages'))
      .addOrderBy(orderBy('num'))
      .withLimitToFirst(2);
    const view = new View(query, documentKeySet());

    const doc1 = doc('rooms/eros/messages/1', 0, { num: 1 });
    let doc2 = doc('rooms/eros/messages/2', 0, { num: 2 });
    const doc3 = doc('rooms/eros/messages/3', 0, { num: 3 });
    const doc4 = doc('rooms/eros/messages/4', 0, { num: 4 });

    // initial state
    applyDocChanges(view, doc1, doc2);

    // change doc2 to 5, and add doc3 and doc4.
    // doc2 will be modified + removed = removed
    // doc3 will be added
    // doc4 will be added + removed = nothing
    doc2 = doc('rooms/eros/messages/2', 1, { num: 5 });
    let changes = view.computeDocChanges(documentUpdates(doc2, doc3, doc4));
    expect(changes.needsRefill).to.equal(true);
    // Verify that all the docs still match.
    changes = view.computeDocChanges(
      documentUpdates(doc1, doc2, doc3, doc4),
      changes
    );
    const snapshot = view.applyChanges(
      changes,
      true,
      ackTarget(doc1, doc2, doc3, doc4)
    ).snapshot!;

    expect(snapshot.query).to.deep.equal(query);
    expect(documentSetAsArray(snapshot.docs)).to.deep.equal([doc1, doc3]);
    expect(snapshot.docChanges).to.deep.equal([
      { type: ChangeType.Removed, doc: doc2 },
      { type: ChangeType.Added, doc: doc3 }
    ]);
    expect(snapshot.fromCache).to.equal(false);
    expect(snapshot.syncStateChanged).to.equal(true);
  });

  it('keeps track of limbo documents', () => {
    const query = Query.atPath(path('rooms/eros/msgs'));
    const doc1 = doc('rooms/eros/msgs/0', 0, {});
    const doc2 = doc('rooms/eros/msgs/1', 0, {});
    const doc3 = doc('rooms/eros/msgs/2', 0, {});
    const view = new View(query, documentKeySet());

    let changes = view.computeDocChanges(documentUpdates(doc1));
    let viewChange = view.applyChanges(changes, true);
    expect(viewChange.limboChanges).to.deep.equal([]);

    changes = view.computeDocChanges(documentUpdates());
    viewChange = view.applyChanges(changes, true, ackTarget());
    expect(viewChange.limboChanges).to.deep.equal(
      limboChanges({ added: [doc1] })
    );

    viewChange = view.applyChanges(
      changes,
      true,
      updateMapping(version(0), [doc1], [], [], /* current= */ true)
    );
    expect(viewChange.limboChanges).to.deep.equal(
      limboChanges({ removed: [doc1] })
    );

    changes = view.computeDocChanges(documentUpdates(doc2));
    viewChange = view.applyChanges(
      changes,
      true,
      updateMapping(version(0), [doc2], [], [], /* current= */ true)
    );
    expect(viewChange.limboChanges).to.deep.equal([]);

    viewChange = applyDocChanges(view, doc3);
    expect(viewChange.limboChanges).to.deep.equal(
      limboChanges({ added: [doc3] })
    );

    viewChange = applyDocChanges(view, doc3.key /* remove */);
    expect(viewChange.limboChanges).to.deep.equal(
      limboChanges({ removed: [doc3] })
    );
  });

  it('is marked from cache with limbo documents', () => {
    const query = Query.atPath(path('rooms/eros/msgs'));
    const view = new View(query, documentKeySet());
    const doc1 = doc('rooms/eros/msgs/0', 0, {});
    const doc2 = doc('rooms/eros/msgs/1', 0, {});

    // Doc1 is contained in the local view, but we are not yet CURRENT so we
    // are getting a snapshot from cache.
    let changes = view.computeDocChanges(documentUpdates(doc1));
    let viewChange = view.applyChanges(
      changes,
      /* updateLimboDocuments= */ true
    );
    expect(viewChange.snapshot!.fromCache).to.be.true;

    // Add doc2 to generate a snapshot. Doc1 is still missing.
    changes = view.computeDocChanges(documentUpdates(doc2));
    viewChange = view.applyChanges(changes, /* updateLimboDocuments= */ true);
    expect(viewChange.snapshot!.fromCache).to.be.true;

    // Add doc2 to the backend's result set.
    viewChange = view.applyChanges(
      changes,
      /* updateLimboDocuments= */ true,
      updateMapping(version(0), [doc2], [], [], /* current= */ true)
    );
    // We are CURRENT but doc1 is in limbo.
    expect(viewChange.snapshot!.fromCache).to.be.true;

    // Add doc1 to the backend's result set.
    viewChange = view.applyChanges(
      changes,
      /* updateLimboDocuments= */ true,
      updateMapping(version(0), [doc1], [], [], /* current= */ true)
    );
    expect(viewChange.snapshot!.fromCache).to.be.false;
  });

  it('resumes queries without creating limbo documents', () => {
    const query = Query.atPath(path('rooms/eros/msgs'));
    const doc1 = doc('rooms/eros/msgs/0', 0, {});
    const doc2 = doc('rooms/eros/msgs/1', 0, {});

    // Unlike other cases, here the view is initialized with a set of previously
    // synced documents which happens when listening to a previously listened-to
    // query.
    const view = new View(query, keySet(doc1.key, doc2.key));

    const changes = view.computeDocChanges(documentUpdates());
    const change = view.applyChanges(changes, true, ackTarget());
    expect(change.limboChanges).to.deep.equal([]);
  });

  it('returns needsRefill on delete limit query', () => {
    const query = Query.atPath(path('rooms/eros/msgs')).withLimitToFirst(2);
    const doc1 = doc('rooms/eros/msgs/0', 0, {});
    const doc2 = doc('rooms/eros/msgs/1', 0, {});
    const view = new View(query, documentKeySet());

    // Start with a full view.
    let changes = view.computeDocChanges(documentUpdates(doc1, doc2));
    expect(changes.documentSet.size).to.equal(2);
    expect(changes.needsRefill).to.equal(false);
    expect(changes.changeSet.getChanges().length).to.equal(2);
    view.applyChanges(changes, true);

    // Remove one of the docs.
    changes = view.computeDocChanges(documentUpdates(doc1.key));
    expect(changes.documentSet.size).to.equal(1);
    expect(changes.needsRefill).to.equal(true);
    expect(changes.changeSet.getChanges().length).to.equal(1);
    // Refill it with just the one doc remaining.
    changes = view.computeDocChanges(documentUpdates(doc2), changes);
    expect(changes.documentSet.size).to.equal(1);
    expect(changes.needsRefill).to.equal(false);
    expect(changes.changeSet.getChanges().length).to.equal(1);
    view.applyChanges(changes, true);
  });

  it('returns needsRefill on reorder in limit query', () => {
    const query = Query.atPath(path('rooms/eros/msgs'))
      .addOrderBy(orderBy('order'))
      .withLimitToFirst(2);
    const doc1 = doc('rooms/eros/msgs/0', 0, { order: 1 });
    let doc2 = doc('rooms/eros/msgs/1', 0, { order: 2 });
    const doc3 = doc('rooms/eros/msgs/2', 0, { order: 3 });
    const view = new View(query, documentKeySet());

    // Start with a full view.
    let changes = view.computeDocChanges(documentUpdates(doc1, doc2, doc3));
    expect(changes.documentSet.size).to.equal(2);
    expect(changes.needsRefill).to.equal(false);
    expect(changes.changeSet.getChanges().length).to.equal(2);
    view.applyChanges(changes, true);

    // Move one of the docs.
    doc2 = doc(doc2.key.toString(), 1, { order: 2000 });
    changes = view.computeDocChanges(documentUpdates(doc2));
    expect(changes.documentSet.size).to.equal(2);
    expect(changes.needsRefill).to.equal(true);
    expect(changes.changeSet.getChanges().length).to.equal(1);
    // Refill it with all three current docs.
    changes = view.computeDocChanges(
      documentUpdates(doc1, doc2, doc3),
      changes
    );
    expect(changes.documentSet.size).to.equal(2);
    expect(changes.needsRefill).to.equal(false);
    expect(changes.changeSet.getChanges().length).to.equal(2);
    view.applyChanges(changes, true);
  });

  it("doesn't need refill on reorder within limit", () => {
    const query = Query.atPath(path('rooms/eros/msgs'))
      .addOrderBy(orderBy('order'))
      .withLimitToFirst(3);
    let doc1 = doc('rooms/eros/msgs/0', 0, { order: 1 });
    const doc2 = doc('rooms/eros/msgs/1', 0, { order: 2 });
    const doc3 = doc('rooms/eros/msgs/2', 0, { order: 3 });
    const doc4 = doc('rooms/eros/msgs/3', 0, { order: 4 });
    const doc5 = doc('rooms/eros/msgs/4', 0, { order: 5 });
    const view = new View(query, documentKeySet());

    // Start with a full view.
    let changes = view.computeDocChanges(
      documentUpdates(doc1, doc2, doc3, doc4, doc5)
    );
    expect(changes.documentSet.size).to.equal(3);
    expect(changes.needsRefill).to.equal(false);
    expect(changes.changeSet.getChanges().length).to.equal(3);
    view.applyChanges(changes, true);

    // Move one of the docs.
    doc1 = doc(doc1.key.toString(), 1, { order: 3 });
    changes = view.computeDocChanges(documentUpdates(doc1));
    expect(changes.documentSet.size).to.equal(3);
    expect(changes.needsRefill).to.equal(false);
    expect(changes.changeSet.getChanges().length).to.equal(1);
    view.applyChanges(changes, true);
  });

  it("doesn't need refill on reorder after limit query", () => {
    const query = Query.atPath(path('rooms/eros/msgs'))
      .addOrderBy(orderBy('order'))
      .withLimitToFirst(3);
    const doc1 = doc('rooms/eros/msgs/0', 0, { order: 1 });
    const doc2 = doc('rooms/eros/msgs/1', 0, { order: 2 });
    const doc3 = doc('rooms/eros/msgs/2', 0, { order: 3 });
    let doc4 = doc('rooms/eros/msgs/3', 0, { order: 4 });
    const doc5 = doc('rooms/eros/msgs/4', 0, { order: 5 });
    const view = new View(query, documentKeySet());

    // Start with a full view.
    let changes = view.computeDocChanges(
      documentUpdates(doc1, doc2, doc3, doc4, doc5)
    );
    expect(changes.documentSet.size).to.equal(3);
    expect(changes.needsRefill).to.equal(false);
    expect(changes.changeSet.getChanges().length).to.equal(3);
    view.applyChanges(changes, true);

    // Move one of the docs.
    doc4 = doc(doc4.key.toString(), 1, { order: 6 });
    changes = view.computeDocChanges(documentUpdates(doc4));
    expect(changes.documentSet.size).to.equal(3);
    expect(changes.needsRefill).to.equal(false);
    expect(changes.changeSet.getChanges().length).to.equal(0);
    view.applyChanges(changes, true);
  });

  it("doesn't need refill for additions after the limit", () => {
    const query = Query.atPath(path('rooms/eros/msgs')).withLimitToFirst(2);
    const doc1 = doc('rooms/eros/msgs/0', 0, {});
    const doc2 = doc('rooms/eros/msgs/1', 0, {});
    const view = new View(query, documentKeySet());

    // Start with a full view.
    let changes = view.computeDocChanges(documentUpdates(doc1, doc2));
    expect(changes.documentSet.size).to.equal(2);
    expect(changes.needsRefill).to.equal(false);
    expect(changes.changeSet.getChanges().length).to.equal(2);
    view.applyChanges(changes, true);

    // Add a doc that is past the limit.
    const doc3 = doc('rooms/eros/msgs/2', 0, {});
    changes = view.computeDocChanges(documentUpdates(doc3));
    expect(changes.documentSet.size).to.equal(2);
    expect(changes.needsRefill).to.equal(false);
    expect(changes.changeSet.getChanges().length).to.equal(0);
    view.applyChanges(changes, true);
  });

  it("doesn't need refill for deletions when not near the limit", () => {
    const query = Query.atPath(path('rooms/eros/msgs')).withLimitToFirst(20);
    const doc1 = doc('rooms/eros/msgs/0', 0, {});
    const doc2 = doc('rooms/eros/msgs/1', 0, {});
    const view = new View(query, documentKeySet());

    let changes = view.computeDocChanges(documentUpdates(doc1, doc2));
    expect(changes.documentSet.size).to.equal(2);
    expect(changes.needsRefill).to.equal(false);
    expect(changes.changeSet.getChanges().length).to.equal(2);
    view.applyChanges(changes, true);

    // Remove one of the docs.
    changes = view.computeDocChanges(documentUpdates(doc2.key));
    expect(changes.documentSet.size).to.equal(1);
    expect(changes.needsRefill).to.equal(false);
    expect(changes.changeSet.getChanges().length).to.equal(1);
    view.applyChanges(changes, true);
  });

  it('handles applying irrelevant docs', () => {
    const query = Query.atPath(path('rooms/eros/msgs')).withLimitToFirst(2);
    const doc1 = doc('rooms/eros/msgs/0', 0, {});
    const doc2 = doc('rooms/eros/msgs/1', 0, {});
    const view = new View(query, documentKeySet());

    // Start with a full view.
    let changes = view.computeDocChanges(documentUpdates(doc1, doc2));
    expect(changes.documentSet.size).to.equal(2);
    expect(changes.needsRefill).to.equal(false);
    expect(changes.changeSet.getChanges().length).to.equal(2);
    view.applyChanges(changes, true);

    // Remove a doc that isn't even in the results.
    const doc3 = doc('rooms/eros/msgs/2', 0, {});
    changes = view.computeDocChanges(documentUpdates(doc3.key));
    expect(changes.documentSet.size).to.equal(2);
    expect(changes.needsRefill).to.equal(false);
    expect(changes.changeSet.getChanges().length).to.equal(0);
    view.applyChanges(changes, true);
  });

  it('computes mutatedDocKeys', () => {
    const query = Query.atPath(path('rooms/eros/msgs'));
    const doc1 = doc('rooms/eros/msgs/0', 0, {});
    const doc2 = doc('rooms/eros/msgs/1', 0, {});
    const view = new View(query, documentKeySet());
    // Start with a full view.
    let changes = view.computeDocChanges(documentUpdates(doc1, doc2));
    view.applyChanges(changes, true);
    expect(changes.mutatedKeys).to.deep.equal(keySet());

    const doc3 = doc('rooms/eros/msgs/2', 0, {}, { hasLocalMutations: true });
    changes = view.computeDocChanges(documentUpdates(doc3));
    expect(changes.mutatedKeys).to.deep.equal(keySet(doc3.key));
  });

  it(
    'computes removes keys from mutatedDocKeys when new doc does not have ' +
      'local changes',
    () => {
      const query = Query.atPath(path('rooms/eros/msgs'));
      const doc1 = doc('rooms/eros/msgs/0', 0, {});
      const doc2 = doc('rooms/eros/msgs/1', 0, {}, { hasLocalMutations: true });
      const view = new View(query, documentKeySet());
      // Start with a full view.
      let changes = view.computeDocChanges(documentUpdates(doc1, doc2));
      view.applyChanges(changes, true);
      expect(changes.mutatedKeys).to.deep.equal(keySet(doc2.key));

      const doc2prime = doc('rooms/eros/msgs/1', 0, {});
      changes = view.computeDocChanges(documentUpdates(doc2prime));
      view.applyChanges(changes, true);
      expect(changes.mutatedKeys).to.deep.equal(keySet());
    }
  );

  it('remembers local mutations from previous snapshot', () => {
    const query = Query.atPath(path('rooms/eros/msgs'));
    const doc1 = doc('rooms/eros/msgs/0', 0, {});
    const doc2 = doc('rooms/eros/msgs/1', 0, {}, { hasLocalMutations: true });
    const view = new View(query, documentKeySet());
    // Start with a full view.
    let changes = view.computeDocChanges(documentUpdates(doc1, doc2));
    view.applyChanges(changes, true);
    expect(changes.mutatedKeys).to.deep.equal(keySet(doc2.key));

    const doc3 = doc('rooms/eros/msgs/3', 0, {});
    changes = view.computeDocChanges(documentUpdates(doc3));
    expect(changes.mutatedKeys.size).to.equal(1);
  });

  it('remembers local mutations from previous call to computeDocChanges', () => {
    const query = Query.atPath(path('rooms/eros/msgs'));
    const doc1 = doc('rooms/eros/msgs/0', 0, {});
    const doc2 = doc('rooms/eros/msgs/1', 0, {}, { hasLocalMutations: true });
    const view = new View(query, documentKeySet());
    // Start with a full view.
    let changes = view.computeDocChanges(documentUpdates(doc1, doc2));
    expect(changes.mutatedKeys).to.deep.equal(keySet(doc2.key));

    const doc3 = doc('rooms/eros/msgs/3', 0, {});
    changes = view.computeDocChanges(documentUpdates(doc3), changes);
    expect(changes.mutatedKeys).to.deep.equal(keySet(doc2.key));
  });
});
