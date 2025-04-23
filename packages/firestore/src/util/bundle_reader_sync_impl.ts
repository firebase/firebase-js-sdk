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

import { BundleMetadata } from '../protos/firestore_bundle_proto';
import { JsonProtoSerializer } from '../remote/serializer';

import { BundleReaderSync, SizedBundleElement } from './bundle_reader';

/**
 * A class that can parse a bundle form the string serialization of a bundle.
 */
export class BundleReaderSyncImpl implements BundleReaderSync {
  private metadata: BundleMetadata;
  private elements: SizedBundleElement[];
  private cursor: number;
  constructor(
    private bundleData: string,
    readonly serializer: JsonProtoSerializer
  ) {
    this.cursor = 0;
    this.elements = [];

    let element = this.nextElement();
    if (element && element.isBundleMetadata()) {
      this.metadata = element as BundleMetadata;
    } else {
      throw new Error(`The first element of the bundle is not a metadata, it is
         ${JSON.stringify(element?.payload)}`);
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
    const length: number = this.readLength();
    const jsonString = this.readJsonString(length);
    return new SizedBundleElement(JSON.parse(jsonString), length);
  }

  /**
   * Reads from a specified position from the bundleData string, for a specified
   * number of bytes.
   *
   * @param length how many characters to read.
   * @returns a string parsed from the bundle.
   */
  private readJsonString(length: number): string {
    if (this.cursor + length > this.bundleData.length) {
      throw new Error('Reached the end of bundle when more is expected.');
    }
    const result = this.bundleData.slice(this.cursor, (this.cursor += length));
    return result;
  }

  /**
   * Reads from the current cursor until the first '{'.
   *
   * @returns  A string to integer represention of the parsed value.
   * @throws An {@link Error} if the cursor has reached the end of the stream, since lengths
   * prefix bundle objects.
   */
  private readLength(): number {
    const startIndex = this.cursor;
    let curIndex = this.cursor;
    while (curIndex < this.bundleData.length) {
      if (this.bundleData[curIndex] === '{') {
        if (curIndex === startIndex) {
          throw new Error('First character is a bracket and not a number');
        }
        this.cursor = curIndex;
        return Number(this.bundleData.slice(startIndex, curIndex));
      }
      curIndex++;
    }
    throw new Error('Reached the end of bundle when more is expected.');
  }
}

export function newBundleReaderSync(
  bundleData: string,
  serializer: JsonProtoSerializer
): BundleReaderSync {
  return new BundleReaderSyncImpl(bundleData, serializer);
}
