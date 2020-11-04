/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  Reference,
  getChild,
  uploadBytesResumable,
  uploadString,
  list,
  listAll,
  getDownloadURL,
  getMetadata,
  updateMetadata,
  deleteObject
} from '../src/reference';
import * as types from '@firebase/storage-types';
import { Metadata } from '../src/metadata';
import { StringFormat } from '../src/implementation/string';
import { ListOptions } from '../src/list';
import { UploadTaskCompat } from './task';
import { ListResultCompat } from './list';
import { StorageServiceCompat } from './service';
import { invalidRootOperation } from '../src/implementation/error';

export class ReferenceCompat implements types.Reference {
  constructor(
    private readonly _delegate: Reference,
    public storage: StorageServiceCompat
  ) {}

  get name(): string {
    return this._delegate.name;
  }

  get bucket(): string {
    return this._delegate.bucket;
  }

  get fullPath(): string {
    return this._delegate.fullPath;
  }

  toString(): string {
    return this._delegate.toString();
  }

  /**
   * @returns A reference to the object obtained by
   * appending childPath, removing any duplicate, beginning, or trailing
   * slashes.
   */
  child(childPath: string): types.Reference {
    const reference = getChild(this._delegate, childPath);
    return new ReferenceCompat(reference, this.storage);
  }

  get root(): types.Reference {
    return new ReferenceCompat(this._delegate.root, this.storage);
  }

  /**
   * @returns A reference to the parent of the
   * current object, or null if the current object is the root.
   */
  get parent(): types.Reference | null {
    const reference = this._delegate.parent;
    if (reference == null) {
      return null;
    }
    return new ReferenceCompat(reference, this.storage);
  }

  /**
   * Uploads a blob to this object's location.
   * @param data - The blob to upload.
   * @returns An UploadTask that lets you control and
   * observe the upload.
   */
  put(
    data: Blob | Uint8Array | ArrayBuffer,
    metadata?: Metadata
  ): types.UploadTask {
    this._throwIfRoot('put');
    return new UploadTaskCompat(
      uploadBytesResumable(this._delegate, data, metadata),
      this
    );
  }

  /**
   * Uploads a string to this object's location.
   * @param value - The string to upload.
   * @param format - The format of the string to upload.
   * @returns An UploadTask that lets you control and
   * observe the upload.
   */
  putString(
    value: string,
    format: StringFormat = StringFormat.RAW,
    metadata?: Metadata
  ): types.UploadTask {
    this._throwIfRoot('putString');
    return new UploadTaskCompat(
      uploadString(this._delegate, value, format, metadata),
      this
    );
  }

  /**
   * List all items (files) and prefixes (folders) under this storage reference.
   *
   * This is a helper method for calling list() repeatedly until there are
   * no more results. The default pagination size is 1000.
   *
   * Note: The results may not be consistent if objects are changed while this
   * operation is running.
   *
   * Warning: listAll may potentially consume too many resources if there are
   * too many results.
   *
   * @returns A Promise that resolves with all the items and prefixes under
   *  the current storage reference. `prefixes` contains references to
   *  sub-directories and `items` contains references to objects in this
   *  folder. `nextPageToken` is never returned.
   */
  listAll(): Promise<types.ListResult> {
    return listAll(this._delegate).then(
      r => new ListResultCompat(r, this.storage)
    );
  }

  /**
   * List items (files) and prefixes (folders) under this storage reference.
   *
   * List API is only available for Firebase Rules Version 2.
   *
   * GCS is a key-blob store. Firebase Storage imposes the semantic of '/'
   * delimited folder structure. Refer to GCS's List API if you want to learn more.
   *
   * To adhere to Firebase Rules's Semantics, Firebase Storage does not
   * support objects whose paths end with "/" or contain two consecutive
   * "/"s. Firebase Storage List API will filter these unsupported objects.
   * list() may fail if there are too many unsupported objects in the bucket.
   *
   * @param options - See ListOptions for details.
   * @returns A Promise that resolves with the items and prefixes.
   * `prefixes` contains references to sub-folders and `items`
   * contains references to objects in this folder. `nextPageToken`
   * can be used to get the rest of the results.
   */
  list(options?: ListOptions | null): Promise<types.ListResult> {
    return list(this._delegate, options).then(
      r => new ListResultCompat(r, this.storage)
    );
  }

  /**
   * A promise that resolves with the metadata for this object. If this
   * object doesn't exist or metadata cannot be retreived, the promise is
   * rejected.
   */
  getMetadata(): Promise<Metadata> {
    return getMetadata(this._delegate);
  }

  /**
   * Updates the metadata for this object.
   * @param metadata - The new metadata for the object.
   * Only values that have been explicitly set will be changed. Explicitly
   * setting a value to null will remove the metadata.
   * @returns A promise that resolves
   * with the new metadata for this object.
   * @see firebaseStorage.Reference.prototype.getMetadata
   */
  updateMetadata(metadata: Metadata): Promise<Metadata> {
    return updateMetadata(this._delegate, metadata);
  }

  /**
   * @returns A promise that resolves with the download
   * URL for this object.
   */
  getDownloadURL(): Promise<string> {
    return getDownloadURL(this._delegate);
  }

  /**
   * Deletes the object at this location.
   * @returns A promise that resolves if the deletion succeeds.
   */
  delete(): Promise<void> {
    this._throwIfRoot('delete');
    return deleteObject(this._delegate);
  }

  private _throwIfRoot(name: string): void {
    if (this._delegate._location.path === '') {
      throw invalidRootOperation(name);
    }
  }
}
