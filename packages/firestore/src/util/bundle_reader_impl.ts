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

import { newTextDecoder } from '../platform/text_serializer';
import { BundleMetadata } from '../protos/firestore_bundle_proto';
import { JsonProtoSerializer } from '../remote/serializer';

import { debugAssert } from './assert';
import { BundleReader, SizedBundleElement } from './bundle_reader';
import { Deferred } from './promise';

/**
 * A class representing a bundle.
 *
 * Takes a bundle stream or buffer, and presents abstractions to read bundled
 * elements out of the underlying content.
 */
class BundleReaderImpl implements BundleReader {
  /** Cached bundle metadata. */
  private metadata: Deferred<BundleMetadata> = new Deferred<BundleMetadata>();
  /**
   * Internal buffer to hold bundle content, accumulating incomplete element
   * content.
   */
  private buffer: Uint8Array = new Uint8Array();
  /** The decoder used to parse binary data into strings. */
  private textDecoder: TextDecoder;

  constructor(
    /** The reader to read from underlying binary bundle data source. */
    private reader: ReadableStreamReader<Uint8Array>,
    readonly serializer: JsonProtoSerializer
  ) {
    this.textDecoder = newTextDecoder();
    // Read the metadata (which is the first element).
    this.nextElementImpl().then(
      element => {
        if (element && element.isBundleMetadata()) {
          this.metadata.resolve(element.payload.metadata!);
        } else {
          this.metadata.reject(
            new Error(`The first element of the bundle is not a metadata, it is
             ${JSON.stringify(element?.payload)}`)
          );
        }
      },
      error => this.metadata.reject(error)
    );
  }

  close(): Promise<void> {
    return this.reader.cancel();
  }

  async getMetadata(): Promise<BundleMetadata> {
    return this.metadata.promise;
  }

  async nextElement(): Promise<SizedBundleElement | null> {
    // Makes sure metadata is read before proceeding.
    await this.getMetadata();
    return this.nextElementImpl();
  }

  /**
   * Reads from the head of internal buffer, and pulling more data from
   * underlying stream if a complete element cannot be found, until an
   * element(including the prefixed length and the JSON string) is found.
   *
   * Once a complete element is read, it is dropped from internal buffer.
   *
   * Returns either the bundled element, or null if we have reached the end of
   * the stream.
   */
  private async nextElementImpl(): Promise<SizedBundleElement | null> {
    const lengthBuffer = await this.readLength();
    if (lengthBuffer === null) {
      return null;
    }

    const lengthString = this.textDecoder.decode(lengthBuffer);
    const length = Number(lengthString);
    if (isNaN(length)) {
      this.raiseError(`length string (${lengthString}) is not valid number`);
    }

    const jsonString = await this.readJsonString(length);

    return new SizedBundleElement(
      JSON.parse(jsonString),
      lengthBuffer.length + length
    );
  }

  /** First index of '{' from the underlying buffer. */
  private indexOfOpenBracket(): number {
    return this.buffer.findIndex(v => v === '{'.charCodeAt(0));
  }

  /**
   * Reads from the beginning of the internal buffer, until the first '{', and
   * return the content.
   *
   * If reached end of the stream, returns a null.
   */
  private async readLength(): Promise<Uint8Array | null> {
    while (this.indexOfOpenBracket() < 0) {
      const done = await this.pullMoreDataToBuffer();
      if (done) {
        break;
      }
    }

    // Broke out of the loop because underlying stream is closed, and there
    // happens to be no more data to process.
    if (this.buffer.length === 0) {
      return null;
    }

    const position = this.indexOfOpenBracket();
    // Broke out of the loop because underlying stream is closed, but still
    // cannot find an open bracket.
    if (position < 0) {
      this.raiseError(
        'Reached the end of bundle when a length string is expected.'
      );
    }

    const result = this.buffer.slice(0, position);
    // Update the internal buffer to drop the read length.
    this.buffer = this.buffer.slice(position);
    return result;
  }

  /**
   * Reads from a specified position from the internal buffer, for a specified
   * number of bytes, pulling more data from the underlying stream if needed.
   *
   * Returns a string decoded from the read bytes.
   */
  private async readJsonString(length: number): Promise<string> {
    while (this.buffer.length < length) {
      const done = await this.pullMoreDataToBuffer();
      if (done) {
        this.raiseError('Reached the end of bundle when more is expected.');
      }
    }

    const result = this.textDecoder.decode(this.buffer.slice(0, length));
    // Update the internal buffer to drop the read json string.
    this.buffer = this.buffer.slice(length);
    return result;
  }

  private raiseError(message: string): void {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.reader.cancel();
    throw new Error(`Invalid bundle format: ${message}`);
  }

  /**
   * Pulls more data from underlying stream to internal buffer.
   * Returns a boolean indicating whether the stream is finished.
   */
  private async pullMoreDataToBuffer(): Promise<boolean> {
    const result = await this.reader.read();
    if (!result.done) {
      debugAssert(!!result.value, 'Read undefined when "done" is false.');
      const newBuffer = new Uint8Array(
        this.buffer.length + result.value!.length
      );
      newBuffer.set(this.buffer);
      newBuffer.set(result.value!, this.buffer.length);
      this.buffer = newBuffer;
    }
    return result.done;
  }
}

export function newBundleReader(
  reader: ReadableStreamReader<Uint8Array>,
  serializer: JsonProtoSerializer
): BundleReader {
  return new BundleReaderImpl(reader, serializer);
}
