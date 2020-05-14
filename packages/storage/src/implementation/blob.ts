/**
 * @license
 * Copyright 2017 Google LLC
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

/**
 * @file Provides a Blob-like wrapper for various binary types (including the
 * native Blob type). This makes it possible to upload types like ArrayBuffers,
 * making uploads possible in environments without the native Blob type.
 */
import * as fs from './fs';
import { StringFormat, dataFromString } from './string';
import * as type from './type';

/**
 * @param opt_elideCopy If true, doesn't copy mutable input data
 *     (e.g. Uint8Arrays). Pass true only if you know the objects will not be
 *     modified after this blob's construction.
 */
export class FbsBlob {
  private data_!: Blob | Uint8Array;
  private size_: number;
  private type_: string;

  constructor(data: Blob | Uint8Array | ArrayBuffer, elideCopy?: boolean) {
    let size: number = 0;
    let blobType: string = '';
    if (type.isNativeBlob(data)) {
      this.data_ = data as Blob;
      size = (data as Blob).size;
      blobType = (data as Blob).type;
    } else if (data instanceof ArrayBuffer) {
      if (elideCopy) {
        this.data_ = new Uint8Array(data);
      } else {
        this.data_ = new Uint8Array(data.byteLength);
        this.data_.set(new Uint8Array(data));
      }
      size = this.data_.length;
    } else if (data instanceof Uint8Array) {
      if (elideCopy) {
        this.data_ = data as Uint8Array;
      } else {
        this.data_ = new Uint8Array(data.length);
        this.data_.set(data as Uint8Array);
      }
      size = data.length;
    }
    this.size_ = size;
    this.type_ = blobType;
  }

  size(): number {
    return this.size_;
  }

  type(): string {
    return this.type_;
  }

  slice(startByte: number, endByte: number): FbsBlob | null {
    if (type.isNativeBlob(this.data_)) {
      const realBlob = this.data_ as Blob;
      const sliced = fs.sliceBlob(realBlob, startByte, endByte);
      if (sliced === null) {
        return null;
      }
      return new FbsBlob(sliced);
    } else {
      const slice = new Uint8Array(
        (this.data_ as Uint8Array).buffer,
        startByte,
        endByte - startByte
      );
      return new FbsBlob(slice, true);
    }
  }

  static getBlob(...args: Array<string | FbsBlob>): FbsBlob | null {
    if (type.isNativeBlobDefined()) {
      const blobby: Array<Blob | Uint8Array | string> = args.map(
        (val: string | FbsBlob): Blob | Uint8Array | string => {
          if (val instanceof FbsBlob) {
            return val.data_;
          } else {
            return val;
          }
        }
      );
      return new FbsBlob(fs.getBlob.apply(null, blobby));
    } else {
      const uint8Arrays: Uint8Array[] = args.map(
        (val: string | FbsBlob): Uint8Array => {
          if (type.isString(val)) {
            return dataFromString(StringFormat.RAW, val as string).data;
          } else {
            // Blobs don't exist, so this has to be a Uint8Array.
            return (val as FbsBlob).data_ as Uint8Array;
          }
        }
      );
      let finalLength = 0;
      uint8Arrays.forEach((array: Uint8Array): void => {
        finalLength += array.byteLength;
      });
      const merged = new Uint8Array(finalLength);
      let index = 0;
      uint8Arrays.forEach((array: Uint8Array) => {
        for (let i = 0; i < array.length; i++) {
          merged[index++] = array[i];
        }
      });
      return new FbsBlob(merged, true);
    }
  }

  uploadData(): Blob | Uint8Array {
    return this.data_;
  }
}
