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

import {
  BundleElement,
  BundleMetadata
} from '../protos/firestore_bundle_proto';
import { JsonProtoSerializer } from '../remote/serializer';

/**
 * A complete element in the bundle stream, together with the byte length it
 * occupies in the stream.
 */
export class SizedBundleElement {
  constructor(
    public readonly payload: BundleElement,
    // How many bytes this element takes to store in the bundle.
    public readonly byteLength: number
  ) {}

  isBundleMetadata(): boolean {
    return 'metadata' in this.payload;
  }
}

export type BundleSource =
  | ReadableStream<Uint8Array>
  | ArrayBuffer
  | Uint8Array;

/**
 * A class representing a bundle.
 *
 * Takes a bundle stream or buffer, and presents abstractions to read bundled
 * elements out of the underlying content.
 */
export interface BundleReader {
  serializer: JsonProtoSerializer;

  close(): Promise<void>;

  /**
   * Returns the metadata of the bundle.
   */
  getMetadata(): Promise<BundleMetadata>;

  /**
   * Returns the next BundleElement (together with its byte size in the bundle)
   * that has not been read from underlying ReadableStream. Returns null if we
   * have reached the end of the stream.
   */
  nextElement(): Promise<SizedBundleElement | null>;
}

/**
 * A class representing a synchronized bundle reader.
 *
 * Takes a bundle string buffer, parses the data, and provides accessors to the data contained
 * within it.
 */
export interface BundleReaderSync {
  serializer: JsonProtoSerializer;

  /**
   * Returns the metadata of the bundle.
   */
  getMetadata(): BundleMetadata;

  /**
   * Returns BundleElements parsed from the bundle. Returns an empty array if no bundle elements
   * exist.
   */
  getElements(): SizedBundleElement[];
}
