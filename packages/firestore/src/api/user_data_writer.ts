/**
 * @license
 * Copyright 2024 Google LLC
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

import { Bytes } from '../lite-api/bytes';
import { DocumentReference } from '../lite-api/reference';
import { AbstractUserDataWriter } from '../lite-api/user_data_writer';
import { ByteString } from '../util/byte_string';

import { Firestore } from './database';

export class ExpUserDataWriter extends AbstractUserDataWriter {
  constructor(protected firestore: Firestore) {
    super();
  }

  protected convertBytes(bytes: ByteString): Bytes {
    return new Bytes(bytes);
  }

  protected convertReference(name: string): DocumentReference {
    const key = this.convertDocumentKey(name, this.firestore._databaseId);
    return new DocumentReference(this.firestore, /* converter= */ null, key);
  }
}
