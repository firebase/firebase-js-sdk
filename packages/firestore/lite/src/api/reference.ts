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

import * as firestore from '../../index';

import { hardAssert, hardCast } from '../../../src/util/assert';

import { Document } from '../../../src/model/document';
import { DocumentKey } from '../../../src/model/document_key';
import { Firestore } from './database';
import { invokeBatchGetDocumentsRpc } from '../../../src/remote/datastore';
import { DocumentKeyReference } from '../../../src/api/user_data_reader';
import { DocumentSnapshot } from './snapshot';

/**
 * A reference to a particular document in a collection in the database.
 */
export class DocumentReference<T = firestore.DocumentData>
  extends DocumentKeyReference<T>
  implements firestore.DocumentReference<T> {
  constructor(
    key: DocumentKey,
    readonly firestore: Firestore,
    readonly _converter?: firestore.FirestoreDataConverter<T>
  ) {
    super(firestore._databaseId, key, _converter);
  }

  get id(): string {
    return this._key.path.lastSegment();
  }

  get path(): string {
    return this._key.path.canonicalString();
  }

  withConverter<U>(
    converter: firestore.FirestoreDataConverter<U>
  ): DocumentReference<U> {
    return new DocumentReference<U>(this._key, this.firestore, converter);
  }
}

export function getDoc<T>(
  reference: firestore.DocumentReference<T>
): Promise<DocumentSnapshot<T>> {
  const ref = hardCast(reference, DocumentReference);
  return ref.firestore._ensureClientConfigured().then(async () => {
    const result = await invokeBatchGetDocumentsRpc(ref.firestore._datastore, [
      ref._key
    ]);
    hardAssert(result.length == 1, 'Expected a single document result');
    const maybeDocument = result[0];
    return new DocumentSnapshot<T>(
      ref.firestore,
      ref._key,
      maybeDocument instanceof Document ? maybeDocument : null
    );
  });
}
