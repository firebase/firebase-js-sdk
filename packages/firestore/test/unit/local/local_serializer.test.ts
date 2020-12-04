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
import { fromDbMutationBatch } from '../../../src/local/local_serializer';
import { TEST_SERIALIZER } from './persistence_test_helpers';
import { DbMutationBatch } from '../../../src/local/indexeddb_schema';
import { Write } from '../../../src/protos/firestore_proto_api';
import { deleteMutation, patchMutation, setMutation } from '../../util/helpers';
import {
  JsonProtoSerializer,
  toDocumentMask,
  toMutation,
  toMutationDocument,
  toName
} from '../../../src/remote/serializer';
import { DatabaseId } from '../../../src/core/database_info';
import { PatchMutation, SetMutation } from '../../../src/model/mutation';

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
  const updateTransformWrite = {
    updateTransforms: [
      { fieldPath: 'integer', increment: { integerValue: '42' } },
      { fieldPath: 'double', increment: { doubleValue: 13.37 } }
    ]
  };

  it('SetMutation + TransformMutation (legacy) are squashed', () => {
    const dbMutationBatch = new DbMutationBatch(
      userId,
      batchId,
      1000,
      [],
      [setMutationWrite, transformMutationWrite]
    );
    const mutationBatch = fromDbMutationBatch(localSerializer, dbMutationBatch);
    expect(mutationBatch.mutations).to.have.lengthOf(1);
    expect(mutationBatch.mutations[0] instanceof SetMutation).to.be.true;
    const serialized = toMutation(s, mutationBatch.mutations[0]);
    expect(serialized).to.deep.equal({
      ...setMutationWrite,
      ...updateTransformWrite
    });
  });

  it('PatchMutation + TransformMutation (legacy) are squashed', () => {
    const dbMutationBatch = new DbMutationBatch(
      userId,
      batchId,
      1000,
      [],
      [patchMutationWrite, transformMutationWrite]
    );
    const mutationBatch = fromDbMutationBatch(localSerializer, dbMutationBatch);
    expect(mutationBatch.mutations).to.have.lengthOf(1);
    expect(mutationBatch.mutations[0] instanceof PatchMutation).to.be.true;
    const serialized = toMutation(s, mutationBatch.mutations[0]);
    expect(serialized).to.deep.equal({
      ...patchMutationWrite,
      ...updateTransformWrite
    });
  });

  it('TransformMutation (legacy) + TransformMutation (legacy) throw assertion', () => {
    const dbMutationBatch = new DbMutationBatch(
      userId,
      batchId,
      1000,
      [],
      [transformMutationWrite, transformMutationWrite]
    );
    expect(() =>
      fromDbMutationBatch(localSerializer, dbMutationBatch)
    ).to.throw(
      'TransformMutation should be preceded by a patch or set mutation'
    );
  });

  it('TransformMutation (legacy) on its own throws assertion', () => {
    const dbMutationBatch = new DbMutationBatch(
      userId,
      batchId,
      1000,
      [],
      [transformMutationWrite]
    );
    expect(() =>
      fromDbMutationBatch(localSerializer, dbMutationBatch)
    ).to.throw(
      'TransformMutation should be preceded by a patch or set mutation'
    );
  });

  it('DeleteMutation + TransformMutation (legacy) on its own throws assertion', () => {
    const dbMutationBatch = new DbMutationBatch(
      userId,
      batchId,
      1000,
      [],
      [deleteMutationWrite, transformMutationWrite]
    );
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
    const dbMutationBatch = new DbMutationBatch(
      userId,
      batchId,
      1000,
      [],
      [
        setMutationWrite,
        setMutationWrite,
        transformMutationWrite,
        deleteMutationWrite,
        patchMutationWrite,
        transformMutationWrite,
        patchMutationWrite
      ]
    );
    const expected = [
      setMutationWrite,
      { ...setMutationWrite, ...updateTransformWrite },
      deleteMutationWrite,
      { ...patchMutationWrite, ...updateTransformWrite },
      patchMutationWrite
    ];
    const mutationBatch = fromDbMutationBatch(localSerializer, dbMutationBatch);
    expect(mutationBatch.mutations).to.have.lengthOf(5);
    mutationBatch.mutations.forEach((mutation, index) => {
      const serialized = toMutation(s, mutationBatch.mutations[index]);
      expect(serialized).to.deep.equal(expected[index]);
    });
  });
});
