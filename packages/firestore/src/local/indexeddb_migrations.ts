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
  DbMutationBatch, DbMutationQueue, DbOwner,
  DbRemoteDocument, DbTarget,
  DbTargetDocument, DbTargetGlobal
} from './indexeddb_schema';
import {assert, fail} from '../util/assert';

// TODO(mikelehen): Get rid of "as any" if/when TypeScript fixes their types.
// https://github.com/Microsoft/TypeScript/issues/14322
type KeyPath = any; // tslint:disable-line:no-any

function createCache(db: IDBDatabase): void {
  const targetDocumentsStore = db.createObjectStore(
      DbTargetDocument.store,
      { keyPath: DbTargetDocument.keyPath as KeyPath }
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
  db.createObjectStore(DbRemoteDocument.store);
  db.createObjectStore(DbTargetGlobal.store);
}

function dropCache(db: IDBDatabase): void {
  db.deleteObjectStore(DbTargetDocument.store);
  db.deleteObjectStore(DbTarget.keyPath);
  db.deleteObjectStore(DbRemoteDocument.store);
  db.deleteObjectStore(DbTargetGlobal.store);
}

function createOwnerStore(db: IDBDatabase) : void {
  db.createObjectStore(DbOwner.store);
}

function createInstanceStore(db: IDBDatabase) : void {
  db.createObjectStore(DbInstance.store, {
    keyPath: DbInstance.keyPath as KeyPath
  });
}

function createMutationQueue(db: IDBDatabase) : void {
  db.createObjectStore(DbMutationQueue.store, {
    keyPath: DbMutationQueue.keyPath
  });

  db.createObjectStore(
      DbMutationBatch.store,
      { keyPath: DbMutationBatch.keyPath as KeyPath }
  );

  // NOTE: keys for these stores are specified explicitly rather than using a
  // keyPath.
  db.createObjectStore(DbDocumentMutation.store);
}

/**
 * Runs any migrations needed to bring the given database up to the current
 * schema version.
 */
export function createOrUpgradeDb(db: IDBDatabase, oldVersion: number, newVersion: number): void   {
  assert(oldVersion >= 0 || oldVersion <= 1, 'Unexpected upgrade from version ' + oldVersion);
  assert(newVersion >= 1 || newVersion <= 2, 'Unexpected upgrade to version ' + newVersion);

  const createV1 = newVersion >= 1 && oldVersion <= 1;
  const dropV1 = oldVersion >= 1;
  const createV2 = newVersion >= 2 && oldVersion <= 2;

  if (dropV1) {
    dropCache(db);
  }

  if (createV1) {
    createOwnerStore(db);
    createMutationQueue(db);
    createCache(db);
  }

  if (createV2) {
    createInstanceStore(db);
  }
}