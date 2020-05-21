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

import * as api from '../protos/firestore_proto_api';
import {
  BundledDocumentMetadata,
  BundledQuery,
  BundleElement,
  BundleMetadata
} from '../protos/firestore_bundle_proto';

/**
 * A complete element in the bundle stream, together with the byte length it
 * occupies in the stream.
 */
export class SizedBundleElement {
  constructor(
    public payload: BundledQuery | api.Document | BundledDocumentMetadata,
    public byteLength: number
  ) {}
}

/**
 * Create a `ReadableStream` from a underlying buffer.
 *
 * @param data: Underlying buffer.
 * @param bytesPerRead: How many bytes to read from the underlying buffer from each read through the stream.
 */
export function toReadableStream(
  data: Uint8Array | ArrayBuffer,
  bytesPerRead = 10240
): ReadableStream<Uint8Array | ArrayBuffer> {
  let readFrom = 0;
  return new ReadableStream({
    start(controller) {},
    async pull(controller): Promise<void> {
      controller.enqueue(data.slice(readFrom, readFrom + bytesPerRead));
      readFrom += bytesPerRead;
      if (readFrom >= data.byteLength) {
        controller.close();
      }
    }
  });
}

/**
 * A class representing a bundle.
 *
 * Takes a bundle stream or buffer, and presents abstractions to read bundled
 * elements out of the underlying content.
 */
export class Bundle {
  // Cached bundle metadata.
  private metadata?: BundleMetadata | null;
  // The reader instance of the given ReadableStream.
  private reader: ReadableStreamDefaultReader;
  // Internal buffer to hold bundle content, accumulating incomplete element content.
  private buffer: Uint8Array = new Uint8Array();
  private textDecoder = new TextDecoder('utf-8');

  constructor(
    private bundleStream:
      | ReadableStream<Uint8Array | ArrayBuffer>
      | Uint8Array
      | ArrayBuffer
  ) {
    if (
      bundleStream instanceof Uint8Array ||
      bundleStream instanceof ArrayBuffer
    ) {
      this.bundleStream = toReadableStream(bundleStream);
    }
    this.reader = (this.bundleStream as ReadableStream).getReader();
  }

  /**
   * Returns the metadata of the bundle.
   */
  async getMetadata(): Promise<BundleMetadata> {
    if (!this.metadata) {
      const result = await this.nextElement();
      if (result === null || result instanceof SizedBundleElement) {
        throw new Error(`The first element is not metadata, it is ${result}`);
      }
      this.metadata = (result as BundleElement).metadata;
    }

    return this.metadata!;
  }

  /**
   * Asynchronously iterate through all bundle elements (except bundle metadata).
   */
  async *elements(): AsyncIterableIterator<SizedBundleElement> {
    let element = await this.nextElement();
    while (element !== null) {
      if (element instanceof SizedBundleElement) {
        yield element;
      } else {
        this.metadata = element.metadata;
      }
      element = await this.nextElement();
    }
  }

  // Reads from the head of internal buffer, and pulling more data from underlying stream if a complete element
  // cannot be found, until an element(including the prefixed length and the JSON string) is found.
  //
  // Once a complete element is read, it is dropped from internal buffer.
  //
  // Returns either the bundled element, or null if we have reached the end of the stream.
  private async nextElement(): Promise<
    BundleElement | SizedBundleElement | null
  > {
    const lengthBuffer = await this.readLength();
    if (lengthBuffer === null) {
      return null;
    }

    const lengthString = this.textDecoder.decode(lengthBuffer);
    const length = parseInt(lengthString, 10);
    if (isNaN(length)) {
      throw new Error(`length string (${lengthString}) is not valid number`);
    }

    const jsonString = await this.readJsonString(lengthBuffer.length, length);
    // Update the internal buffer to drop the read length and json string.
    this.buffer = this.buffer.slice(lengthBuffer.length + length);

    if (!this.metadata) {
      const element = JSON.parse(jsonString) as BundleElement;
      return element;
    } else {
      return new SizedBundleElement(
        JSON.parse(jsonString),
        lengthBuffer.length + length
      );
    }
  }

  // First index of '{' from the underlying buffer.
  private indexOfOpenBracket(): number {
    return this.buffer.findIndex(v => v === 123);
  }

  // Reads from the beginning of the inernal buffer, until the first '{', and return
  // the content.
  // If reached end of the stream, returns a null.
  private async readLength(): Promise<Uint8Array | null> {
    let position = this.indexOfOpenBracket();
    while (position < 0) {
      const done = await this.pullMoreDataToBuffer();
      if (done) {
        if (this.buffer.length === 0) {
          return null;
        }
        position = this.indexOfOpenBracket();
        // Underlying stream is closed, and we still cannot find a '{'.
        if (position < 0) {
          throw new Error(
            'Reach to the end of bundle when a length string is expected.'
          );
        }
      } else {
        position = this.indexOfOpenBracket();
      }
    }

    return this.buffer.slice(0, position);
  }

  // Reads from a specified position from the internal buffer, for a specified
  // number of bytes, pulling more data from the underlying stream if needed.
  //
  // Returns a string decoded from the read bytes.
  private async readJsonString(start: number, length: number): Promise<string> {
    while (this.buffer.length < start + length) {
      const done = await this.pullMoreDataToBuffer();
      if (done) {
        throw new Error('Reach to the end of bundle when more is expected.');
      }
    }

    return this.textDecoder.decode(this.buffer.slice(start, start + length));
  }

  // Pulls more data from underlying stream to internal buffer.
  // Returns a boolean indicating whether the stream is finished.
  private async pullMoreDataToBuffer(): Promise<boolean> {
    const result = await this.reader.read();
    if (!result.done) {
      const newBuffer = new Uint8Array(
        this.buffer.length + result.value.length
      );
      newBuffer.set(this.buffer);
      newBuffer.set(result.value, this.buffer.length);
      this.buffer = newBuffer;
    }
    return result.done;
  }
}
