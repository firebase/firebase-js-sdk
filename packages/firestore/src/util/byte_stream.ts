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
 * For the byte streams where we have control (like backed by a UInt8Array),
 * how many bytes to read each time when `ReadableStreamReader.read()` is
 * called.
 */
export const DEFAULT_BYTES_PER_READ = 10240;

/**
 * Builds a `ByteStreamReader` from a UInt8Array.
 * @param source The data source to use.
 * @param bytesPerRead How many bytes each `read()` from the returned reader
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
  const reader: ReadableStreamReader<Uint8Array> = {
    async read(): Promise<ReadableStreamReadResult<Uint8Array>> {
      if (readFrom < source.byteLength) {
        const result = {
          value: source.slice(readFrom, readFrom + bytesPerRead),
          done: false
        };
        readFrom += bytesPerRead;
        return result;
      }

      return { value: undefined, done: true };
    },
    async cancel(): Promise<void> {},
    releaseLock() {}
  };
  return reader;
}
