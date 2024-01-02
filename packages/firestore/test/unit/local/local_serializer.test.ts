/**
 * @license
 * Copyright 2020 Google LLC
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

import { DatabaseId } from '../../../src/core/database_info';
import { encodeResourcePath } from '../../../src/local/encoded_resource_path';
import { DbMutationBatch } from '../../../src/local/indexeddb_schema';
import {
  fromDbDocumentOverlay,
  fromDbIndexConfiguration,
  fromDbMutationBatch,
  toDbDocumentOverlay,
  toDbIndexConfiguration,
  toDbIndexState
} from '../../../src/local/local_serializer';
import {
  IndexKind,
  IndexOffset,
  indexOffsetComparator
} from '../../../src/model/field_index';
import {
  mutationEquals,
  PatchMutation,
  SetMutation
} from '../../../src/model/mutation';
import { Overlay } from '../../../src/model/overlay';
import { ResourcePath } from '../../../src/model/path';
import { Write } from '../../../src/protos/firestore_proto_api';
import {
  JsonProtoSerializer,
  toDocumentMask,
  toMutation,
  toMutationDocument,
  toName
} from '../../../src/remote/serializer';
import {
  deleteMutation,
  fieldIndex,
  key,
  patchMutation,
  setMutation,
  version
} from '../../util/helpers';

import { TEST_SERIALIZER } from './persistence_test_helpers';

// TODO(b/174608374): Remove these tests once we perform a schema migration.
describe('Local Serializer', () => {
  const partition = new DatabaseId('test-project');
  const s = new JsonProtoSerializer(partition, /* useProto3Json= */ false);
  const localSerializer = TEST_SERIALIZER;
  const userId = 'user';
  const batchId = 1;

  const mutationSet = setMutation('foo/bar', {
    a: 'b'
  });
  const mutationPatch = patchMutation('foo/bar', {
    a: 'b'
  });
  const mutationDelete = deleteMutation('foo/bar');

  const setMutationWrite: Write = {
    update: toMutationDocument(s, mutationSet.key, mutationSet.value)
  };
  const patchMutationWrite: Write = {
    update: toMutationDocument(s, mutationPatch.key, mutationPatch.data),
    updateMask: toDocumentMask(mutationPatch.fieldMask)
  };
  const deleteMutationWrite: Write = {
    delete: toName(s, mutationDelete.key)
  };
  // Legacy transform proto.
  const transformMutationWrite: Write = {
    transform: {
      document: toName(s, mutationSet.key),
      fieldTransforms: [
        { fieldPath: 'integer', increment: { integerValue: '42' } },
        { fieldPath: 'double', increment: { doubleValue: 13.37 } }
      ]
    },
    currentDocument: { exists: true }
  };
  // Updated transform proto representation.
  const updateTransforms = {
    updateTransforms: [
      { fieldPath: 'integer', increment: { integerValue: '42' } },
      { fieldPath: 'double', increment: { doubleValue: 13.37 } }
    ]
  };

  it('SetMutation + TransformMutation (legacy) are squashed', () => {
    const dbMutationBatch: DbMutationBatch = {
      userId,
      batchId,
      localWriteTimeMs: 1000,
      mutations: [setMutationWrite, transformMutationWrite]
    };
    const mutationBatch = fromDbMutationBatch(localSerializer, dbMutationBatch);
    expect(mutationBatch.mutations).to.have.lengthOf(1);
    expect(mutationBatch.mutations[0] instanceof SetMutation).to.be.true;
    const serialized = toMutation(s, mutationBatch.mutations[0]);
    expect(serialized).to.deep.equal({
      ...setMutationWrite,
      ...updateTransforms
    });
  });

  it('PatchMutation + TransformMutation (legacy) are squashed', () => {
    const dbMutationBatch: DbMutationBatch = {
      userId,
      batchId,
      localWriteTimeMs: 1000,
      mutations: [patchMutationWrite, transformMutationWrite]
    };
    const mutationBatch = fromDbMutationBatch(localSerializer, dbMutationBatch);
    expect(mutationBatch.mutations).to.have.lengthOf(1);
    expect(mutationBatch.mutations[0] instanceof PatchMutation).to.be.true;
    const serialized = toMutation(s, mutationBatch.mutations[0]);
    expect(serialized).to.deep.equal({
      ...patchMutationWrite,
      ...updateTransforms
    });
  });

  it('TransformMutation (legacy) + TransformMutation (legacy) throw assertion', () => {
    const dbMutationBatch: DbMutationBatch = {
      userId,
      batchId,
      localWriteTimeMs: 1000,
      mutations: [transformMutationWrite, transformMutationWrite]
    };
    expect(() =>
      fromDbMutationBatch(localSerializer, dbMutationBatch)
    ).to.throw(
      'TransformMutation should be preceded by a patch or set mutation'
    );
  });

  it('DeleteMutation + TransformMutation (legacy) on its own throws assertion', () => {
    const dbMutationBatch: DbMutationBatch = {
      userId,
      batchId,
      localWriteTimeMs: 1000,
      mutations: [deleteMutationWrite, transformMutationWrite]
    };
    expect(() =>
      fromDbMutationBatch(localSerializer, dbMutationBatch)
    ).to.throw(
      'TransformMutation should be preceded by a patch or set mutation'
    );
  });

  it('multiple mutations are squashed', () => {
    // INPUT:
    // SetMutation -> SetMutation -> TransformMutation ->
    // DeleteMutation -> PatchMutation -> TransformMutation -> PatchMutation
    // OUTPUT (squashed):
    // SetMutation -> SetMutation -> DeleteMutation -> PatchMutation -> PatchMutation
    const dbMutationBatch: DbMutationBatch = {
      userId,
      batchId,
      localWriteTimeMs: 1000,
      mutations: [
        setMutationWrite,
        setMutationWrite,
        transformMutationWrite,
        deleteMutationWrite,
        patchMutationWrite,
        transformMutationWrite,
        patchMutationWrite
      ]
    };
    const expected = [
      setMutationWrite,
      { ...setMutationWrite, ...updateTransforms },
      deleteMutationWrite,
      { ...patchMutationWrite, ...updateTransforms },
      patchMutationWrite
    ];
    const mutationBatch = fromDbMutationBatch(localSerializer, dbMutationBatch);
    expect(mutationBatch.mutations).to.have.lengthOf(5);
    mutationBatch.mutations.forEach((mutation, index) => {
      const serialized = toMutation(s, mutationBatch.mutations[index]);
      expect(serialized).to.deep.equal(expected[index]);
    });
  });

  it('serializes overlay', () => {
    const m = patchMutation('coll1/doc1/coll2/doc2', { 'foo': 'bar' });
    const overlay = new Overlay(2, m);

    const serialized = toDbDocumentOverlay(localSerializer, userId, overlay);
    expect(serialized).to.deep.equal({
      userId,
      collectionPath: encodeResourcePath(
        ResourcePath.fromString('coll1/doc1/coll2')
      ),
      documentId: 'doc2',
      collectionGroup: 'coll2',
      largestBatchId: 2,
      overlayMutation: toMutation(localSerializer.remoteSerializer, m)
    });

    const roundTripped = fromDbDocumentOverlay(localSerializer, serialized);
    expect(roundTripped.largestBatchId).to.equal(overlay.largestBatchId);
    expect(mutationEquals(roundTripped.mutation, overlay.mutation)).to.equal(
      true
    );
  });

  it('serializes FieldIndex', () => {
    const index = fieldIndex('foo', {
      fields: [
        ['a', IndexKind.ASCENDING],
        ['b', IndexKind.DESCENDING],
        ['c', IndexKind.CONTAINS]
      ]
    });
    const dbIndex = toDbIndexConfiguration(index);
    expect(dbIndex).to.deep.equal({
      collectionGroup: 'foo',
      fields: [
        ['a', 0],
        ['b', 1],
        ['c', 2]
      ],
      indexId: -1
    });

    expect(fromDbIndexConfiguration(dbIndex, null).indexId).to.equal(-1);
    expect(fromDbIndexConfiguration(dbIndex, null).collectionGroup).to.equal(
      index.collectionGroup
    );
    expect(fromDbIndexConfiguration(dbIndex, null).fields).to.deep.equal(
      index.fields
    );
  });

  it('serializes IndexState', () => {
    const expected = new IndexOffset(version(1234), key('coll/doc'), 42);

    const dbIndexState = toDbIndexState(
      /* indexId= */ 1,
      /* uid= */ '',
      /* sequenceNumber= */ 2,
      expected
    );
    expect(dbIndexState).to.deep.equal({
      documentKey: 'coll\u0001\u0001doc\u0001\u0001',
      indexId: 1,
      largestBatchId: 42,
      readTime: {
        nanoseconds: 1234000,
        seconds: 0
      },
      sequenceNumber: 2,
      uid: ''
    });

    const dbIndex = {
      collectionGroup: 'coll',
      fields: [],
      indexId: 1
    };
    const actual = fromDbIndexConfiguration(dbIndex, dbIndexState).indexState
      .offset;
    expect(indexOffsetComparator(actual, expected)).to.equal(0);
  });
});
