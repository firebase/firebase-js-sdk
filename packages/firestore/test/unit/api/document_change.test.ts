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
import { QuerySnapshot } from '../../../exp/src/api/snapshot';
import { Query as InternalQuery } from '../../../src/core/query';
import { View } from '../../../src/core/view';
import { documentKeySet } from '../../../src/model/collections';
import { Document } from '../../../src/model/document';
import { DocumentKey } from '../../../src/model/document_key';
import {
  applyDocChanges,
  doc,
  documentSetAsArray,
  key,
  orderBy,
  query
} from '../../util/helpers';
import { firestore } from '../../util/api_helpers';
import { ExpUserDataWriter, Query } from '../../../exp/src/api/reference';

describe('DocumentChange:', () => {
  function expectPositions(
    query: InternalQuery,
    initialDocs: Document[],
    updates: Array<Document | DocumentKey>
  ): void {
    const view = new View(query, documentKeySet());
    const initialSnapshot = applyDocChanges(view, ...initialDocs).snapshot!;
    const updatedSnapshot = applyDocChanges(view, ...updates).snapshot;

    if (!updatedSnapshot) {
      // Nothing changed, no positions to verify
      return;
    }

    const expected = documentSetAsArray(updatedSnapshot.docs);
    const actual = documentSetAsArray(initialSnapshot.docs);

    const db = firestore()._delegate;
    const snapshot = new QuerySnapshot(
      db,
      new ExpUserDataWriter(db),
      new Query(db, /* converter= */ null, query),
      updatedSnapshot
    );

    for (const change of snapshot.docChanges()) {
      if (change.type !== 'added') {
        actual.splice(change.oldIndex, 1);
      }
      if (change.type !== 'removed') {
        actual.splice(change.newIndex, 0, change.doc._document!);
      }
    }

    expect(actual).to.deep.equal(expected);
  }

  it('positions are correct for additions', () => {
    const query1 = query('c');
    const initialDocs = [
      doc('c/a', 1, {}),
      doc('c/c', 1, {}),
      doc('c/e', 1, {})
    ];
    const updates = [doc('c/b', 2, {}), doc('c/d', 2, {})];

    expectPositions(query1, initialDocs, updates);
  });

  it('positions are correct for deletions', () => {
    const query1 = query('c');
    const initialDocs = [
      doc('c/a', 1, {}),
      doc('c/b', 1, {}),
      doc('c/c', 1, {})
    ];
    const updates = [key('c/a'), key('c/c')];

    expectPositions(query1, initialDocs, updates);
  });

  it('positions are correct for modifications', () => {
    const query1 = query('c');
    const initialDocs = [
      doc('c/a', 1, { value: 'a-1' }),
      doc('c/b', 1, { value: 'b-1' }),
      doc('c/c', 1, { value: 'c-1' })
    ];
    const updates = [
      doc('c/a', 2, { value: 'a-2' }),
      doc('c/c', 2, { value: 'c-2' })
    ];

    expectPositions(query1, initialDocs, updates);
  });

  it('positions are correct for sort order changes', () => {
    const query1 = query('c', orderBy('sort'));
    const initialDocs = [
      doc('c/a', 1, { sort: 10 }),
      doc('c/b', 1, { sort: 20 }),
      doc('c/c', 1, { sort: 30 })
    ];
    const updates = [
      doc('c/new-a', 2, { sort: 0 }),
      doc('c/b', 2, { sort: 5 }),
      key('c/c'),
      doc('c/e', 2, { sort: 25 }),
      doc('c/a', 2, { sort: 35 })
    ];

    expectPositions(query1, initialDocs, updates);
  });

  it('positions are correct for randomly chosen examples', () => {
    const query1 = query('c', orderBy('sort'));
    for (let run = 0; run < 100; run++) {
      const initialDocs: Document[] = [];
      const updates: Array<DocumentKey | Document> = [];
      const numDocs = 100;
      for (let i = 0; i < numDocs; i++) {
        // Skip 20% of the docs
        if (Math.random() > 0.8) {
          initialDocs.push(doc('c/test-doc-' + i, 1, { sort: Math.random() }));
        }
      }
      for (let i = 0; i < numDocs; i++) {
        // Only update 20% of the docs
        if (Math.random() < 0.2) {
          // 30% deletes, rest updates and/or additions
          if (Math.random() < 0.3) {
            updates.push(key('c/test-doc-' + i));
          } else {
            updates.push(doc('c/test-doc-' + i, 1, { sort: Math.random() }));
          }
        }
      }

      expectPositions(query1, initialDocs, updates);
    }
  });
});
