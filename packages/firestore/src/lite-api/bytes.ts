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

import { ByteString } from '../util/byte_string';
import { Code, FirestoreError } from '../util/error';
// API extractor fails importing property unless we also explicitly import Property and JsonTypeDesc.
// eslint-disable-next-line @typescript-eslint/no-unused-vars, unused-imports/no-unused-imports-ts
import { property, validateJSON } from '../util/json_validation';

/**
 * An immutable object representing an array of bytes.
 */
export class Bytes {
  _byteString: ByteString;

  /** @hideconstructor */
  constructor(byteString: ByteString, readonly subtype = 0) {
    if (!Number.isInteger(subtype) || subtype < 0 || subtype > 255) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'The subtype for Bytes must be a value in the inclusive [0, 255] range.'
      );
    }
    this._byteString = byteString;
  }

  /**
   * Creates a new `Bytes` object from the given Base64 string, converting it to
   * bytes.
   *
   * @param base64 - The Base64 string used to create the `Bytes` object.
   * @param subtype - Optional subtype value.
   */
  static fromBase64String(base64: string, subtype = 0): Bytes {
    try {
      return new Bytes(ByteString.fromBase64String(base64), subtype);
    } catch (e) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'Failed to construct data from Base64 string: ' + e
      );
    }
  }

  /**
   * Creates a new `Bytes` object from the given Uint8Array.
   *
   * @param array - The Uint8Array used to create the `Bytes` object.
   * @param subtype - Optional subtype value.
   */
  static fromUint8Array(array: Uint8Array, subtype = 0): Bytes {
    return new Bytes(ByteString.fromUint8Array(array), subtype);
  }

  /**
   * Returns the underlying bytes as a Base64-encoded string.
   *
   * @returns The Base64-encoded string created from the `Bytes` object.
   */
  toBase64(): string {
    return this._byteString.toBase64();
  }

  /**
   * Returns the underlying bytes in a new `Uint8Array`.
   *
   * @returns The Uint8Array created from the `Bytes` object.
   */
  toUint8Array(): Uint8Array {
    return this._byteString.toUint8Array();
  }

  /**
   * Returns the underlying bytes as a `Uint8Array`.
   *
   * @returns The Uint8Array created from the `Bytes` object.
   */
  get data(): Uint8Array {
    return this.toUint8Array();
  }

  /**
   * Returns a string representation of the `Bytes` object.
   *
   * @returns A string representation of the `Bytes` object.
   */
  toString(): string {
    return (
      'Bytes(base64: ' + this.toBase64() + ', subtype: ' + this.subtype + ')'
    );
  }

  /**
   * Returns true if this `Bytes` object is equal to the provided one.
   *
   * @param other - The `Bytes` object to compare against.
   * @returns true if this `Bytes` object is equal to the provided one.
   */
  isEqual(other: Bytes): boolean {
    return (
      this.subtype === other.subtype &&
      this._byteString.isEqual(other._byteString)
    );
  }

  static _jsonSchemaVersion: string = 'firestore/bytes/1.0';
  static _jsonSchema = {
    type: property('string', Bytes._jsonSchemaVersion),
    bytes: property('string'),
    subtype: { ...property('number'), optional: true }
  };

  /**
   * Returns a JSON-serializable representation of this `Bytes` instance.
   *
   * @returns a JSON representation of this object.
   */
  toJSON(): object {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json: any = {
      type: Bytes._jsonSchemaVersion,
      bytes: this.toBase64()
    };
    // If the subtype is 0 we must omit it from the object, because the
    // backend rejects bytes objects with subtype 0.
    if (this.subtype !== 0) {
      json.subtype = this.subtype;
    }
    return json;
  }

  /**
   * Builds a `Bytes` instance from a JSON object created by {@link Bytes.toJSON}.
   *
   * @param json - a JSON object represention of a `Bytes` instance
   * @returns an instance of {@link Bytes} if the JSON object could be parsed. Throws a
   * {@link FirestoreError} if an error occurs.
   */
  static fromJSON(json: object): Bytes {
    if (validateJSON(json, Bytes._jsonSchema)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const subtype = (json as any).subtype ?? 0;
      return Bytes.fromBase64String(json.bytes, subtype);
    }
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      'Unexpected error creating Bytes from JSON.'
    );
  }
}
