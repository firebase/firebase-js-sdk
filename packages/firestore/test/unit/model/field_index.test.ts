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

import { Timestamp } from '../../../src';
import { SnapshotVersion } from '../../../src/core/snapshot_version';
import { DocumentKey } from '../../../src/model/document_key';
import {
  fieldIndexSemanticComparator,
  IndexKind,
  IndexOffset,
  indexOffsetComparator,
  newIndexOffsetSuccessorFromReadTime
} from '../../../src/model/field_index';
import { fieldIndex, key, version } from '../../util/helpers';

describe('field index', () => {
  it('comparator includes collection group', () => {
    const indexOriginal = fieldIndex('collA');
    const indexSame = fieldIndex('collA');
    const indexDifferent = fieldIndex('collB');
    expect(fieldIndexSemanticComparator(indexOriginal, indexSame)).to.equal(0);
    expect(
      fieldIndexSemanticComparator(indexOriginal, indexDifferent)
    ).to.equal(-1);
  });

  it('comparator ignores index id', () => {
    const indexOriginal = fieldIndex('collA', { id: 1 });
    const indexSame = fieldIndex('collA', { id: 1 });
    const indexDifferent = fieldIndex('collA', { id: 2 });
    expect(fieldIndexSemanticComparator(indexOriginal, indexSame)).to.equal(0);
    expect(
      fieldIndexSemanticComparator(indexOriginal, indexDifferent)
    ).to.equal(0);
  });

  it('comparator ignores index offset', () => {
    const indexOriginal = fieldIndex('collA', { offset: IndexOffset.min() });
    const indexSame = fieldIndex('collA', { offset: IndexOffset.min() });
    const indexDifferent = fieldIndex('collA', {
      offset: new IndexOffset(version(2), DocumentKey.empty(), -1)
    });
    expect(fieldIndexSemanticComparator(indexOriginal, indexSame)).to.equal(0);
    expect(
      fieldIndexSemanticComparator(indexOriginal, indexDifferent)
    ).to.equal(0);
  });

  it('comparator includes field name', () => {
    const indexOriginal = fieldIndex('collA', {
      fields: [['a', IndexKind.ASCENDING]]
    });
    const indexSame = fieldIndex('collA', {
      fields: [['a', IndexKind.ASCENDING]]
    });
    const indexDifferent = fieldIndex('collA', {
      fields: [['b', IndexKind.ASCENDING]]
    });
    expect(fieldIndexSemanticComparator(indexOriginal, indexSame)).to.equal(0);
    expect(
      fieldIndexSemanticComparator(indexOriginal, indexDifferent)
    ).to.equal(-1);
  });

  it('comparator includes segment kind', () => {
    const indexOriginal = fieldIndex('collA', {
      fields: [['a', IndexKind.ASCENDING]]
    });
    const indexSame = fieldIndex('collA', {
      fields: [['a', IndexKind.ASCENDING]]
    });
    const indexDifferent = fieldIndex('collA', {
      fields: [['a', IndexKind.DESCENDING]]
    });
    expect(fieldIndexSemanticComparator(indexOriginal, indexSame)).to.equal(0);
    expect(
      fieldIndexSemanticComparator(indexOriginal, indexDifferent)
    ).to.equal(-1);
  });

  it('comparator includes segment length', () => {
    const indexOriginal = fieldIndex('collA', {
      fields: [['a', IndexKind.ASCENDING]]
    });
    const indexSame = fieldIndex('collA', {
      fields: [['a', IndexKind.ASCENDING]]
    });
    const indexDifferent = fieldIndex('collA', {
      fields: [
        ['a', IndexKind.ASCENDING],
        ['b', IndexKind.ASCENDING]
      ]
    });
    expect(fieldIndexSemanticComparator(indexOriginal, indexSame)).to.equal(0);
    expect(
      fieldIndexSemanticComparator(indexOriginal, indexDifferent)
    ).to.equal(-1);
  });
});

describe('index offset', () => {
  it('supports comparison', () => {
    const docAOffset = new IndexOffset(version(1), key('foo/a'), -1);
    const docBOffset = new IndexOffset(version(1), key('foo/b'), -1);
    const version1Offset = newIndexOffsetSuccessorFromReadTime(version(1), -1);
    const docCOffset = new IndexOffset(version(2), key('foo/c'), -1);
    const version2Offset = newIndexOffsetSuccessorFromReadTime(version(2), -1);

    expect(indexOffsetComparator(docAOffset, docBOffset)).to.equal(-1);
    expect(indexOffsetComparator(docAOffset, version1Offset)).to.equal(-1);
    expect(indexOffsetComparator(version1Offset, docCOffset)).to.equal(-1);
    expect(indexOffsetComparator(version1Offset, version2Offset)).to.equal(-1);
    expect(indexOffsetComparator(docCOffset, version2Offset)).to.equal(-1);
  });

  it('advances seconds', () => {
    const actualSuccessor = newIndexOffsetSuccessorFromReadTime(
      SnapshotVersion.fromTimestamp(new Timestamp(1, 1e9 - 1)),
      -1
    );
    const expectedSuccessor = new IndexOffset(
      SnapshotVersion.fromTimestamp(new Timestamp(2, 0)),
      DocumentKey.empty(),
      -1
    );
    expect(indexOffsetComparator(actualSuccessor, expectedSuccessor)).to.equal(
      0
    );
  });
});
