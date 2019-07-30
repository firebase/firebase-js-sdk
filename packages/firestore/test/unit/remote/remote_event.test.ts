/**
 * @license
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
import { QueryData, QueryPurpose } from '../../../src/local/query_data';
import { DocumentKeySet, documentKeySet } from '../../../src/model/collections';
import { DocumentKey } from '../../../src/model/document_key';
import { emptyByteString } from '../../../src/platform/platform';
import { ExistenceFilter } from '../../../src/remote/existence_filter';
import { RemoteEvent, TargetChange } from '../../../src/remote/remote_event';
import {
  DocumentWatchChange,
  ExistenceFilterChange,
  WatchChangeAggregator,
  WatchTargetChange,
  WatchTargetChangeState
} from '../../../src/remote/watch_change';
import * as objUtils from '../../../src/util/obj';
import {
  deletedDoc,
  doc,
  expectEqual,
  keys,
  queryData,
  resumeTokenForSnapshot,
  size,
  updateMapping,
  version
} from '../../util/helpers';

interface TargetMap {
  [targetId: string]: QueryData;
}
interface PendingTargetResponses {
  [targetId: string]: number;
}

function listens(...targetIds: TargetId[]): TargetMap {
  const targets: TargetMap = {};
  for (const target of targetIds) {
    targets[target] = queryData(target, QueryPurpose.Listen, 'coll');
  }

  return targets;
}

function limboListens(...targetIds: TargetId[]): TargetMap {
  const targets: TargetMap = {};
  for (const target of targetIds) {
    targets[target] = queryData(
      target,
      QueryPurpose.LimboResolution,
      'coll/limbo'
    );
  }
  return targets;
}

function expectTargetChangeEquals(
  actual: TargetChange,
  expected: TargetChange
): void {
  expect(actual.current).to.equal(expected.current, 'TargetChange.current');
  expect(actual.resumeToken).to.equal(
    expected.resumeToken,
    'TargetChange.resumeToken'
  );
  expect(actual.addedDocuments.isEqual(expected.addedDocuments)).to.equal(
    true,
    'TargetChange.addedDocuments'
  );
  expect(actual.modifiedDocuments.isEqual(expected.modifiedDocuments)).to.equal(
    true,
    'TargetChange.modifiedDocuments'
  );
  expect(actual.removedDocuments.isEqual(expected.removedDocuments)).to.equal(
    true,
    'TargetChange.removedDocuments'
  );
}

describe('RemoteEvent', () => {
  function createAggregator(options: {
    snapshotVersion: number;
    targets?: TargetMap;
    outstandingResponses?: PendingTargetResponses;
    existingKeys?: DocumentKeySet;
    changes?: Array<DocumentWatchChange | WatchTargetChange>;
  }): WatchChangeAggregator {
    const targetIds: TargetId[] = [];

    if (options.targets) {
      objUtils.forEachNumber(options.targets, targetId => {
        targetIds.push(targetId);
      });
    }

    const aggregator = new WatchChangeAggregator({
      getRemoteKeysForTarget: () => options.existingKeys || documentKeySet(),
      getQueryDataForTarget: targetId =>
        options.targets ? options.targets[targetId] : null
    });

    if (options.outstandingResponses) {
      objUtils.forEachNumber(
        options.outstandingResponses,
        (targetId, count) => {
          for (let i = 0; i < count; ++i) {
            aggregator.recordPendingTargetRequest(targetId);
          }
        }
      );
    }

    if (options.changes) {
      options.changes.forEach(change =>
        change instanceof DocumentWatchChange
          ? aggregator.handleDocumentChange(change)
          : aggregator.handleTargetChange(change)
      );
    }

    aggregator.handleTargetChange(
      new WatchTargetChange(
        WatchTargetChangeState.NoChange,
        targetIds,
        resumeTokenForSnapshot(version(options.snapshotVersion))
      )
    );

    return aggregator;
  }

  function createRemoteEvent(options: {
    snapshotVersion: number;
    targets?: TargetMap;
    outstandingResponses?: PendingTargetResponses;
    existingKeys?: DocumentKeySet;
    changes?: Array<DocumentWatchChange | WatchTargetChange>;
  }): RemoteEvent {
    return createAggregator(options).createRemoteEvent(
      version(options.snapshotVersion)
    );
  }
  it('will accumulate document added and removed events', () => {
    const targets = listens(1, 2, 3, 4, 5, 6);

    const existingDoc = doc('docs/1', 1, { value: 1 });
    const newDoc = doc('docs/2', 2, { value: 2 });

    const change1 = new DocumentWatchChange(
      [1, 2, 3],
      [4, 5, 6],
      existingDoc.key,
      existingDoc
    );
    const change2 = new DocumentWatchChange([1, 4], [2, 6], newDoc.key, newDoc);
    const existingKeys = keys(existingDoc);

    const event = createRemoteEvent({
      snapshotVersion: 3,
      targets,
      existingKeys,
      changes: [change1, change2]
    });

    expectEqual(event.snapshotVersion, version(3));
    expect(event.documentUpdates.size).to.equal(2);
    expectEqual(event.documentUpdates.get(existingDoc.key), existingDoc);
    expectEqual(event.documentUpdates.get(newDoc.key), newDoc);

    expect(size(event.targetChanges)).to.equal(6);

    const mapping1 = updateMapping(version(3), [newDoc], [existingDoc], []);
    expectTargetChangeEquals(event.targetChanges[1], mapping1);

    const mapping2 = updateMapping(version(3), [], [existingDoc], []);
    expectTargetChangeEquals(event.targetChanges[2], mapping2);

    const mapping3 = updateMapping(version(3), [], [existingDoc], []);
    expectTargetChangeEquals(event.targetChanges[3], mapping3);

    const mapping4 = updateMapping(version(3), [newDoc], [], [existingDoc]);
    expectTargetChangeEquals(event.targetChanges[4], mapping4);

    const mapping5 = updateMapping(version(3), [], [], [existingDoc]);
    expectTargetChangeEquals(event.targetChanges[5], mapping5);

    const mapping6 = updateMapping(version(3), [], [], [existingDoc]);
    expectTargetChangeEquals(event.targetChanges[6], mapping6);
  });

  it('will ignore events for pending targets', () => {
    const doc1 = doc('docs/1', 1, { value: 1 });
    const doc2 = doc('docs/2', 2, { value: 2 });

    // Open listen for target 1
    const targets = listens(1);
    // We're waiting for the unlisten and listen ack.
    const outstandingResponses = { 1: 2 };

    const change1 = new DocumentWatchChange([1], [], doc1.key, doc1);
    const change2 = new WatchTargetChange(WatchTargetChangeState.Removed, [1]);
    const change3 = new WatchTargetChange(WatchTargetChangeState.Added, [1]);
    const change4 = new DocumentWatchChange([1], [], doc2.key, doc2);

    const event = createRemoteEvent({
      snapshotVersion: 3,
      targets,
      outstandingResponses,
      changes: [change1, change2, change3, change4]
    });

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
    const outstandingResponses = { 1: 1 };

    const change1 = new DocumentWatchChange([1], [], doc1.key, doc1);
    const change2 = new WatchTargetChange(WatchTargetChangeState.Removed, [1]);

    const event = createRemoteEvent({
      snapshotVersion: 3,
      outstandingResponses,
      changes: [change1, change2]
    });

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

    const event = createRemoteEvent({
      snapshotVersion: 3,
      targets,
      existingKeys: keys(doc1),
      changes: [change1, change2, change3, change4, change5]
    });

    expectEqual(event.snapshotVersion, version(3));
    expect(event.documentUpdates.size).to.equal(3);
    expectEqual(event.documentUpdates.get(doc1.key), doc1);
    expectEqual(event.documentUpdates.get(doc2.key), doc2);
    expectEqual(event.documentUpdates.get(doc3.key), doc3);

    expect(size(event.targetChanges)).to.equal(1);

    // Only doc3 is part of the new mapping.
    const expected = updateMapping(version(3), [doc3], [], [doc1]);
    expectTargetChangeEquals(event.targetChanges[1], expected);
  });

  it('will handle single reset', () => {
    // Need to listen at target 1 for this to work.
    const targets = listens(1);

    // Reset target
    const change = new WatchTargetChange(WatchTargetChangeState.Reset, [1]);

    const event = createRemoteEvent({
      snapshotVersion: 3,
      targets,
      changes: [change]
    });

    expectEqual(event.snapshotVersion, version(3));
    expect(event.documentUpdates.size).to.equal(0);
    expect(size(event.targetChanges)).to.equal(1);

    // Reset mapping is empty.
    const expected = updateMapping(version(3), [], [], []);
    expectTargetChangeEquals(event.targetChanges[1], expected);
  });

  it('will handle target add and removal in same batch', () => {
    // Need to listen at target 1 for this to work.
    const targets = listens(1, 2);

    const doc1a = doc('docs/1', 1, { value: 1 });
    const doc1b = doc('docs/1', 1, { value: 2 });

    const change1 = new DocumentWatchChange([1], [2], doc1a.key, doc1a);
    const change2 = new DocumentWatchChange([2], [1], doc1b.key, doc1b);

    const event = createRemoteEvent({
      snapshotVersion: 3,
      targets,
      existingKeys: keys('docs/1'),
      changes: [change1, change2]
    });

    expectEqual(event.snapshotVersion, version(3));
    expect(event.documentUpdates.size).to.equal(1);
    expectEqual(event.documentUpdates.get(doc1b.key), doc1b);

    expect(size(event.targetChanges)).to.equal(2);

    const mapping1 = updateMapping(version(3), [], [], [doc1b]);
    expectTargetChangeEquals(event.targetChanges[1], mapping1);

    const mapping2 = updateMapping(version(3), [], [doc1b], []);
    expectTargetChangeEquals(event.targetChanges[2], mapping2);
  });

  it('target current change will mark the target current', () => {
    const targets = listens(1);

    const change = new WatchTargetChange(WatchTargetChangeState.Current, [1]);

    const event = createRemoteEvent({
      snapshotVersion: 3,
      targets,
      changes: [change]
    });

    expectEqual(event.snapshotVersion, version(3));
    expect(event.documentUpdates.size).to.equal(0);
    expect(size(event.targetChanges)).to.equal(1);

    const mapping = updateMapping(version(3), [], [], [], true);
    expectTargetChangeEquals(event.targetChanges[1], mapping);
  });

  it('target added change will reset previous state', () => {
    // We have open listens for targets 1 and 3.
    const targets = listens(1, 3);
    const outstandingResponses = { 1: 2, 2: 1 };

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

    const event = createRemoteEvent({
      snapshotVersion: 3,
      targets,
      outstandingResponses,
      existingKeys: keys(doc2),
      changes: [change1, change2, change3, change4, change5, change6]
    });

    expectEqual(event.snapshotVersion, version(3));
    expect(event.documentUpdates.size).to.equal(2);
    expectEqual(event.documentUpdates.get(doc1.key), doc1);
    expectEqual(event.documentUpdates.get(doc2.key), doc2);

    // target 1 and 3 are affected (1 because of re-add), target 2 is not
    // because of remove.
    expect(size(event.targetChanges)).to.equal(2);

    // doc1 was before the remove, so it does not show up in the mapping.
    // Current was before the remove.
    const mapping1 = updateMapping(version(3), [], [doc2], [], false);
    expectTargetChangeEquals(event.targetChanges[1], mapping1);

    // Doc1 was before the remove.
    // Current was before the remove
    const mapping3 = updateMapping(version(3), [doc1], [], [doc2], true);
    expectTargetChangeEquals(event.targetChanges[3], mapping3);
  });

  it('no change will still mark the affected targets', () => {
    const targets = listens(1);

    const change = new WatchTargetChange(WatchTargetChangeState.NoChange, [1]);

    const event = createRemoteEvent({
      snapshotVersion: 3,
      targets,
      changes: [change]
    });

    expectEqual(event.snapshotVersion, version(3));
    expect(event.documentUpdates.size).to.equal(0);
    expect(size(event.targetChanges)).to.equal(1);
    const expected = updateMapping(version(3), [], [], [], false);
    expectTargetChangeEquals(event.targetChanges[1], expected);
  });

  it('existence filters clears target mapping', () => {
    const targets = listens(1, 2);

    const doc1 = doc('docs/1', 1, { value: 1 });
    const doc2 = doc('docs/2', 1, { value: 1 });
    const change1 = new DocumentWatchChange([1, 2], [], doc1.key, doc1);
    const change2 = new DocumentWatchChange([2], [], doc2.key, doc2);

    const aggregator = createAggregator({
      snapshotVersion: 3,
      targets,
      existingKeys: keys(doc1),
      changes: [change1, change2]
    });

    let event = aggregator.createRemoteEvent(version(3));
    expect(event.documentUpdates.size).to.equal(2);
    expect(size(event.targetChanges)).to.equal(2);

    // The existence filter mismatch will remove the document from target 1,
    // but not synthesize a document delete.
    aggregator.handleExistenceFilter(
      new ExistenceFilterChange(1, new ExistenceFilter(0))
    );

    event = aggregator.createRemoteEvent(version(3));
    expect(event.documentUpdates.size).to.equal(0);
    expect(event.targetMismatches.size).to.equal(1);
    expect(size(event.targetChanges)).to.equal(1);

    const expected = updateMapping(SnapshotVersion.MIN, [], [], [doc1], false);
    expectTargetChangeEquals(event.targetChanges[1], expected);
  });

  it('existence filters removes current changes', () => {
    const targets = listens(1);

    const doc1 = doc('docs/1', 1, { value: 1 });
    const addDoc = new DocumentWatchChange([1], [], doc1.key, doc1);
    const markCurrent = new WatchTargetChange(
      WatchTargetChangeState.Current,
      [1],
      emptyByteString()
    );

    const aggregator = createAggregator({
      snapshotVersion: 3,
      targets
    });

    aggregator.handleTargetChange(markCurrent);
    aggregator.handleDocumentChange(addDoc);

    // The existence filter mismatch will clear the previous target mapping,
    // but not synthesize a document delete.
    aggregator.handleExistenceFilter(
      new ExistenceFilterChange(1, new ExistenceFilter(0))
    );

    const event = aggregator.createRemoteEvent(version(3));
    expect(event.documentUpdates.size).to.equal(1);
    expect(event.targetMismatches.size).to.equal(1);
    expect(event.targetChanges[1].current).to.be.false;
  });

  it('handles document update', () => {
    const targets = listens(1);

    const doc1 = doc('docs/1', 1, { value: 1 });
    const deletedDoc1 = deletedDoc('docs/1', 4);
    const doc2 = doc('docs/2', 2, { value: 2 });
    const updatedDoc2 = doc('docs/2', 3, { value: 2 });
    const doc3 = doc('docs/3', 3, { value: 3 });

    const change1 = new DocumentWatchChange([1], [], doc1.key, doc1);
    const change2 = new DocumentWatchChange([1], [], doc2.key, doc2);

    const aggregator = createAggregator({
      snapshotVersion: 3,
      targets,
      existingKeys: keys(doc1, doc2),
      changes: [change1, change2]
    });

    let event = aggregator.createRemoteEvent(version(3));
    expectEqual(event.snapshotVersion, version(3));
    expect(event.documentUpdates.size).to.equal(2);
    expectEqual(event.documentUpdates.get(doc1.key), doc1);
    expectEqual(event.documentUpdates.get(doc2.key), doc2);

    aggregator.removeDocumentFromTarget(1, deletedDoc1.key, deletedDoc1);
    aggregator.addDocumentToTarget(1, updatedDoc2);
    aggregator.addDocumentToTarget(1, doc3);

    event = aggregator.createRemoteEvent(version(3));

    expectEqual(event.snapshotVersion, version(3));
    expect(event.documentUpdates.size).to.equal(3);
    // Doc 1 is replaced
    const olddoc = event.documentUpdates.get(doc1.key);
    expectEqual(olddoc, deletedDoc1);
    // Doc 3 is new
    expectEqual(event.documentUpdates.get(doc3.key), doc3);

    // Target is unchanged
    expect(size(event.targetChanges)).to.equal(1);

    const mapping1 = updateMapping(
      version(3),
      [doc3],
      [updatedDoc2],
      [deletedDoc1]
    );
    expectTargetChangeEquals(event.targetChanges[1], mapping1);
  });

  it('only raises events for updated targets', () => {
    const targets = listens(1, 2);

    const doc1 = doc('docs/1', 1, { value: 1 });
    const doc2 = doc('docs/2', 2, { value: 2 });
    const updatedDoc2 = doc('docs/2', 3, { value: 2 });

    const change1 = new DocumentWatchChange([1], [], doc1.key, doc1);
    const change2 = new DocumentWatchChange([2], [], doc2.key, doc2);

    const aggregator = createAggregator({
      snapshotVersion: 3,
      targets,
      existingKeys: keys(doc1, doc2),
      changes: [change1, change2]
    });

    let event = aggregator.createRemoteEvent(version(2));
    expect(event.documentUpdates.size).to.equal(2);
    expect(size(event.targetChanges)).to.equal(2);

    aggregator.addDocumentToTarget(2, updatedDoc2);
    event = aggregator.createRemoteEvent(version(2));

    expect(event.documentUpdates.size).to.equal(1);
    expect(size(event.targetChanges)).to.equal(1);

    const mapping1 = updateMapping(version(3), [], [updatedDoc2], []);
    expectTargetChangeEquals(event.targetChanges[2], mapping1);
  });

  it('synthesizes deletes', () => {
    const targets = limboListens(1);
    const limboKey = DocumentKey.fromPathString('coll/limbo');
    const resolveLimboTarget = new WatchTargetChange(
      WatchTargetChangeState.Current,
      [1]
    );

    const event = createRemoteEvent({
      snapshotVersion: 1,
      targets,
      changes: [resolveLimboTarget]
    });

    const expected = deletedDoc(
      'coll/limbo',
      event.snapshotVersion.toMicroseconds()
    );
    expectEqual(event.documentUpdates.get(limboKey), expected);
    expect(event.resolvedLimboDocuments.has(limboKey)).to.be.true;
  });

  it("doesn't synthesize deletes in the wrong state", () => {
    const targets = limboListens(1);
    const limboKey = DocumentKey.fromPathString('coll/limbo');
    const wrongState = new WatchTargetChange(WatchTargetChangeState.NoChange, [
      1
    ]);

    const event = createRemoteEvent({
      snapshotVersion: 1,
      targets,
      changes: [wrongState]
    });

    expect(event.documentUpdates.get(limboKey)).to.not.exist;
    expect(event.resolvedLimboDocuments.has(limboKey)).to.be.false;
  });

  it('separates document updates', () => {
    const updateTargetId = 1;
    const newDoc = doc('docs/new', 1, { key: 'value' });
    const existingDoc = doc('docs/existing', 1, { some: 'data' });
    const newDocChange = new DocumentWatchChange(
      [updateTargetId],
      [],
      newDoc.key,
      newDoc
    );

    const existingDocChange = new DocumentWatchChange(
      [updateTargetId],
      [],
      existingDoc.key,
      existingDoc
    );

    const targets = listens(updateTargetId);

    const event = createRemoteEvent({
      snapshotVersion: 1,
      targets,
      existingKeys: keys(existingDoc),
      changes: [newDocChange, existingDocChange]
    });

    const updateChange = event.targetChanges[updateTargetId];
    expect(updateChange.addedDocuments.has(newDoc.key)).to.be.true;
    expect(updateChange.addedDocuments.has(existingDoc.key)).to.be.false;
    expect(updateChange.modifiedDocuments.has(newDoc.key)).to.be.false;
    expect(updateChange.modifiedDocuments.has(existingDoc.key)).to.be.true;
  });

  it('tracks limbo documents', () => {
    // Add 3 docs: 1 is limbo and non-limbo, 2 is limbo-only, 3 is non-limbo
    const doc1 = doc('docs/1', 1, { key: 'value' });
    const doc2 = doc('docs/2', 1, { key: 'value' });
    const doc3 = doc('docs/3', 1, { key: 'value' });

    // Target 2 is a limbo target

    const docChange1 = new DocumentWatchChange([1, 2], [], doc1.key, doc1);
    const docChange2 = new DocumentWatchChange([2], [], doc2.key, doc2);
    const docChange3 = new DocumentWatchChange([1], [], doc3.key, doc3);

    const targetsChange = new WatchTargetChange(
      WatchTargetChangeState.Current,
      [1, 2]
    );
    const targets = { ...listens(1), ...limboListens(2) };

    const event = createRemoteEvent({
      snapshotVersion: 1,
      targets,
      changes: [docChange1, docChange2, docChange3, targetsChange]
    });

    // Doc1 is in both limbo and non-limbo targets, therefore not tracked as limbo
    expect(event.resolvedLimboDocuments.has(doc1.key)).to.be.false;
    // Doc2 is only in the limbo target, so is tracked as a limbo document
    expect(event.resolvedLimboDocuments.has(doc2.key)).to.be.true;
    // Doc3 is only in the non-limbo target, therefore not tracked as limbo
    expect(event.resolvedLimboDocuments.has(doc3.key)).to.be.false;
  });
});
