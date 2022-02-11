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
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { IndexKind } from '../model/field_index';
import { ByteString } from '../util/byte_string';

import { DirectionalIndexByteEncoder } from './directional_index_byte_encoder';
import { OrderedCodeWriter } from './ordered_code_writer';

class AscendingIndexByteEncoder implements DirectionalIndexByteEncoder {
  constructor(private orderedCode: OrderedCodeWriter) {}
  writeBytes(value: ByteString): void {
    this.orderedCode.writeBytesAscending(value);
  }

  writeString(value: string): void {
    this.orderedCode.writeUtf8Ascending(value);
  }

  writeNumber(value: number): void {
    this.orderedCode.writeNumberAscending(value);
  }

  writeInfinity(): void {
    this.orderedCode.writeInfinityAscending();
  }
}

class DescendingIndexByteEncoder implements DirectionalIndexByteEncoder {
  constructor(private orderedCode: OrderedCodeWriter) {}
  writeBytes(value: ByteString): void {
    this.orderedCode.writeBytesDescending(value);
  }

  writeString(value: string): void {
    this.orderedCode.writeUtf8Descending(value);
  }

  writeNumber(value: number): void {
    this.orderedCode.writeNumberDescending(value);
  }

  writeInfinity(): void {
    this.orderedCode.writeInfinityDescending();
  }
}
/**
 * Implements `DirectionalIndexByteEncoder` using `OrderedCodeWriter` for the
 * actual encoding.
 */
export class IndexByteEncoder {
  private orderedCode = new OrderedCodeWriter();
  private ascending = new AscendingIndexByteEncoder(this.orderedCode);
  private descending = new DescendingIndexByteEncoder(this.orderedCode);

  seed(encodedBytes: Uint8Array): void {
    this.orderedCode.seed(encodedBytes);
  }

  forKind(kind: IndexKind): DirectionalIndexByteEncoder {
    return kind === IndexKind.ASCENDING ? this.ascending : this.descending;
  }

  encodedBytes(): Uint8Array {
    return this.orderedCode.encodedBytes();
  }

  reset(): void {
    this.orderedCode.reset();
  }
}
