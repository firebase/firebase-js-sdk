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

import { DocumentKey } from '../model/document_key';

import { Firestore } from './database';
import { Pipeline } from './pipeline';
import { DocumentReference } from './reference';
import {
  CollectionGroupSource,
  CollectionSource,
  DatabaseSource,
  DocumentsSource
} from './stage';
import { UserDataReader } from './user_data_reader';
import { AbstractUserDataWriter } from './user_data_writer';

/**
 * Represents the source of a Firestore {@link Pipeline}.
 * @beta
 */
export class PipelineSource {
  /**
   * @internal
   * @private
   * @param _db
   * @param _userDataReader
   * @param _userDataWriter
   * @param _documentReferenceFactory
   */
  constructor(
    /**
     * @internal
     * @private
     */
    public _db: Firestore,
    /**
     * @internal
     * @private
     */
    public _userDataReader: UserDataReader,
    /**
     * @internal
     * @private
     */
    public _userDataWriter: AbstractUserDataWriter,
    /**
     * @internal
     * @private
     */
    public _documentReferenceFactory: (id: DocumentKey) => DocumentReference
  ) {}

  collection(collectionPath: string): Pipeline {
    return new Pipeline(
      this._db,
      this._userDataReader,
      this._userDataWriter,
      this._documentReferenceFactory,
      [new CollectionSource(collectionPath)]
    );
  }

  collectionGroup(collectionId: string): Pipeline {
    return new Pipeline(
      this._db,
      this._userDataReader,
      this._userDataWriter,
      this._documentReferenceFactory,
      [new CollectionGroupSource(collectionId)]
    );
  }

  database(): Pipeline {
    return new Pipeline(
      this._db,
      this._userDataReader,
      this._userDataWriter,
      this._documentReferenceFactory,
      [new DatabaseSource()]
    );
  }

  documents(docs: DocumentReference[]): Pipeline {
    return new Pipeline(
      this._db,
      this._userDataReader,
      this._userDataWriter,
      this._documentReferenceFactory,
      [DocumentsSource.of(docs)]
    );
  }
}
