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

import { initializeApp } from '@firebase/app-exp';

import { initializeFirestore, Firestore } from '../src/api/database';
import {
  doc,
  collection,
  setDoc,
  DocumentData,
  CollectionReference,
  DocumentReference,
  SetOptions
} from '../src/api/reference';
import {
  DEFAULT_PROJECT_ID,
  DEFAULT_SETTINGS
} from '../../test/integration/util/settings';
import { AutoId } from '../../src/util/misc';
import { expect } from 'chai';
import { QueryDocumentSnapshot } from '../src/api/snapshot';
import { Settings } from '../../exp/src/api/database';

let appCount = 0;

export async function withTestDbSettings(
  projectId: string,
  settings: Settings,
  fn: (db: Firestore) => void | Promise<void>
): Promise<void> {
  const app = initializeApp(
    { apiKey: 'fake-api-key', projectId },
    'test-app-' + appCount++
  );

  const firestore = initializeFirestore(app, settings);
  return fn(firestore);
}

export function withTestDb(
  fn: (db: Firestore) => void | Promise<void>
): Promise<void> {
  return withTestDbSettings(DEFAULT_PROJECT_ID, DEFAULT_SETTINGS, fn);
}

export function withTestDoc(
  fn: (doc: DocumentReference) => void | Promise<void>
): Promise<void> {
  return withTestDb(db => {
    return fn(doc(collection(db, 'test-collection')));
  });
}

export function withTestDocAndInitialData(
  data: DocumentData,
  fn: (doc: DocumentReference<DocumentData>) => void | Promise<void>
): Promise<void> {
  return withTestDb(async db => {
    const ref = doc(collection(db, 'test-collection'));
    await setDoc(ref, data);
    return fn(ref);
  });
}

export function withTestCollectionAndInitialData(
  data: DocumentData[],
  fn: (collRef: CollectionReference<DocumentData>) => void | Promise<void>
): Promise<void> {
  return withTestDb(async db => {
    const coll = collection(db, AutoId.newId());
    for (const element of data) {
      const ref = doc(coll);
      await setDoc(ref, element);
    }
    return fn(coll);
  });
}

export function withTestCollection(
  fn: (collRef: CollectionReference) => void | Promise<void>
): Promise<void> {
  return withTestDb(db => {
    return fn(collection(db, AutoId.newId()));
  });
}

// Used for testing the FirestoreDataConverter.
export class Post {
  constructor(readonly title: string, readonly author: string) {}
  byline(): string {
    return this.title + ', by ' + this.author;
  }
}

export const postConverter = {
  toFirestore(post: Post): DocumentData {
    return { title: post.title, author: post.author };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot<DocumentData>): Post {
    const data = snapshot.data();
    return new Post(data.title, data.author);
  }
};

export const postConverterMerge = {
  toFirestore(post: Partial<Post>, options?: SetOptions): DocumentData {
    if (
      options &&
      ((options as { merge: true }).merge ||
        (options as { mergeFields: Array<string | number> }).mergeFields)
    ) {
      expect(post).to.not.be.an.instanceof(Post);
    } else {
      expect(post).to.be.an.instanceof(Post);
    }
    const result: DocumentData = {};
    if (post.title) {
      result.title = post.title;
    }
    if (post.author) {
      result.author = post.author;
    }
    return result;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot<DocumentData>): Post {
    const data = snapshot.data();
    return new Post(data.title, data.author);
  }
};
