/**
 * @license
 * Copyright 2025 Google LLC
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

import { newTextDecoder, newTextEncoder } from '../platform/text_serializer';
import { BundleMetadata } from '../protos/firestore_bundle_proto';
import { JsonProtoSerializer } from '../remote/serializer';
import { Code, FirestoreError } from '../util/error';

import { BundleReaderSync, SizedBundleElement } from './bundle_reader';

/** The UTF-8 code unit for '{'. */
const OPEN_BRACE = 0x7b;

/**
 * A class that can parse a bundle from the string serialization of a bundle.
 *
 * Bundle element length prefixes are specified as UTF-8 byte counts, so the
 * bundle string is UTF-8 encoded and parsed as bytes rather than as UTF-16
 * code units (which would differ for any non-ASCII character).
 */
export class BundleReaderSyncImpl implements BundleReaderSync {
  private metadata: BundleMetadata;
  private elements: SizedBundleElement[];
  private cursor: number;
  private readonly bundleData: Uint8Array;
  private readonly textDecoder = newTextDecoder();
  constructor(
    bundleData: string,
    readonly serializer: JsonProtoSerializer
  ) {
    this.bundleData = newTextEncoder().encode(bundleData);
    this.cursor = 0;
    this.elements = [];

    let element = this.nextElement();
    if (element && element.isBundleMetadata()) {
      this.metadata = element.payload.metadata!;
    } else {
      throw new FirestoreError(
        Code.INTERNAL,
        `The first element of the bundle is not a metadata object, it is
         ${JSON.stringify(element?.payload)}`
      );
    }

    do {
      element = this.nextElement();
      if (element !== null) {
        this.elements.push(element);
      }
    } while (element !== null);
  }

  /* Returns the parsed metadata of the bundle. */
  getMetadata(): BundleMetadata {
    return this.metadata;
  }

  /* Returns the DocumentSnapshot or NamedQuery elements of the bundle. */
  getElements(): SizedBundleElement[] {
    return this.elements;
  }

  /**
   * Parses the next element of the bundle.
   *
   * @returns a SizedBundleElement representation of the next element in the bundle, or null if
   * no more elements exist.
   */
  private nextElement(): SizedBundleElement | null {
    if (this.cursor === this.bundleData.length) {
      return null;
    }
    const prefixStart = this.cursor;
    const length: number = this.readLength();
    const prefixLength = this.cursor - prefixStart;
    const jsonString = this.readJsonString(length);
    return new SizedBundleElement(
      JSON.parse(jsonString),
      prefixLength + length
    );
  }

  /**
   * Reads from a specified position from the UTF-8 encoded bundleData, for a
   * specified number of bytes.
   *
   * @param length - how many bytes to read.
   * @returns a string parsed from the bundle.
   */
  private readJsonString(length: number): string {
    if (this.cursor + length > this.bundleData.length) {
      throw new FirestoreError(
        Code.INTERNAL,
        'Reached the end of bundle when more is expected.'
      );
    }
    return this.textDecoder.decode(
      this.bundleData.subarray(this.cursor, (this.cursor += length))
    );
  }

  /**
   * Reads from the current cursor until the first '{', and advances the cursor
   * to it.
   *
   * @returns The parsed length of the next element, in bytes.
   * @throws A {@link FirestoreError} if the cursor has reached the end of the
   * bundle data, since lengths prefix bundle objects, or if the length prefix
   * is not a valid number.
   */
  private readLength(): number {
    const startIndex = this.cursor;
    let curIndex = this.cursor;
    while (curIndex < this.bundleData.length) {
      if (this.bundleData[curIndex] === OPEN_BRACE) {
        if (curIndex === startIndex) {
          throw new FirestoreError(
            Code.INTERNAL,
            'First character is a bracket and not a number'
          );
        }
        const lengthString = this.textDecoder.decode(
          this.bundleData.subarray(startIndex, curIndex)
        );
        const length = Number(lengthString);
        if (isNaN(length)) {
          throw new FirestoreError(
            Code.INTERNAL,
            `length string (${lengthString}) is not valid number`
          );
        }
        this.cursor = curIndex;
        return length;
      }
      curIndex++;
    }
    throw new FirestoreError(
      Code.INTERNAL,
      'Reached the end of bundle when more is expected.'
    );
  }
}

/**
 *  Creates an instance of BundleReader without exposing the BundleReaderSyncImpl class type.
 */
export function newBundleReaderSync(
  bundleData: string,
  serializer: JsonProtoSerializer
): BundleReaderSync {
  return new BundleReaderSyncImpl(bundleData, serializer);
}
