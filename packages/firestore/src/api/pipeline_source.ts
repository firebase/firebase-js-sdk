// Copyright 2024 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { DocumentKey } from '../model/document_key';

import { Firestore } from './database';
import { Pipeline } from './pipeline';
import { DocumentReference } from './reference';
import {
  CollectionGroupSource,
  CollectionSource,
  DatabaseSource,
  DocumentsSource
} from '../lite-api/stage';
import {PipelineSource as LitePipelineSource} from '../lite-api/pipeline-source';
import { UserDataReader } from '../lite-api/user_data_reader';
import { AbstractUserDataWriter } from '../lite-api/user_data_writer';

/**
 * Represents the source of a Firestore {@link Pipeline}.
 * @beta
 */
export class PipelineSource extends LitePipelineSource{
  /**
   * @internal
   * @private
   * @param db
   * @param userDataReader
   * @param userDataWriter
   * @param documentReferenceFactory
   */
  constructor(
    db: Firestore,
    userDataReader: UserDataReader,
    userDataWriter: AbstractUserDataWriter,
    documentReferenceFactory: (id: DocumentKey) => DocumentReference
  ) {
    super(db, userDataReader, userDataWriter, documentReferenceFactory);
  }

  collection(collectionPath: string): Pipeline {
    return new Pipeline(
      this.db as Firestore,
      this.userDataReader,
      this.userDataWriter,
      this.documentReferenceFactory,
      [new CollectionSource(collectionPath)]
    );
  }

  collectionGroup(collectionId: string): Pipeline {
    return new Pipeline(
      this.db as Firestore,
      this.userDataReader,
      this.userDataWriter,
      this.documentReferenceFactory,
      [new CollectionGroupSource(collectionId)]
    );
  }

  database(): Pipeline {
    return new Pipeline(
      this.db as Firestore,
      this.userDataReader,
      this.userDataWriter,
      this.documentReferenceFactory,
      [new DatabaseSource()]
    );
  }

  documents(docs: DocumentReference[]): Pipeline {
    return new Pipeline(
      this.db as Firestore,
      this.userDataReader,
      this.userDataWriter,
      this.documentReferenceFactory,
      [DocumentsSource.of(docs)]
    );
  }
}
