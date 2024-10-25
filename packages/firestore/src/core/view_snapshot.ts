/**
 * @license
 * Copyright 2017 Google LLC
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

import { DocumentKeySet } from '../model/collections';
import { Document } from '../model/document';
import { DocumentKey } from '../model/document_key';
import { DocumentSet } from '../model/document_set';
import { fail } from '../util/assert';
import { SortedMap } from '../util/sorted_map';

import { Query, queryEquals } from './query';

export const enum ChangeType {
  Added,
  Removed,
  Modified,
  Metadata
}

export interface DocumentViewChange {
  type: ChangeType;
  doc: Document;
}

export const enum SyncState {
  Local,
  Synced
}

/**
 * DocumentChangeSet keeps track of a set of changes to docs in a query, merging
 * duplicate events for the same doc.
 */
export class DocumentChangeSet {
  private changeMap = new SortedMap<DocumentKey, DocumentViewChange>(
    DocumentKey.comparator
  );

  track(change: DocumentViewChange): void {
    const key = change.doc.key;
    const oldChange = this.changeMap.get(key);
    if (!oldChange) {
      this.changeMap = this.changeMap.insert(key, change);
      return;
    }

    // Merge the new change with the existing change.
    if (
      change.type !== ChangeType.Added &&
      oldChange.type === ChangeType.Metadata
    ) {
      this.changeMap = this.changeMap.insert(key, change);
    } else if (
      change.type === ChangeType.Metadata &&
      oldChange.type !== ChangeType.Removed
    ) {
      this.changeMap = this.changeMap.insert(key, {
        type: oldChange.type,
        doc: change.doc
      });
    } else if (
      change.type === ChangeType.Modified &&
      oldChange.type === ChangeType.Modified
    ) {
      this.changeMap = this.changeMap.insert(key, {
        type: ChangeType.Modified,
        doc: change.doc
      });
    } else if (
      change.type === ChangeType.Modified &&
      oldChange.type === ChangeType.Added
    ) {
      this.changeMap = this.changeMap.insert(key, {
        type: ChangeType.Added,
        doc: change.doc
      });
    } else if (
      change.type === ChangeType.Removed &&
      oldChange.type === ChangeType.Added
    ) {
      this.changeMap = this.changeMap.remove(key);
    } else if (
      change.type === ChangeType.Removed &&
      oldChange.type === ChangeType.Modified
    ) {
      this.changeMap = this.changeMap.insert(key, {
        type: ChangeType.Removed,
        doc: oldChange.doc
      });
    } else if (
      change.type === ChangeType.Added &&
      oldChange.type === ChangeType.Removed
    ) {
      this.changeMap = this.changeMap.insert(key, {
        type: ChangeType.Modified,
        doc: change.doc
      });
    } else {
      // This includes these cases, which don't make sense:
      // Added->Added
      // Removed->Removed
      // Modified->Added
      // Removed->Modified
      // Metadata->Added
      // Removed->Metadata
      fail(
        'unsupported combination of changes: ' +
          JSON.stringify(change) +
          ' after ' +
          JSON.stringify(oldChange)
      );
    }
  }

  getChanges(): DocumentViewChange[] {
    const changes: DocumentViewChange[] = [];
    this.changeMap.inorderTraversal(
      (key: DocumentKey, change: DocumentViewChange) => {
        changes.push(change);
      }
    );
    return changes;
  }
}

export class ViewSnapshot {
  constructor(
    readonly query: Query,
    readonly docs: DocumentSet,
    readonly oldDocs: DocumentSet,
    readonly docChanges: DocumentViewChange[],
    readonly mutatedKeys: DocumentKeySet,
    readonly fromCache: boolean,
    readonly syncStateChanged: boolean,
    readonly excludesMetadataChanges: boolean,
    readonly hasCachedResults: boolean
  ) {}

  /** Returns a view snapshot as if all documents in the snapshot were added. */
  static fromInitialDocuments(
    query: Query,
    documents: DocumentSet,
    mutatedKeys: DocumentKeySet,
    fromCache: boolean,
    hasCachedResults: boolean
  ): ViewSnapshot {
    const changes: DocumentViewChange[] = [];
    documents.forEach(doc => {
      changes.push({ type: ChangeType.Added, doc });
    });

    return new ViewSnapshot(
      query,
      documents,
      DocumentSet.emptySet(documents),
      changes,
      mutatedKeys,
      fromCache,
      /* syncStateChanged= */ true,
      /* excludesMetadataChanges= */ false,
      hasCachedResults
    );
  }

  get hasPendingWrites(): boolean {
    return !this.mutatedKeys.isEmpty();
  }

  isEqual(other: ViewSnapshot): boolean {
    if (
      this.fromCache !== other.fromCache ||
      this.hasCachedResults !== other.hasCachedResults ||
      this.syncStateChanged !== other.syncStateChanged ||
      !this.mutatedKeys.isEqual(other.mutatedKeys) ||
      !queryEquals(this.query, other.query) ||
      !this.docs.isEqual(other.docs) ||
      !this.oldDocs.isEqual(other.oldDocs)
    ) {
      return false;
    }
    const changes: DocumentViewChange[] = this.docChanges;
    const otherChanges: DocumentViewChange[] = other.docChanges;
    if (changes.length !== otherChanges.length) {
      return false;
    }
    for (let i = 0; i < changes.length; i++) {
      if (
        changes[i].type !== otherChanges[i].type ||
        !changes[i].doc.isEqual(otherChanges[i].doc)
      ) {
        return false;
      }
    }
    return true;
  }
}
