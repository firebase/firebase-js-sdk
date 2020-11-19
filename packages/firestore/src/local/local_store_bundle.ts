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

import { newQueryForPath, queryToTarget } from '../core/query';
import { SnapshotVersion } from '../core/snapshot_version';
import { Target } from '../core/target';
import {
  DocumentKeySet,
  documentKeySet,
  documentVersionMap,
  maybeDocumentMap,
  MaybeDocumentMap
} from '../model/collections';
import { debugCast } from '../util/assert';

import * as bundleProto from '../protos/firestore_bundle_proto';
import { BundleConverter, BundledDocuments, NamedQuery } from '../core/bundle';
import { fromVersion } from '../remote/serializer';
import { fromBundledQuery } from './local_serializer';
import { ByteString } from '../util/byte_string';
import { ResourcePath } from '../model/path';
import {
  LocalStore,
  LocalStoreImpl,
  allocateTarget,
  populateDocumentChangeBuffer
} from './local_store';

/**
 * Applies the documents from a bundle to the "ground-state" (remote)
 * documents.
 *
 * LocalDocuments are re-calculated if there are remaining mutations in the
 * queue.
 */
export async function applyBundleDocuments(
  localStore: LocalStore,
  documents: BundledDocuments,
  bundleName: string
): Promise<MaybeDocumentMap> {
  const localStoreImpl = debugCast(localStore, LocalStoreImpl);
  const bundleConverter = new BundleConverter(localStoreImpl.serializer);
  let documentKeys = documentKeySet();
  let documentMap = maybeDocumentMap();
  let versionMap = documentVersionMap();
  for (const bundleDoc of documents) {
    const documentKey = bundleConverter.toDocumentKey(bundleDoc.metadata.name!);
    if (bundleDoc.document) {
      documentKeys = documentKeys.add(documentKey);
    }
    documentMap = documentMap.insert(
      documentKey,
      bundleConverter.toMaybeDocument(bundleDoc)
    );
    versionMap = versionMap.insert(
      documentKey,
      bundleConverter.toSnapshotVersion(bundleDoc.metadata.readTime!)
    );
  }

  const documentBuffer = localStoreImpl.remoteDocuments.newChangeBuffer({
    trackRemovals: true // Make sure document removals show up in `getNewDocumentChanges()`
  });

  // Allocates a target to hold all document keys from the bundle, such that
  // they will not get garbage collected right away.
  const umbrellaTargetData = await allocateTarget(
    localStoreImpl,
    umbrellaTarget(bundleName)
  );
  return localStoreImpl.persistence.runTransaction(
    'Apply bundle documents',
    'readwrite',
    txn => {
      return populateDocumentChangeBuffer(
        txn,
        documentBuffer,
        documentMap,
        SnapshotVersion.min(),
        versionMap
      )
        .next(changedDocs => {
          documentBuffer.apply(txn);
          return changedDocs;
        })
        .next(changedDocs => {
          return localStoreImpl.targetCache
            .removeMatchingKeysForTargetId(txn, umbrellaTargetData.targetId)
            .next(() =>
              localStoreImpl.targetCache.addMatchingKeys(
                txn,
                documentKeys,
                umbrellaTargetData.targetId
              )
            )
            .next(() =>
              localStoreImpl.localDocuments.getLocalViewOfDocuments(
                txn,
                changedDocs
              )
            );
        });
    }
  );
}

/**
 * Returns a promise of a boolean to indicate if the given bundle has already
 * been loaded and the create time is newer than the current loading bundle.
 */
