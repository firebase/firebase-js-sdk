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

// See https://github.com/typescript-eslint/typescript-eslint/issues/363
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as firestore from '../../index';

import { Firestore } from './database';
import { DocumentKeyReference } from '../../../src/api/user_data_reader';
import { debugAssert } from '../../../src/util/assert';
import { cast } from '../../../lite/src/api/util';
import { DocumentSnapshot } from './snapshot';
import { Rejecter, Resolver } from '../../../src/util/promise';
import {
  getDocViaSnapshotListener,
  SnapshotMetadata
} from '../../../src/api/database';
import { ViewSnapshot } from '../../../src/core/view_snapshot';
import { DocumentReference } from '../../../lite/src/api/reference';

export function getDoc<T>(
  reference: firestore.DocumentReference<T>
): Promise<firestore.DocumentSnapshot<T>> {
  const ref = cast<DocumentReference<T>>(reference, DocumentReference);
  const firestore = cast<Firestore>(ref.firestore, Firestore);
  return firestore._getFirestoreClient().then(async firestoreClient => {
    return new Promise(
      (resolve: Resolver<firestore.DocumentSnapshot<T>>, reject: Rejecter) => {
        getDocViaSnapshotListener(
          firestoreClient,
          ref,
          async snapshot => {
            const viewSnapshot = await snapshot;
            resolve(
              viewSnapshot
                ? convertToDocSnapshot(firestore, ref, viewSnapshot)
                : undefined
            );
          },
          reject
        );
      }
    );
  });
}

/**
 * Converts a ViewSnapshot that contains the single document specified by `ref`
 * to a DocumentSnapshot.
 */
function convertToDocSnapshot<T>(
  firestore: Firestore,
  ref: DocumentKeyReference<T>,
  snapshot: ViewSnapshot
): DocumentSnapshot<T> {
  debugAssert(
    snapshot.docs.size <= 1,
    'Too many documents returned on a document query'
  );
  const doc = snapshot.docs.get(ref._key);

  return new DocumentSnapshot(
    firestore,
    ref._key,
    doc,
    ref._converter,
    new SnapshotMetadata(snapshot.hasPendingWrites, snapshot.fromCache)
  );
}
