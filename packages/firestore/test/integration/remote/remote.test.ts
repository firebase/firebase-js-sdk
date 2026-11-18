/**
 * @license
 * Copyright 2026 Google LLC
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

import { SnapshotVersion } from '../../../src/core/snapshot_version';
import {
  invokeBatchGetDocumentsRpc,
  invokeCommitRpc
} from '../../../src/remote/datastore';
import { addEqualityMatcher } from '../../util/equality_matcher';
import { key, setMutation } from '../../util/helpers';
import { withTestDatastore } from '../util/internal_helpers';

describe('Remote Storage', () => {
  addEqualityMatcher();

  it('can write', () => {
    return withTestDatastore(ds => {
      const mutation = setMutation('docs/1', { sort: 1 });
      return invokeCommitRpc(ds, [mutation]);
    });
  });

  it('can read', () => {
    return withTestDatastore(async ds => {
      const k = key('docs/1');
      const mutation = setMutation('docs/1', { sort: 10 });

      await invokeCommitRpc(ds, [mutation]);
      const docs = await invokeBatchGetDocumentsRpc(ds, [k]);
      expect(docs.length).toBe(1);

      const doc = docs[0];
      expect(doc.isFoundDocument()).toBe(true);
      expect(doc.data).toEqual(mutation.value);
      expect(doc.key).toEqual(k);
      expect(SnapshotVersion.min().compareTo(doc.version)).toBeLessThan(0);
    });
  });

  it('can read deleted documents', () => {
    return withTestDatastore(async ds => {
      const k = key('docs/2');

      const docs = await invokeBatchGetDocumentsRpc(ds, [k]);
      expect(docs.length).toBe(1);

      const doc = docs[0];
      expect(doc.isNoDocument()).toBe(true);
      expect(doc.key).toEqual(k);
      expect(SnapshotVersion.min().compareTo(doc.version)).toBeLessThan(0);
    });
  });
});
