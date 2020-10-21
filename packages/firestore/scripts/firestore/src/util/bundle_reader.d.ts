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
import { BundleElement, BundleMetadata } from '../protos/firestore_bundle_proto';
import { JsonProtoSerializer } from '../remote/serializer';
/**
 * A complete element in the bundle stream, together with the byte length it
 * occupies in the stream.
 */
export declare class SizedBundleElement {
    readonly payload: BundleElement;
    readonly byteLength: number;
    constructor(payload: BundleElement, byteLength: number);
    isBundleMetadata(): boolean;
}
export declare type BundleSource = ReadableStream<Uint8Array> | ArrayBuffer | Uint8Array;
/**
 * A class representing a bundle.
 *
 * Takes a bundle stream or buffer, and presents abstractions to read bundled
 * elements out of the underlying content.
 */
export declare class BundleReader {
    /** The reader to read from underlying binary bundle data source. */
    private reader;
    readonly serializer: JsonProtoSerializer;
    /** Cached bundle metadata. */
    private metadata;
    /**
     * Internal buffer to hold bundle content, accumulating incomplete element
     * content.
     */
    private buffer;
    /** The decoder used to parse binary data into strings. */
    private textDecoder;
    static fromBundleSource(source: BundleSource, serializer: JsonProtoSerializer): BundleReader;
    constructor(
    /** The reader to read from underlying binary bundle data source. */
    reader: ReadableStreamReader<Uint8Array>, serializer: JsonProtoSerializer);
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
    private nextElementImpl;
    /** First index of '{' from the underlying buffer. */
    private indexOfOpenBracket;
    /**
     * Reads from the beginning of the internal buffer, until the first '{', and
     * return the content.
     *
     * If reached end of the stream, returns a null.
     */
    private readLength;
    /**
     * Reads from a specified position from the internal buffer, for a specified
     * number of bytes, pulling more data from the underlying stream if needed.
     *
     * Returns a string decoded from the read bytes.
     */
    private readJsonString;
    private raiseError;
    /**
     * Pulls more data from underlying stream to internal buffer.
     * Returns a boolean indicating whether the stream is finished.
     */
    private pullMoreDataToBuffer;
}
