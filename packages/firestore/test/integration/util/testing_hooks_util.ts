/**
 * @license
 * Copyright 2023 Google LLC
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

import { expect } from 'chai';

import {
  DocumentData,
  DocumentReference,
  Query,
  _PersistentCacheIndexManager as PersistentCacheIndexManager,
  _TestingHooks as TestingHooks,
  _TestingHooksExistenceFilterMismatchInfo as ExistenceFilterMismatchInfoInternal
} from './firebase_export';

/**
 * Captures all existence filter mismatches in the Watch 'Listen' stream that
 * occur during the execution of the given code block.
 * @param callback The callback to invoke; during the invocation of this
 * callback all existence filter mismatches will be captured.
 * @return the captured existence filter mismatches and the result of awaiting
 * the given callback.
 */
export async function captureExistenceFilterMismatches<T>(
  callback: () => Promise<T>
): Promise<[ExistenceFilterMismatchInfo[], T]> {
  const results: ExistenceFilterMismatchInfo[] = [];

  const unregister = TestingHooks.onExistenceFilterMismatch(info =>
    results.push(createExistenceFilterMismatchInfoFrom(info))
  );

  let callbackResult: T;
  try {
    callbackResult = await callback();
  } finally {
    unregister();
  }

  return [results, callbackResult];
}

/**
 * Information about an existence filter mismatch, captured during an invocation
 * of `captureExistenceFilterMismatches()`.
 *
 * See the documentation of `ExistenceFilterMismatchInfo` in
 * `testing_hooks_spi.ts` for the meaning of these values.
 */
export interface ExistenceFilterMismatchInfo {
  localCacheCount: number;
  existenceFilterCount: number;
  bloomFilter?: {
    applied: boolean;
    hashCount: number;
    bitmapLength: number;
    padding: number;
    mightContain(documentRef: DocumentReference): boolean;
  };
}

function createExistenceFilterMismatchInfoFrom(
  internalInfo: ExistenceFilterMismatchInfoInternal
): ExistenceFilterMismatchInfo {
  const info: ExistenceFilterMismatchInfo = {
    localCacheCount: internalInfo.localCacheCount,
    existenceFilterCount: internalInfo.existenceFilterCount
  };

  const internalBloomFilter = internalInfo.bloomFilter;
  if (internalBloomFilter) {
    info.bloomFilter = {
      applied: internalBloomFilter.applied,
      hashCount: internalBloomFilter.hashCount,
      bitmapLength: internalBloomFilter.bitmapLength,
      padding: internalBloomFilter.padding,
      mightContain: (documentRef: DocumentReference): boolean =>
        internalBloomFilter.mightContain?.(
          `projects/${internalInfo.projectId}` +
            `/databases/${internalInfo.databaseId}` +
            `/documents/${documentRef.path}`
        ) ?? false
    };
  }

  return info;
}

/**
 * Verifies than an invocation of `enablePersistentCacheIndexAutoCreation()` or
 * `disablePersistentCacheIndexAutoCreation()` made during the execution of the
 * given callback succeeds.
 *
 * @param callback The callback to invoke; this callback must invoke exactly one
 * of `enablePersistentCacheIndexAutoCreation()` or
 * `disablePersistentCacheIndexAutoCreation()` exactly once; this callback is
 * called synchronously by this function, and is called exactly once.
 *
 * @return a promise that is fulfilled when the asynchronous work started by
 * `enablePersistentCacheIndexAutoCreation()` or
 * `disablePersistentCacheIndexAutoCreation()` completes successfully, or is
 * rejected
 */
export function verifyPersistentCacheIndexAutoCreationToggleSucceedsDuring(
  callback: () => void
): Promise<void> {
  const promises: Array<Promise<void>> = [];

  const unregister = TestingHooks.onPersistentCacheIndexAutoCreationToggle(
    promise => promises.push(promise)
  );

  try {
    callback();
  } finally {
    unregister();
  }

  expect(
    promises,
    'exactly one invocation of enablePersistentCacheIndexAutoCreation() or ' +
      'disablePersistentCacheIndexAutoCreation() should be made by the callback'
  ).to.have.length(1);

  return promises[0];
}

/**
 * Determines the type of client-side index that will be used when executing the
 * given query against the local cache.
 */
export function getQueryIndexType<
  AppModelType,
  DbModelType extends DocumentData
>(
  query: Query<AppModelType, DbModelType>
): Promise<'full' | 'partial' | 'none'> {
  return TestingHooks.getQueryIndexType(query);
}

/**
 * Sets the persistent cache index auto-creation settings for the given
 * Firestore instance.
 *
 * @return a Promise that is fulfilled when the settings are successfully
 * applied, or rejected if applying the settings fails.
 */
export function setPersistentCacheIndexAutoCreationSettings(
  indexManager: PersistentCacheIndexManager,
  settings: {
    indexAutoCreationMinCollectionSize?: number;
    relativeIndexReadCostPerDocument?: number;
  }
): Promise<void> {
  return TestingHooks.setPersistentCacheIndexAutoCreationSettings(
    indexManager,
    settings
  );
}
