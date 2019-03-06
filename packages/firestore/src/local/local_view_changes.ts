/**
 * @license
 * Copyright 2017 Google Inc.
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

import { TargetId } from '../core/types';
import { ChangeType, ViewSnapshot } from '../core/view_snapshot';
import { documentKeySet, DocumentKeySet } from '../model/collections';

/**
 * A set of changes to what documents are currently in view and out of view for
 * a given query. These changes are sent to the LocalStore by the View (via
 * the SyncEngine) and are used to pin / unpin documents as appropriate.
 */
export class LocalViewChanges {
  constructor(
    readonly targetId: TargetId,
    readonly addedKeys: DocumentKeySet,
    readonly removedKeys: DocumentKeySet
  ) {}

  static fromSnapshot(
    targetId: TargetId,
    viewSnapshot: ViewSnapshot
  ): LocalViewChanges {
    let addedKeys = documentKeySet();
    let removedKeys = documentKeySet();

    for (const docChange of viewSnapshot.docChanges) {
      switch (docChange.type) {
        case ChangeType.Added:
          addedKeys = addedKeys.add(docChange.doc.key);
          break;
        case ChangeType.Removed:
          removedKeys = removedKeys.add(docChange.doc.key);
          break;
        default:
        // do nothing
      }
    }

    return new LocalViewChanges(targetId, addedKeys, removedKeys);
  }
}