export function hasNewerBundle(
  localStore: LocalStore,
  bundleMetadata: bundleProto.BundleMetadata
): Promise<boolean> {
  const localStoreImpl = debugCast(localStore, LocalStoreImpl);
  const bundleConverter = new BundleConverter(localStoreImpl.serializer);
  const currentReadTime = bundleConverter.toSnapshotVersion(
    bundleMetadata.createTime!
  );
  return localStoreImpl.persistence
    .runTransaction('hasNewerBundle', 'readonly', transaction => {
      return localStoreImpl.bundleCache.getBundleMetadata(
        transaction,
        bundleMetadata.id!
      );
    })
    .then(cached => {
      return !!cached && cached.createTime!.compareTo(currentReadTime) >= 0;
    });
}

/**
 * Saves the given `BundleMetadata` to local persistence.
 * @param bundleMetadata
 */
export function saveBundle(
  localStore: LocalStore,
  bundleMetadata: bundleProto.BundleMetadata
): Promise<void> {
  const localStoreImpl = debugCast(localStore, LocalStoreImpl);
  return localStoreImpl.persistence.runTransaction(
    'Save bundle',
    'readwrite',
    transaction => {
      return localStoreImpl.bundleCache.saveBundleMetadata(
        transaction,
        bundleMetadata
      );
    }
  );
}

/**
 * Returns a promise of a `NamedQuery` associated with given query name. Promise
 * resolves to undefined if no persisted data can be found.
 */
export function getNamedQuery(
  localStore: LocalStore,
  queryName: string
): Promise<NamedQuery | undefined> {
  const localStoreImpl = debugCast(localStore, LocalStoreImpl);
  return localStoreImpl.persistence.runTransaction(
    'Get named query',
    'readonly',
    transaction =>
      localStoreImpl.bundleCache.getNamedQuery(transaction, queryName)
  );
}

/**
 * Saves the given `NamedQuery` to local persistence.
 */
export async function saveNamedQuery(
  localStore: LocalStore,
  query: bundleProto.NamedQuery,
  documents: DocumentKeySet = documentKeySet()
): Promise<void> {
  // Allocate a target for the named query such that it can be resumed
  // from associated read time if users use it to listen.
  // NOTE: this also means if no corresponding target exists, the new target
  // will remain active and will not get collected, unless users happen to
  // unlisten the query somehow.
  const allocated = await allocateTarget(
    localStore,
    queryToTarget(fromBundledQuery(query.bundledQuery!))
  );

  const localStoreImpl = debugCast(localStore, LocalStoreImpl);
  return localStoreImpl.persistence.runTransaction(
    'Save named query',
    'readwrite',
    transaction => {
      const readTime = fromVersion(query.readTime!);
      // Simply save the query itself if it is older than what the SDK already
      // has.
      if (allocated.snapshotVersion.compareTo(readTime) >= 0) {
        return localStoreImpl.bundleCache.saveNamedQuery(transaction, query);
      }

      // Update existing target data because the query from the bundle is newer.
      const newTargetData = allocated.withResumeToken(
        ByteString.EMPTY_BYTE_STRING,
        readTime
      );
      localStoreImpl.targetDataByTarget = localStoreImpl.targetDataByTarget.insert(
        newTargetData.targetId,
        newTargetData
      );
      return localStoreImpl.targetCache
        .updateTargetData(transaction, newTargetData)
        .next(() =>
          localStoreImpl.targetCache.removeMatchingKeysForTargetId(
            transaction,
            allocated.targetId
          )
        )
        .next(() =>
          localStoreImpl.targetCache.addMatchingKeys(
            transaction,
            documents,
            allocated.targetId
          )
        )
        .next(() =>
          localStoreImpl.bundleCache.saveNamedQuery(transaction, query)
        );
    }
  );
}

/**
 * Creates a new target using the given bundle name, which will be used to
 * hold the keys of all documents from the bundle in query-document mappings.
 * This ensures that the loaded documents do not get garbage collected
 * right away.
 */
function umbrellaTarget(bundleName: string): Target {
  // It is OK that the path used for the query is not valid, because this will
  // not be read and queried.
  return queryToTarget(
    newQueryForPath(ResourcePath.fromString(`__bundle__/docs/${bundleName}`))
  );
}
