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

import { Pipeline } from './pipeline';
import {
  CollectionGroupSource,
  CollectionSource,
  DatabaseSource,
  DocumentsSource
} from './stage';

import { Firestore } from '../../api/database';
import { DocumentReference } from '../../lite-api/reference';

/**
 * Represents the source of a Firestore {@link Pipeline}.
 * @beta
 */
export class PipelineSource {
  constructor(private db: Firestore) {}

  collection(collectionPath: string): Pipeline {
    return new Pipeline(this.db, [new CollectionSource(collectionPath)]);
  }

  collectionGroup(collectionId: string): Pipeline {
    return new Pipeline(this.db, [new CollectionGroupSource(collectionId)]);
  }

  database(): Pipeline {
    return new Pipeline(this.db, [new DatabaseSource()]);
  }

  documents(docs: DocumentReference[]): Pipeline {
    return new Pipeline(this.db, [DocumentsSource.of(docs)]);
  }
}
