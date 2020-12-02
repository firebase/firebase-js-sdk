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

import { expect, use } from 'chai';
import { fromDbMutationBatch } from '../../../src/local/local_serializer';
import { TEST_SERIALIZER } from './persistence_test_helpers';
import { DbMutationBatch } from '../../../src/local/indexeddb_schema';
import { Write } from '../../../src/protos/firestore_proto_api';
import { deleteMutation, patchMutation, setMutation } from '../../util/helpers';
import {
  JsonProtoSerializer,
  toDocument,
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

  it('SetMutation + TransformMutation (legacy) are squashed', () => {
    let mutationSet = setMutation('foo/bar', {
      a: 'b'
    });
    const mutations: Write[] = [
      {
        update: toMutationDocument(s, mutationSet.key, mutationSet.value)
      },
      // Legacy transform proto.
      {
        transform: {
          document: toName(s, mutationSet.key),
          fieldTransforms: [
            { fieldPath: 'integer', increment: { integerValue: '42' } },
            { fieldPath: 'double', increment: { doubleValue: 13.37 } }
          ]
        },
        currentDocument: { exists: true }
      }
    ];
    const dbMutationBatch = new DbMutationBatch(
      userId,
      batchId,
      1000,
      [],
      mutations
    );

    const expected = {
      update: toMutationDocument(s, mutationSet.key, mutationSet.value),
      updateTransforms: [
        { fieldPath: 'integer', increment: { integerValue: '42' } },
        { fieldPath: 'double', increment: { doubleValue: 13.37 } }
      ]
    };
    const mutationBatch = fromDbMutationBatch(localSerializer, dbMutationBatch);
    expect(mutationBatch.mutations.length).to.equal(1);
    expect(mutationBatch.mutations[0] instanceof SetMutation).to.be.true;
    const serialized = toMutation(s, mutationBatch.mutations[0]);
    expect(serialized).to.deep.equal(expected);
  });

  it('PatchMutation + TransformMutation (legacy) are squashed', () => {
    let mutationPatch = patchMutation('foo/bar', {
      a: 'b'
    });
    const mutations: Write[] = [
      {
        update: toMutationDocument(s, mutationPatch.key, mutationPatch.data),
        updateMask: toDocumentMask(mutationPatch.fieldMask)
      },
      // Legacy transform proto.
      {
        transform: {
          document: toName(s, mutationPatch.key),
          fieldTransforms: [
            { fieldPath: 'integer', increment: { integerValue: '42' } },
            { fieldPath: 'double', increment: { doubleValue: 13.37 } }
          ]
        },
        currentDocument: { exists: true }
      }
    ];
    const dbMutationBatch = new DbMutationBatch(
      userId,
      batchId,
      1000,
      [],
      mutations
    );

    const expected = {
      update: toMutationDocument(s, mutationPatch.key, mutationPatch.data),
      updateMask: toDocumentMask(mutationPatch.fieldMask),
      updateTransforms: [
        { fieldPath: 'integer', increment: { integerValue: '42' } },
        { fieldPath: 'double', increment: { doubleValue: 13.37 } }
      ]
    };
    const mutationBatch = fromDbMutationBatch(localSerializer, dbMutationBatch);
    expect(mutationBatch.mutations.length).to.equal(1);
    expect(mutationBatch.mutations[0] instanceof PatchMutation).to.be.true;
    const serialized = toMutation(s, mutationBatch.mutations[0]);
    expect(serialized).to.deep.equal(expected);
  });

  it('TransformMutation (legacy) + TransformMutation (legacy) throw assertion', () => {
    let mutationPatch = patchMutation('foo/bar', {
      a: 'b'
    });
    const mutations: Write[] = [
      {
        transform: {
          document: toName(s, mutationPatch.key),
          fieldTransforms: [
            { fieldPath: 'integer', increment: { integerValue: '43' } },
            { fieldPath: 'double', increment: { doubleValue: 13.37 } }
          ]
        },
        currentDocument: { exists: true }
      },
      // Legacy transform proto.
      {
        transform: {
          document: toName(s, mutationPatch.key),
          fieldTransforms: [
            { fieldPath: 'integer', increment: { integerValue: '43' } },
            { fieldPath: 'double', increment: { doubleValue: 13.37 } }
          ]
        },
        currentDocument: { exists: true }
      }
    ];
    const dbMutationBatch = new DbMutationBatch(
      userId,
      batchId,
      1000,
      [],
      mutations
    );

    expect(() =>
      fromDbMutationBatch(localSerializer, dbMutationBatch)
    ).to.throw(
      'TransformMutation should be preceded by a patch or set mutation'
    );
  });

  it('TransformMutation (legacy) on its own throws assertion', () => {
    let mutationPatch = patchMutation('foo/bar', {
      a: 'b'
    });
    const mutations: Write[] = [
      {
        transform: {
          document: toName(s, mutationPatch.key),
          fieldTransforms: [
            { fieldPath: 'integer', increment: { integerValue: '42' } },
            { fieldPath: 'double', increment: { doubleValue: 13.37 } }
          ]
        },
        currentDocument: { exists: true }
      }
    ];
    const dbMutationBatch = new DbMutationBatch(
      userId,
      batchId,
      1000,
      [],
      mutations
    );

    expect(() =>
      fromDbMutationBatch(localSerializer, dbMutationBatch)
    ).to.throw(
      'TransformMutation should be preceded by a patch or set mutation'
    );
  });

  it('DeleteMutation + TransformMutation (legacy) on its own throws assertion', () => {
    let mutation = deleteMutation('foo/bar');
    const mutations: Write[] = [
      {
        delete: toName(s, mutation.key)
      },
      {
        transform: {
          document: toName(s, mutation.key),
          fieldTransforms: [
            { fieldPath: 'integer', increment: { integerValue: '42' } },
            { fieldPath: 'double', increment: { doubleValue: 13.37 } }
          ]
        },
        currentDocument: { exists: true }
      }
    ];
    const dbMutationBatch = new DbMutationBatch(
      userId,
      batchId,
      1000,
      [],
      mutations
    );

    expect(() =>
      fromDbMutationBatch(localSerializer, dbMutationBatch)
    ).to.throw(
      'TransformMutation should be preceded by a patch or set mutation'
    );
  });

  it('multiple mutations are squashed', () => {
    let mutationPatch = patchMutation('foo/bar', {
      a: 'b'
    });
    let mutationSet = setMutation('foo/bar', {
      a: 'b'
    });
    let mutationDelete = deleteMutation('foo/baz');

    // INPUT:
    // SetMutation -> SetMutation -> TransformMutation ->
    // DeleteMutation -> PatchMutation -> TransformMutation -> PatchMutation
    // OUTPUT (squashed):
    // SetMutation -> SetMutation -> DeleteMutation -> PatchMutation -> PatchMutation
    const mutations: Write[] = [
      {
        update: toMutationDocument(s, mutationSet.key, mutationSet.value)
      },
      {
        update: toMutationDocument(s, mutationSet.key, mutationSet.value)
      },
      {
        transform: {
          document: toName(s, mutationSet.key),
          fieldTransforms: [
            { fieldPath: 'integer', increment: { integerValue: '43' } },
            { fieldPath: 'double', increment: { doubleValue: 13.37 } }
          ]
        },
        currentDocument: { exists: true }
      },
      {
        delete: toName(s, mutationDelete.key)
      },
      {
        update: toMutationDocument(s, mutationPatch.key, mutationPatch.data),
        updateMask: toDocumentMask(mutationPatch.fieldMask)
      },
      {
        transform: {
          document: toName(s, mutationPatch.key),
          fieldTransforms: [
            { fieldPath: 'integer', increment: { integerValue: '42' } },
            { fieldPath: 'double', increment: { doubleValue: 13.37 } }
          ]
        },
        currentDocument: { exists: true }
      },
      {
        update: toMutationDocument(s, mutationPatch.key, mutationPatch.data),
        updateMask: toDocumentMask(mutationPatch.fieldMask)
      }
    ];
    const dbMutationBatch = new DbMutationBatch(
      userId,
      batchId,
      1000,
      [],
      mutations
    );

    const expected = [
      {
        update: toMutationDocument(s, mutationSet.key, mutationSet.value)
      },
      {
        update: toMutationDocument(s, mutationSet.key, mutationSet.value),
        updateTransforms: [
          { fieldPath: 'integer', increment: { integerValue: '43' } },
          { fieldPath: 'double', increment: { doubleValue: 13.37 } }
        ]
      },
      {
        delete: toName(s, mutationDelete.key)
      },
      {
        update: toMutationDocument(s, mutationPatch.key, mutationPatch.data),
        updateMask: toDocumentMask(mutationPatch.fieldMask),
        updateTransforms: [
          { fieldPath: 'integer', increment: { integerValue: '42' } },
          { fieldPath: 'double', increment: { doubleValue: 13.37 } }
        ]
      },
      {
        update: toMutationDocument(s, mutationPatch.key, mutationPatch.data),
        updateMask: toDocumentMask(mutationPatch.fieldMask)
      }
    ];
    const mutationBatch = fromDbMutationBatch(localSerializer, dbMutationBatch);
    expect(mutationBatch.mutations.length).to.equal(5);
    mutationBatch.mutations.forEach((mutation, index) => {
      const serialized = toMutation(s, mutationBatch.mutations[index]);
      expect(serialized).to.deep.equal(expected[index]);
    });
  });
});
