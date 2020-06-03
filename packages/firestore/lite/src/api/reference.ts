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

import { DocumentKey } from '../../../src/model/document_key';
import { Firestore } from './database';
import { DocumentKeyReference } from '../../../src/api/user_data_reader';

/**
 * A reference to a particular document in a collection in the database.
 */
export class DocumentReference<T = firestore.DocumentData>
  extends DocumentKeyReference<T>
  implements firestore.DocumentReference<T> {
  constructor(
    readonly firestore: Firestore,
    key: DocumentKey,
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
  ): firestore.DocumentReference<U> {
    return new DocumentReference<U>(this.firestore, this._key, converter);
  }
}
