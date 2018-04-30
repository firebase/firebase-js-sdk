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
import { SnapshotVersion } from '../../../src/core/snapshot_version';
import { TargetId } from '../../../src/core/types';
import { QueryData } from '../../../src/local/query_data';
import { ExistenceFilter } from '../../../src/remote/existence_filter';
import {
  CurrentStatusUpdate,
  RemoteEvent,
  ResetMapping,
  UpdateMapping
} from '../../../src/remote/remote_event';
import {
  DocumentWatchChange,
  ExistenceFilterChange,
  WatchChange,
  WatchChangeAggregator,
  WatchTargetChange,
  WatchTargetChangeState
} from '../../../src/remote/watch_change';
import {
  deletedDoc,
  doc,
  expectEqual,
  size,
  updateMapping,
  version
} from '../../util/helpers';
import { DocumentKey } from '../../../src/model/document_key';
import { NoDocument } from '../../../src/model/document';
import { documentKeySet } from '../../../src/model/collections';

type TargetMap = {
  [targetId: number]: QueryData;
};
type PendingTargetResponses = {
  [targetId: number]: number;
};
const noPendingResponses: PendingTargetResponses = {};

function listens(...targetIds: TargetId[]): TargetMap {
  const targets: TargetMap = {};
  for (const target of targetIds) {
    targets[target] = {} as QueryData;
  }
  return targets;
}

function aggregator(
  version: number,
  targets: TargetMap,
  outstanding: PendingTargetResponses,
  ...changes: WatchChange[]
): WatchChangeAggregator {
  const aggregator = new WatchChangeAggregator(
    SnapshotVersion.fromMicroseconds(version),
    targets,
    outstanding
  );
  aggregator.addChanges(changes);
  return aggregator;
}

function remoteEvent(
  version: number,
  targets: TargetMap,
  outstanding: PendingTargetResponses,
  ...changes: WatchChange[]
): RemoteEvent {
  const aggregator = new WatchChangeAggregator(
    SnapshotVersion.fromMicroseconds(version),
    targets,
    outstanding
  );
  aggregator.addChanges(changes);
  return aggregator.createRemoteEvent();
}

