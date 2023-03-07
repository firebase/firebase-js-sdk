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

import { _TestingHooks as TestingHooks } from './firebase_export';

/**
 * Captures all existence filter mismatches in the Watch 'Listen' stream that
 * occur during the execution of the given code block.
 * @param callback The callback to invoke; during the invocation of this
 * callback all existence filter mismatches will be captured.
 * @return the captured existence filter mismatches.
 */
export async function captureExistenceFilterMismatches(
  callback: () => Promise<void>
): Promise<ExistenceFilterMismatchInfo[]> {
  const results: ExistenceFilterMismatchInfo[] = [];
  const callbackWrapper = (arg: unknown): void => {
    const existenceFilterMismatchInfo = existenceFilterMismatchInfoFromRaw(
      arg as RawExistenceFilterMismatchInfo
    );
    results.push(existenceFilterMismatchInfo);
  };

  const unregister =
    TestingHooks.getOrCreateInstance().onExistenceFilterMismatch(
      callbackWrapper
    );

  try {
    await callback();
  } finally {
    unregister();
  }

  return results;
}

/**
 * The shape of the object specified to
 * `TestingUtils.onExistenceFilterMismatch()` callbacks.
 */
interface RawExistenceFilterMismatchInfo {
  actualCount: number;
  bloomFilterApplied: boolean;
  change: {
    targetId: number;
    existenceFilter: {
      count: number;
      unchangedNames?: {
        bits?: {
          bitmap?: string | Uint8Array;
          padding?: number;
        };
        hashCount?: number;
      };
    };
  };
}

/**
 * Information about an existence filter mismatch, capturing during an
 * invocation of `captureExistenceFilterMismatches()`.
 */
export interface ExistenceFilterMismatchInfo {
  /** The number of documents that match the query in the local cache. */
  actualCount: number;
  /** The number of documents that matched the query on the server. */
  expectedCount: number;
  /** The bloom filter provided by the server, or null if not provided. */
  bloomFilter: ExistenceFilterBloomFilter | null;
}

/**
 * Information about a bloom filter in an existence filter.
 */
export interface ExistenceFilterBloomFilter {
  /** Whether the bloom filter was able to be used to avert a full requery. */
  applied: boolean;
  /** The number of hash functions used in the bloom filter. */
  hashCount: number;
  /** The number of bytes in the bloom filter. */
  bitmapLength: number;
  /** The number of bits of "padding" in the last byte of the bloom filter. */
  padding: number;
}

/**
 * Creates a `ExistenceFilterMismatchInfo` object from the raw object given
 * by `TestingUtils`.
 */
function existenceFilterMismatchInfoFromRaw(
  raw: RawExistenceFilterMismatchInfo
): ExistenceFilterMismatchInfo {
  return {
    actualCount: raw.actualCount,
    expectedCount: raw.change.existenceFilter.count,
    bloomFilter: bloomFilterFromRawExistenceFilterMismatchInfo(raw)
  };
}

/**
 * Creates an `ExistenceFilterBloomFilter` object from the raw object given
 * by `TestingUtils`, returning null if the given object does not defined a
 * bloom filter.
 */
function bloomFilterFromRawExistenceFilterMismatchInfo(
  raw: RawExistenceFilterMismatchInfo
): null | ExistenceFilterBloomFilter {
  const unchangedNames = raw.change.existenceFilter?.unchangedNames;
  if (!unchangedNames) {
    return null;
  }
  return {
    applied: raw.bloomFilterApplied,
    hashCount: unchangedNames.hashCount ?? 0,
    bitmapLength: unchangedNames.bits?.bitmap?.length ?? 0,
    padding: unchangedNames.bits?.padding ?? 0
  };
}
