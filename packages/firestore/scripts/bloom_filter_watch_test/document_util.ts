/**
 * @license
 * Copyright 2023 Google LLC
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

import {generateIds} from './util';
import {
  doc,
  DocumentReference,
  Firestore,
  collection,
  writeBatch,
  WriteBatch,
  DocumentData, CollectionReference
} from '../../src';

export class DocumentUtil {

  constructor(readonly db: Firestore, readonly collectionId: string) {
  }

  async createDocuments(count:number, documentData: DocumentData): Promise<Array<DocumentReference>> {
    const collectionRef = collection(this.db, this.collectionId);
    const documentIds = generateIds(count).sort();
    const documentRefs = documentRefsFromIds(collectionRef, documentIds);
    await createDocumentsInBatches(this.db, documentRefs, documentData);
    return documentRefs;
  }

  async deleteDocuments(documentRefs: Array<DocumentReference>): Promise<void> {
    await deleteDocumentsInBatches(this.db, documentRefs);
  }

}

function documentRefsFromIds(collectionRef: CollectionReference, ids: Array<string>): Array<DocumentReference> {
  return ids.map(documentId => doc(collectionRef, documentId));
}

function createDocumentsInBatches(db: Firestore, documentRefs: Array<DocumentReference>, documentData: DocumentData): Promise<unknown> {
  return performWritesInBatches(db, documentRefs, (writeBatch_, documentRef) => {
    writeBatch_.set(documentRef, documentData);
  });
}

function deleteDocumentsInBatches(db: Firestore, documentRefs: Array<DocumentReference>): Promise<unknown> {
  return performWritesInBatches(db, documentRefs, (writeBatch_, documentRef) => {
    writeBatch_.delete(documentRef);
  });
}

function performWritesInBatches<T>(db: Firestore, items: Array<T>, callback: (writeBatch_: WriteBatch, item: T) => void): Promise<unknown> {
  const writeBatches: Array<WriteBatch> = [];
  let writeBatch_ = writeBatch(db);
  let currentWriteBatchWriteCount = 0;

  for (const item of items) {
    if (currentWriteBatchWriteCount === 500) {
      writeBatches.push(writeBatch_);
      writeBatch_ = writeBatch(db);
      currentWriteBatchWriteCount = 0;
    }

    callback(writeBatch_, item);
    currentWriteBatchWriteCount++;
  }

  if (currentWriteBatchWriteCount > 0) {
    writeBatches.push(writeBatch_);
  }

  return Promise.all(writeBatches.map(batch => batch.commit()));
}
