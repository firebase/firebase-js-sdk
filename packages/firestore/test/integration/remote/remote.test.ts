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

import { SnapshotVersion } from '../../../src/core/snapshot_version';
import { Document, NoDocument } from '../../../src/model/document';
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
      expect(docs.length).to.equal(1);

      const doc = docs[0];
      expect(doc).to.be.an.instanceof(Document);
      if (doc instanceof Document) {
        expect(doc.data()).to.deep.equal(mutation.value);
        expect(doc.key).to.deep.equal(k);
        expect(SnapshotVersion.min().compareTo(doc.version)).to.be.lessThan(0);
      }
    });
  });

  it('can read deleted documents', () => {
    return withTestDatastore(async ds => {
      const k = key('docs/2');

      const docs = await invokeBatchGetDocumentsRpc(ds, [k]);
      expect(docs.length).to.equal(1);

      const doc = docs[0];
      expect(doc).to.be.an.instanceof(NoDocument);
      if (doc instanceof NoDocument) {
        expect(doc.key).to.deep.equal(k);
        expect(SnapshotVersion.min().compareTo(doc.version)).to.be.lessThan(0);
      }
    });
  });
});
