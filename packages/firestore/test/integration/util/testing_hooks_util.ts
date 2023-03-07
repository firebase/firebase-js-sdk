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
 * Captures all existence filter mismatches that occur during the execution of
 * the given code block.
 * @param callback The callback to invoke, during whose invocation the existence
 * filter mismatches will be captured.
 * @return the captured existence filter mismatches.
 */
export async function captureExistenceFilterMismatches(
  callback: () => Promise<void>
): Promise<ExistenceFilterMismatchInfo[]> {
  const results: ExistenceFilterMismatchInfo[] = [];
  const callbackWrapper = (arg: unknown) =>
    results.push(
      existenceFilterMismatchInfoFromRaw(arg as RawExistenceFilterMismatchInfo)
    );
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
 * The shape of the object specified to `onExistenceFilterMismatch` callbacks.
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
 * Information about an existence filter mismatch.
 */
export interface ExistenceFilterMismatchInfo {
  actualCount: number;
  expectedCount: number;
  bloomFilter?: ExistenceFilterBloomFilter;
}

/**
 * Information about a bloom filter in an existence filter.
 */
export interface ExistenceFilterBloomFilter {
  applied: boolean;
  hashCount: number;
  bitmapLength: number;
  padding: number;
}

function existenceFilterMismatchInfoFromRaw(
  raw: RawExistenceFilterMismatchInfo
): ExistenceFilterMismatchInfo {
  const result: ExistenceFilterMismatchInfo = {
    actualCount: raw.actualCount,
    expectedCount: raw.change.existenceFilter.count
  };
  const bloomFilter = bloomFilterFromRawExistenceFilterMismatchInfo(raw);
  if (bloomFilter) {
    result.bloomFilter = bloomFilter;
  }
  return result;
}

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
