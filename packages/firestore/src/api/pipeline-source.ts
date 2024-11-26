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

import { PipelineSource as LitePipelineSoure } from '../lite-api/pipeline-source';
import {
  CollectionGroupSource,
  CollectionSource,
  DatabaseSource,
  DocumentsSource
} from '../lite-api/stage';
import { UserDataReader } from '../lite-api/user_data_reader';
import { AbstractUserDataWriter } from '../lite-api/user_data_writer';
import { DocumentKey } from '../model/document_key';
import { cast } from '../util/input_validation';

import { Firestore } from './database';
import { Pipeline } from './pipeline';
import { DocumentReference } from './reference';

/**
 * Represents the source of a Firestore {@link Pipeline}.
 * @beta
 */
export class PipelineSource extends LitePipelineSoure {
  /**
   * @internal
   * @private
   * @param _db
   * @param _userDataReader
   * @param _userDataWriter
   * @param _documentReferenceFactory
   */
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(
    _db: Firestore,
    _userDataReader: UserDataReader,
    _userDataWriter: AbstractUserDataWriter,
    _documentReferenceFactory: (id: DocumentKey) => DocumentReference
  ) {
    super(_db, _userDataReader, _userDataWriter, _documentReferenceFactory);
  }

  collection(collectionPath: string): Pipeline {
    const _db = cast<Firestore>(this._db, Firestore);
    return new Pipeline(
      _db,
      this._userDataReader,
      this._userDataWriter,
      this._documentReferenceFactory,
      [new CollectionSource(collectionPath)]
    );
  }

  collectionGroup(collectionId: string): Pipeline {
    const _db = cast<Firestore>(this._db, Firestore);
    return new Pipeline(
      _db,
      this._userDataReader,
      this._userDataWriter,
      this._documentReferenceFactory,
      [new CollectionGroupSource(collectionId)]
    );
  }

  database(): Pipeline {
    const _db = cast<Firestore>(this._db, Firestore);
    return new Pipeline(
      _db,
      this._userDataReader,
      this._userDataWriter,
      this._documentReferenceFactory,
      [new DatabaseSource()]
    );
  }

  documents(docs: DocumentReference[]): Pipeline {
    const _db = cast<Firestore>(this._db, Firestore);
    return new Pipeline(
      _db,
      this._userDataReader,
      this._userDataWriter,
      this._documentReferenceFactory,
      [DocumentsSource.of(docs)]
    );
  }
}