describe('RemoteEvent', () => {
  it('will accumulate document added and removed events', () => {
    const doc1 = doc('docs/1', 1, { value: 1 });
    const doc2 = doc('docs/2', 2, { value: 2 });

    const targets = listens(1, 2, 3, 4, 5, 6);

    const change1 = new DocumentWatchChange(
      [1, 2, 3],
      [4, 5, 6],
      doc1.key,
      doc1
    );
    const change2 = new DocumentWatchChange([1, 4], [2, 6], doc2.key, doc2);

    const event = remoteEvent(3, targets, noPendingResponses, change1, change2);
    expectEqual(event.snapshotVersion, version(3));
    expect(event.documentUpdates.size).to.equal(2);
    expectEqual(event.documentUpdates.get(doc1.key), doc1);
    expectEqual(event.documentUpdates.get(doc2.key), doc2);

    expect(size(event.targetChanges)).to.equal(6);

    const mapping1 = updateMapping([doc1, doc2], []);
    expectEqual(event.targetChanges[1].mapping, mapping1);

    const mapping2 = updateMapping([doc1], [doc2]);
    expectEqual(event.targetChanges[2].mapping, mapping2);

    const mapping3 = updateMapping([doc1], []);
    expectEqual(event.targetChanges[3].mapping, mapping3);

    const mapping4 = updateMapping([doc2], [doc1]);
    expectEqual(event.targetChanges[4].mapping, mapping4);

    const mapping5 = updateMapping([], [doc1]);
    expectEqual(event.targetChanges[5].mapping, mapping5);

    const mapping6 = updateMapping([], [doc1, doc2]);
    expectEqual(event.targetChanges[6].mapping, mapping6);
  });

  it('will ignore events for pending targets', () => {
    const doc1 = doc('docs/1', 1, { value: 1 });
    const doc2 = doc('docs/2', 2, { value: 2 });

    // Open listen for target 1
    const targets = listens(1);
    // We're waiting for the unlisten and listen ack.
    const outstanding = { 1: 2 };

    const change1 = new DocumentWatchChange([1], [], doc1.key, doc1);
    const change2 = new WatchTargetChange(WatchTargetChangeState.Removed, [1]);
    const change3 = new WatchTargetChange(WatchTargetChangeState.Added, [1]);
    const change4 = new DocumentWatchChange([1], [], doc2.key, doc2);

    const event = remoteEvent(
      3,
      targets,
      outstanding,
      change1,
      change2,
      change3,
      change4
    );
    expectEqual(event.snapshotVersion, version(3));
    // Doc1 is ignored because the target was not active at the time, but for
    // doc2 the target is active.
    expect(event.documentUpdates.size).to.equal(1);
    expectEqual(event.documentUpdates.get(doc2.key), doc2);
    // Target 1 is ignored because it was removed
    expect(size(event.targetChanges)).to.equal(1);
  });

  it('will ignore events for removed targets', () => {
    const doc1 = doc('docs/1', 1, { value: 1 });

    // We're waiting for the removal ack.
    const outstanding = { 1: 1 };

    const change1 = new DocumentWatchChange([1], [], doc1.key, doc1);
    const change2 = new WatchTargetChange(WatchTargetChangeState.Removed, [1]);

    const event = remoteEvent(3, {}, outstanding, change1, change2);
    expectEqual(event.snapshotVersion, version(3));
    // Doc 1 is ignored because it was not apart of an active target.
    expect(event.documentUpdates.size).to.equal(0);
    // Target 1 is ignored because it was removed
    expect(size(event.targetChanges)).to.equal(0);
  });

  it('will keep reset mapping even with updates', () => {
    const doc1 = doc('docs/1', 1, { value: 1 });
    const doc2 = doc('docs/2', 2, { value: 2 });
    const doc3 = doc('docs/3', 3, { value: 3 });

    // Need to listen at target 1 for this to work.
    const targets = listens(1);

    const change1 = new DocumentWatchChange([1], [], doc1.key, doc1);
    // Reset stream, ignoring doc1
    const change2 = new WatchTargetChange(WatchTargetChangeState.Reset, [1]);

    // Add doc2, doc3
    const change3 = new DocumentWatchChange([1], [], doc2.key, doc2);
    const change4 = new DocumentWatchChange([1], [], doc3.key, doc3);

    // Remove doc2 again, should not show up in reset mapping.
    const change5 = new DocumentWatchChange([], [1], doc2.key, doc2);

    const event = remoteEvent(
      3,
      targets,
      noPendingResponses,
      change1,
      change2,
      change3,
      change4,
      change5
    );
    expectEqual(event.snapshotVersion, version(3));
    expect(event.documentUpdates.size).to.equal(3);
    expectEqual(event.documentUpdates.get(doc1.key), doc1);
    expectEqual(event.documentUpdates.get(doc2.key), doc2);
    expectEqual(event.documentUpdates.get(doc3.key), doc3);

    expect(size(event.targetChanges)).to.equal(1);

    // Only doc3 is part of the new mapping.
    const expected = new ResetMapping();
    expected.add(doc3.key);
    expectEqual(event.targetChanges[1].mapping, expected);
  });

  it('will handle single reset', () => {
    // Need to listen at target 1 for this to work.
    const targets = listens(1);

    // Reset target
    const change = new WatchTargetChange(WatchTargetChangeState.Reset, [1]);

    const event = remoteEvent(3, targets, noPendingResponses, change);
    expectEqual(event.snapshotVersion, version(3));
    expect(event.documentUpdates.size).to.equal(0);

    expect(size(event.targetChanges)).to.equal(1);

    // Reset mapping is empty.
    const expected = new ResetMapping();
    expectEqual(event.targetChanges[1].mapping, expected);
  });

  it('will handle target add and removal in same batch', () => {
    // Need to listen at target 1 for this to work.
    const targets = listens(1, 2);

    const doc1a = doc('docs/1', 1, { value: 1 });
    const doc1b = doc('docs/1', 1, { value: 2 });

    const change1 = new DocumentWatchChange([1], [2], doc1a.key, doc1a);
    const change2 = new DocumentWatchChange([2], [1], doc1b.key, doc1b);

    const event = remoteEvent(3, targets, noPendingResponses, change1, change2);
    expectEqual(event.snapshotVersion, version(3));
    expect(event.documentUpdates.size).to.equal(1);
    expectEqual(event.documentUpdates.get(doc1b.key), doc1b);

    expect(size(event.targetChanges)).to.equal(2);

    const mapping1 = updateMapping([], [doc1b]);
    expectEqual(event.targetChanges[1].mapping, mapping1);

    const mapping2 = updateMapping([doc1b], []);
    expectEqual(event.targetChanges[2].mapping, mapping2);
  });

  it('target current change will mark the target current', () => {
    const targets = listens(1);

    const change = new WatchTargetChange(WatchTargetChangeState.Current, [1]);

    const event = remoteEvent(3, targets, noPendingResponses, change);
    expectEqual(event.snapshotVersion, version(3));
    expect(event.documentUpdates.size).to.equal(0);
    expect(size(event.targetChanges)).to.equal(1);

    const mapping = updateMapping([], []);
    expectEqual(event.targetChanges[1].mapping, mapping);
    expect(event.targetChanges[1].currentStatusUpdate).to.equal(
      CurrentStatusUpdate.MarkCurrent
    );
  });

  it('target added change will reset previous state', () => {
    // We have open listens for targets 1 and 3.
    const targets = listens(1, 3);
    const outstanding = { 1: 2, 2: 1 };

    const doc1 = doc('docs/1', 1, { value: 1 });
    const doc2 = doc('docs/2', 2, { value: 2 });

    const change1 = new DocumentWatchChange([1, 3], [2], doc1.key, doc1);
    const change2 = new WatchTargetChange(WatchTargetChangeState.Current, [
      1,
      2,
      3
    ]);
    const change3 = new WatchTargetChange(WatchTargetChangeState.Removed, [1]);
    const change4 = new WatchTargetChange(WatchTargetChangeState.Removed, [2]);
    const change5 = new WatchTargetChange(WatchTargetChangeState.Added, [1]);
    const change6 = new DocumentWatchChange([1], [3], doc2.key, doc2);

    const event = remoteEvent(
      3,
      targets,
      outstanding,
      change1,
      change2,
      change3,
      change4,
      change5,
      change6
    );
    expectEqual(event.snapshotVersion, version(3));
    expect(event.documentUpdates.size).to.equal(2);
    expectEqual(event.documentUpdates.get(doc1.key), doc1);
    expectEqual(event.documentUpdates.get(doc2.key), doc2);

    // target 1 and 3 are affected (1 because of re-add), target 2 is not
    // because of remove.
    expect(size(event.targetChanges)).to.equal(2);

    // doc1 was before the remove, so it does not show up in the mapping.
    const mapping1 = updateMapping([doc2], []);
    expectEqual(event.targetChanges[1].mapping, mapping1);
    // Current was before the remove.
    expect(event.targetChanges[1].currentStatusUpdate).to.equal(
      CurrentStatusUpdate.None
    );

    // Doc1 was before the remove.
    const mapping3 = updateMapping([doc1], [doc2]);
    expectEqual(event.targetChanges[3].mapping, mapping3);
    // Current was before the remove
    expect(event.targetChanges[3].currentStatusUpdate).to.equal(
      CurrentStatusUpdate.MarkCurrent
    );
  });

  it('no change will still mark the affected targets', () => {
    const targets = listens(1);

    const change = new WatchTargetChange(WatchTargetChangeState.NoChange, [1]);

    const event = remoteEvent(3, targets, noPendingResponses, change);
    expectEqual(event.snapshotVersion, version(3));
    expect(event.documentUpdates.size).to.equal(0);
    expect(size(event.targetChanges)).to.equal(1);
    const expected = updateMapping([], []);
    expectEqual(event.targetChanges[1].mapping, expected);
    expect(event.targetChanges[1].currentStatusUpdate).to.equal(
      CurrentStatusUpdate.None
    );
  });

  it('existence filters will replace previous existence filters', () => {
    const targets = listens(1, 2);

    const filter1 = new ExistenceFilter(1);
    const filter2 = new ExistenceFilter(2);
    const change1 = new ExistenceFilterChange(1, filter1);
    const change2 = new ExistenceFilterChange(2, filter1);
    // replace filter1 for target 2
    const change3 = new ExistenceFilterChange(2, filter2);

    const agg = aggregator(
      3,
      targets,
      noPendingResponses,
      change1,
      change2,
      change3
    );
    const event = agg.createRemoteEvent();
    expectEqual(event.snapshotVersion, version(3));
    expect(event.documentUpdates.size).to.equal(0);
    expect(size(event.targetChanges)).to.equal(0);
    expect(size(agg.existenceFilters)).to.equal(2);
    expectEqual(agg.existenceFilters[1], filter1);
    expectEqual(agg.existenceFilters[2], filter2);
  });

  it('existence filter mismatch resets target', () => {
    const targets = listens(1);

    const doc1 = doc('docs/1', 1, { value: 1 });
    const doc2 = doc('docs/2', 2, { value: 2 });

    const change1 = new DocumentWatchChange([1], [], doc1.key, doc1);
    const change2 = new DocumentWatchChange([1], [], doc2.key, doc2);
    const change3 = new WatchTargetChange(WatchTargetChangeState.Current, [1]);

    const event = remoteEvent(
      3,
      targets,
      noPendingResponses,
      change1,
      change2,
      change3
    );
    expectEqual(event.snapshotVersion, version(3));
    expect(event.documentUpdates.size).to.equal(2);
    expectEqual(event.documentUpdates.get(doc1.key), doc1);
    expectEqual(event.documentUpdates.get(doc2.key), doc2);

    expect(size(event.targetChanges)).to.equal(1);

    const mapping1 = updateMapping([doc1, doc2], []);
    expectEqual(event.targetChanges[1].mapping, mapping1);
    expectEqual(event.targetChanges[1].snapshotVersion, version(3));
    expect(event.targetChanges[1].currentStatusUpdate).to.equal(
      CurrentStatusUpdate.MarkCurrent
    );

    event.handleExistenceFilterMismatch(1);

    // Mapping is reset
    const mapping = new ResetMapping();
    expectEqual(event.targetChanges[1].mapping, mapping);
    // Reset the resume snapshot
    expectEqual(event.targetChanges[1].snapshotVersion, version(0));
    // Target needs to be set to not current
    expect(event.targetChanges[1].currentStatusUpdate).to.equal(
      CurrentStatusUpdate.MarkNotCurrent
    );
  });

  it('handles document update', () => {
    const targets = listens(1);

    const doc1 = doc('docs/1', 1, { value: 1 });
    const deletedDoc1 = deletedDoc('docs/1', 3);
    const doc2 = doc('docs/2', 2, { value: 2 });
    const doc3 = doc('docs/3', 3, { value: 3 });

    const change1 = new DocumentWatchChange([1], [], doc1.key, doc1);
    const change2 = new DocumentWatchChange([1], [], doc2.key, doc2);

    const event = remoteEvent(3, targets, noPendingResponses, change1, change2);
    expectEqual(event.snapshotVersion, version(3));
    expect(event.documentUpdates.size).to.equal(2);
    expectEqual(event.documentUpdates.get(doc1.key), doc1);
    expectEqual(event.documentUpdates.get(doc2.key), doc2);

    // Update doc1
    event.addDocumentUpdate(deletedDoc1);
    event.addDocumentUpdate(doc3);

    expectEqual(event.snapshotVersion, version(3));
    expect(event.documentUpdates.size).to.equal(3);
    // Doc 1 is replaced
    expectEqual(event.documentUpdates.get(doc1.key), deletedDoc1);
    // Doc 2 is untouched
    expectEqual(event.documentUpdates.get(doc2.key), doc2);
    // Doc 3 is new
    expectEqual(event.documentUpdates.get(doc3.key), doc3);

    // Target is unchanged
    expect(size(event.targetChanges)).to.equal(1);

    const mapping1 = updateMapping([doc1, doc2], []);
    expectEqual(event.targetChanges[1].mapping, mapping1);
  });

  it('synthesizes deletes', () => {
    const targets = listens(1, 2, 3);
    const shouldSynthesize = new WatchTargetChange(
      WatchTargetChangeState.Current,
      [1]
    );
    const wrongState = new WatchTargetChange(WatchTargetChangeState.NoChange, [
      2
    ]);
    const hasDocument = new WatchTargetChange(WatchTargetChangeState.Current, [
      3
    ]);
    const doc1 = doc('docs/1', 1, { value: 1 });
    const docChange = new DocumentWatchChange([3], [], doc1.key, doc1);

    const event = remoteEvent(
      1,
      targets,
      noPendingResponses,
      shouldSynthesize,
      wrongState,
      hasDocument,
      docChange
    );

    const synthesized = DocumentKey.fromPathString('docs/2');
    expect(event.documentUpdates.get(synthesized)).to.be.null;

    const limboTargetChange = event.targetChanges[1];
    event.synthesizeDeleteForLimboTargetChange(limboTargetChange, synthesized);
    const expected = deletedDoc(
      'docs/2',
      event.snapshotVersion.toMicroseconds()
    );
    expectEqual(event.documentUpdates.get(synthesized), expected);

    const notSynthesized = DocumentKey.fromPathString('docs/no1');
    const wrongStateChange = event.targetChanges[2];
    event.synthesizeDeleteForLimboTargetChange(
      wrongStateChange,
      notSynthesized
    );
    expect(event.documentUpdates.get(notSynthesized)).to.not.exist;

    const hasDocumentChange = event.targetChanges[3];
    event.synthesizeDeleteForLimboTargetChange(hasDocumentChange, doc1.key);
    expect(event.documentUpdates.get(doc1.key)).to.not.be.instanceof(
      NoDocument
    );
  });

  it('filters updates', () => {
    const newDoc = doc('docs/new', 1, { key: 'value' });
    const existingDoc = doc('docs/existing', 1, { some: 'data' });
    const newDocChange = new DocumentWatchChange([1], [], newDoc.key, newDoc);

    const resetTargetChange = new WatchTargetChange(
      WatchTargetChangeState.Reset,
      [2]
    );
    const existingDocChange = new DocumentWatchChange(
      [1, 2],
      [],
      existingDoc.key,
      existingDoc
    );

    const updateChangeId = 1;
    const resetChangeId = 2;
    const targets = listens(updateChangeId, resetChangeId);
    const event = remoteEvent(
      1,
      targets,
      noPendingResponses,
      newDocChange,
      resetTargetChange,
      existingDocChange
    );

    const updateChange = event.targetChanges[updateChangeId];
    expect(updateChange.mapping).to.be.instanceof(UpdateMapping);
    const update = updateChange.mapping as UpdateMapping;
    expect(update.addedDocuments.has(existingDoc.key)).to.be.true;

    const existingKeys = documentKeySet().add(existingDoc.key);
    event.filterUpdatesFromTargetChange(updateChangeId, existingKeys);
    expect(update.addedDocuments.has(existingDoc.key)).to.be.false;
    expect(update.addedDocuments.has(newDoc.key)).to.be.true;

    const resetChange = event.targetChanges[resetChangeId];
    expect(resetChange.mapping).to.be.instanceof(ResetMapping);
    const reset = resetChange.mapping as ResetMapping;
    expect(reset.documents.has(existingDoc.key)).to.be.true;

    event.filterUpdatesFromTargetChange(resetChangeId, existingKeys);
    // document is still there, as reset mappings don't get filtered
    expect(reset.documents.has(existingDoc.key)).to.be.true;
  });
});
