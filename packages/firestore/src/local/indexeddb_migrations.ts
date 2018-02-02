/**
 * Copyright 2018 Google Inc.
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
import {
  DbDocumentMutation, DbInstance,
  DbMutationBatch, DbMutationQueue, DbOwner, DbRemoteDocument, DbTarget,
  DbTargetDocument, DbTargetGlobal
} from './indexeddb_schema';
import {fail} from '../util/assert';

export function createDb(db: IDBDatabase): void {
  db.createObjectStore(DbMutationQueue.store, {
    keyPath: DbMutationQueue.keyPath
  });

  // TODO(mikelehen): Get rid of "as any" if/when TypeScript fixes their
  // types. https://github.com/Microsoft/TypeScript/issues/14322
  db.createObjectStore(
      DbMutationBatch.store,
      // tslint:disable-next-line:no-any
      { keyPath: DbMutationBatch.keyPath as any }
  );

  const targetDocumentsStore = db.createObjectStore(
      DbTargetDocument.store,
      // tslint:disable-next-line:no-any
      { keyPath: DbTargetDocument.keyPath as any }
  );
  targetDocumentsStore.createIndex(
      DbTargetDocument.documentTargetsIndex,
      DbTargetDocument.documentTargetsKeyPath,
      { unique: true }
  );

  const targetStore = db.createObjectStore(DbTarget.store, {
    keyPath: DbTarget.keyPath
  });
  // NOTE: This is unique only because the TargetId is the suffix.
  targetStore.createIndex(
      DbTarget.queryTargetsIndexName,
      DbTarget.queryTargetsKeyPath,
      { unique: true }
  );

  const instanceStore = db.createObjectStore(DbInstance.store, {
    keyPath: DbInstance.keyPath as any
  });

  // NOTE: keys for these stores are specified explicitly rather than using a
  // keyPath.
  db.createObjectStore(DbDocumentMutation.store);
  db.createObjectStore(DbRemoteDocument.store);
  db.createObjectStore(DbOwner.store);
  db.createObjectStore(DbTargetGlobal.store);
}

export function upgradeDbFromV1(db: IDBDatabase): void {

}

export class IndexedDbMigrations {
  /**
   * Runs any migrations needed to bring the given database up to the current
   * schema version.
   */
  static runMigrations(db: IDBDatabase, oldVersion: number) {
    if (oldVersion == 0) {
      createDb(db, oldVersion);
      return;
    }

    if (oldVersion == 1) {
      upgradeDbFromV1(db, oldVersion);
      return;
    }

    fail('Unexpected upgrade from version ' + oldVersion);
  }
}