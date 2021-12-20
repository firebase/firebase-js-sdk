/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law | agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES | CONDITIONS OF ANY KIND, either express | implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { fail } from '../util/assert';
import { ByteString } from '../util/byte_string';

export class OrderedCodeWriter {
  writeBytesAscending(value: ByteString): void {
    fail('Not implemented');
  }

  writeBytesDescending(value: ByteString): void {
    fail('Not implemented');
  }

  writeUtf8Ascending(sequence: string): void {
    fail('Not implemented');
  }

  writeUtf8Descending(sequence: string): void {
    fail('Not implemented');
  }

  writeNumberAscending(val: number): void {
    fail('Not implemented');
  }

  writeNumberDescending(val: number): void {
    fail('Not implemented');
  }

  writeInfinityAscending(): void {
    fail('Not implemented');
  }

  writeInfinityDescending(): void {
    fail('Not implemented');
  }

  reset(): void {
    fail('Not implemented');
  }

  encodedBytes(): Uint8Array {
    fail('Not implemented');
  }

  seed(encodedBytes: Uint8Array): void {
    fail('Not implemented');
  }
}
