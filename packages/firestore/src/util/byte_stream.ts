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

import { debugAssert } from './assert';

/**
 * How many bytes to read each time when `ReadableStreamReader.read()` is
 * called. Only applicable for byte streams that we control (e.g. those backed
 * by an UInt8Array).
 */
export const DEFAULT_BYTES_PER_READ = 10240;

/**
 * Builds a `ByteStreamReader` from a UInt8Array.
 * @param source - The data source to use.
 * @param bytesPerRead - How many bytes each `read()` from the returned reader
 *        will read.
 */
export function toByteStreamReaderHelper(
  source: Uint8Array,
  bytesPerRead: number = DEFAULT_BYTES_PER_READ
): ReadableStreamReader<Uint8Array> {
  debugAssert(
    bytesPerRead > 0,
    `toByteStreamReader expects positive bytesPerRead, but got ${bytesPerRead}`
  );
  let readFrom = 0;
  // The TypeScript definition for ReadableStreamReader changed. We use
  // `any` here to allow this code to compile with different versions.
  // See https://github.com/microsoft/TypeScript/issues/42970
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reader: any = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async read(): Promise<any> {
      if (readFrom < source.byteLength) {
        const result = {
          value: source.slice(readFrom, readFrom + bytesPerRead),
          done: false
        } as const;
        readFrom += bytesPerRead;
        return result;
      }

      return { done: true };
    },
    async cancel(): Promise<void> {},
    releaseLock() {},
    closed: Promise.resolve()
  };
  return reader;
}
