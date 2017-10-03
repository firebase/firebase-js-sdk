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
import { EmptyCredentialsProvider } from '../../../../src/firestore/api/credentials';
import {
  DatabaseId,
  DatabaseInfo
} from '../../../../src/firestore/core/database_info';
import { SnapshotVersion } from '../../../../src/firestore/core/snapshot_version';
import {
  Document,
  MaybeDocument,
  NoDocument
} from '../../../../src/firestore/model/document';
import { MutationResult } from '../../../../src/firestore/model/mutation';
import { PlatformSupport } from '../../../../src/firestore/platform/platform';
import { Datastore } from '../../../../src/firestore/remote/datastore';
import { AsyncQueue } from '../../../../src/firestore/util/async_queue';
import { addEqualityMatcher } from '../../util/equality_matcher';
import { asyncIt, key, setMutation } from '../../util/helpers';
import { DEFAULT_PROJECT_ID, getDefaultDatabaseInfo } from '../util/helpers';

describe('Remote Storage', () => {
  addEqualityMatcher();

  function initializeDatastore(): Promise<Datastore> {
    const databaseInfo = getDefaultDatabaseInfo();
    const queue = new AsyncQueue();
    return PlatformSupport.getPlatform()
      .loadConnection(databaseInfo)
      .then(conn => {
        const serializer = PlatformSupport.getPlatform().newSerializer(
          databaseInfo.databaseId
        );
        return new Datastore(
          databaseInfo,
          queue,
          conn,
          new EmptyCredentialsProvider(),
          serializer
        );
      });
  }

  asyncIt('can write', () => {
    return initializeDatastore().then(ds => {
      const mutation = setMutation('docs/1', { sort: 1 });

      return ds.commit([mutation]).then((result: MutationResult[]) => {
        expect(result.length).to.equal(1);
        const version = result[0].version;
        expect(version).not.to.equal(null);
        expect(SnapshotVersion.MIN.compareTo(version!)).to.be.lessThan(0);
      });
    });
  });

  asyncIt('can read', () => {
    return initializeDatastore().then(ds => {
      const k = key('docs/1');
      const mutation = setMutation('docs/1', { sort: 10 });

      return ds
        .commit([mutation])
        .then((result: MutationResult[]) => {
          return ds.lookup([k]);
        })
        .then((docs: MaybeDocument[]) => {
          expect(docs.length).to.equal(1);

          const doc = docs[0];
          expect(doc).to.be.an.instanceof(Document);
          if (doc instanceof Document) {
            expect(doc.data).to.deep.equal(mutation.value);
            expect(doc.key).to.deep.equal(k);
            expect(SnapshotVersion.MIN.compareTo(doc.version)).to.be.lessThan(
              0
            );
          }
        });
    });
  });

  asyncIt('can read deleted documents', () => {
    return initializeDatastore().then(ds => {
      const k = key('docs/2');
      return ds.lookup([k]).then((docs: MaybeDocument[]) => {
        expect(docs.length).to.equal(1);
        const doc = docs[0];
        expect(doc).to.be.an.instanceof(NoDocument);
        if (doc instanceof NoDocument) {
          expect(doc.key).to.deep.equal(k);
          expect(SnapshotVersion.MIN.compareTo(doc.version)).to.be.lessThan(0);
        }
      });
    });
  });
});
