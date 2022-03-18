/**
 * @license
 * Copyright 2022 Google LLC
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

import { Document as ProtoDocument } from '../protos/firestore_proto_api';

import { DbNoDocument, DbUnknownDocument } from './indexeddb_schema';
import { DbTimestampKey } from './indexeddb_sentinels';

// This file contains older schema definitions for object stores that were
// migrated to newer schema versions. These object stores should only be used
// during schema migrations.

export interface DbRemoteDocument {
  unknownDocument?: DbUnknownDocument;
  noDocument?: DbNoDocument;
  document?: ProtoDocument;
  hasCommittedMutations?: boolean;
  readTime?: DbTimestampKey;
  parentPath?: string[];
}

export type DbRemoteDocumentKey = string[];
export const DbRemoteDocumentStore = 'remoteDocuments';
