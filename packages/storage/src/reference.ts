/**
 * @license
 * Copyright 2019 Google LLC
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
 * @fileoverview Defines the Firebase Storage Reference class.
 */

import { FbsBlob } from './implementation/blob';
import { Location } from './implementation/location';
import { getMappings } from './implementation/metadata';
import { child, parent, lastComponent } from './implementation/path';
import {
  list as requestsList,
  getMetadata as requestsGetMetadata,
  updateMetadata as requestsUpdateMetadata,
  getDownloadUrl as requestsGetDownloadUrl,
  deleteObject as requestsDeleteObject
} from './implementation/requests';
import { StringFormat, dataFromString } from './implementation/string';
import { Metadata } from './metadata';
import { StorageService } from './service';
import { ListOptions, ListResult } from './list';
import { UploadTask } from './task';
import { invalidRootOperation, noDownloadURL } from './implementation/error';
import { validateNumber } from './implementation/type';

/**
 * Provides methods to interact with a bucket in the Firebase Storage service.
 * @param location - An fbs.location, or the URL at
 *     which to base this object, in one of the following forms:
 *         gs://<bucket>/<object-path>
 *         http[s]://firebasestorage.googleapis.com/
 *                     <api-version>/b/<bucket>/o/<object-path>
 *     Any query or fragment strings will be ignored in the http[s]
 *     format. If no value is passed, the storage object will use a URL based on
 *     the project ID of the base firebase.App instance.
 */
export class Reference {
  /**
   * @internal
   */
  _location: Location;

  constructor(private _service: StorageService, location: string | Location) {
    if (location instanceof Location) {
      this._location = location;
    } else {
      this._location = Location.makeFromUrl(location);
    }
  }

  /**
   * @returns The URL for the bucket and path this object references,
   *     in the form gs://<bucket>/<object-path>
   * @override
   */
  toString(): string {
    return 'gs://' + this._location.bucket + '/' + this._location.path;
  }

  protected newRef(service: StorageService, location: Location): Reference {
    return new Reference(service, location);
  }

  /**
   * @returns An reference to the root of this
   *     object's bucket.
   */
  get root(): Reference {
    const location = new Location(this._location.bucket, '');
    return this.newRef(this._service, location);
  }

  get bucket(): string {
    return this._location.bucket;
  }

  get fullPath(): string {
    return this._location.path;
  }

  get name(): string {
    return lastComponent(this._location.path);
  }

  get storage(): StorageService {
    return this._service;
  }

  get parent(): Reference | null {
    const newPath = parent(this._location.path);
    if (newPath === null) {
      return null;
    }
    const location = new Location(this._location.bucket, newPath);
    return new Reference(this._service, location);
  }

  _throwIfRoot(name: string): void {
    if (this._location.path === '') {
      throw invalidRootOperation(name);
    }
  }
}

/**
 * Uploads a blob to this object's location.
 * @public
 * @param ref - Storage Reference where data should be uploaded.
 * @param data - The data to upload.
 * @param metadata - Metadata for the newly uploaded string.
 * @returns An UploadTask that lets you control and
 *     observe the upload.
 */
export function uploadBytesResumable(
  ref: Reference,
  data: Blob | Uint8Array | ArrayBuffer,
  metadata: Metadata | null = null
): UploadTask {
  ref._throwIfRoot('uploadBytesResumable');
  return new UploadTask(ref, new FbsBlob(data), metadata);
}

/**
 * Uploads a string to this object's location.
 * @public
 * @param ref - Storage Reference where string should be uploaded.
 * @param value - The string to upload.
 * @param format - The format of the string to upload.
 * @param metadata - Metadata for the newly uploaded object.
 * @returns An UploadTask that lets you control and
 *     observe the upload.
 */
export function uploadString(
  ref: Reference,
  value: string,
  format: StringFormat = StringFormat.RAW,
  metadata?: Metadata
): UploadTask {
  ref._throwIfRoot('putString');
  const data = dataFromString(format, value);
  const metadataClone = { ...metadata } as Metadata;
  if (metadataClone['contentType'] == null && data.contentType != null) {
    metadataClone['contentType'] = data.contentType!;
  }
  return new UploadTask(ref, new FbsBlob(data.data, true), metadataClone);
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
 * @public
 * @param ref - Storage Reference to get list from.
 *
 * @returns A Promise that resolves with all the items and prefixes under
 *      the current storage reference. `prefixes` contains references to
 *      sub-directories and `items` contains references to objects in this
 *      folder. `nextPageToken` is never returned.
 */
export function listAll(ref: Reference): Promise<ListResult> {
  const accumulator: ListResult = {
    prefixes: [],
    items: []
  };
  return listAllHelper(ref, accumulator).then(() => accumulator);
}

/**
 * Separated from listAll because async functions can't use "arguments".
 * @internal
 * @param ref
 * @param accumulator
 * @param pageToken
 */
async function listAllHelper(
  ref: Reference,
  accumulator: ListResult,
  pageToken?: string
): Promise<void> {
  const opt: ListOptions = {
    // maxResults is 1000 by default.
    pageToken
  };
  const nextPage = await list(ref, opt);
  accumulator.prefixes.push(...nextPage.prefixes);
  accumulator.items.push(...nextPage.items);
  if (nextPage.nextPageToken != null) {
    await listAllHelper(ref, accumulator, nextPage.nextPageToken);
  }
}

/**
 * List items (files) and prefixes (folders) under this storage reference.
 *
 * List API is only available for Firebase Rules Version 2.
 *
 * GCS is a key-blob store. Firebase Storage imposes the semantic of '/'
 * delimited folder structure.
 * Refer to GCS's List API if you want to learn more.
 *
 * To adhere to Firebase Rules's Semantics, Firebase Storage does not
 * support objects whose paths end with "/" or contain two consecutive
 * "/"s. Firebase Storage List API will filter these unsupported objects.
 * list() may fail if there are too many unsupported objects in the bucket.
 * @public
 *
 * @param ref - Storage Reference to get list from.
 * @param options - See ListOptions for details.
 * @returns A Promise that resolves with the items and prefixes.
 *      `prefixes` contains references to sub-folders and `items`
 *      contains references to objects in this folder. `nextPageToken`
 *      can be used to get the rest of the results.
 */
export async function list(
  ref: Reference,
  options?: ListOptions | null
): Promise<ListResult> {
  if (options != null) {
    if (typeof options.maxResults === 'number') {
      validateNumber(
        'options.maxResults',
        /* minValue= */ 1,
        /* maxValue= */ 1000,
        options.maxResults
      );
    }
  }
  const authToken = await ref.storage.getAuthToken();
  const op = options || {};
  const requestInfo = requestsList(
    ref.storage,
    ref._location,
    /*delimiter= */ '/',
    op.pageToken,
    op.maxResults
  );
  return ref.storage.makeRequest(requestInfo, authToken).getPromise();
}

/**
 * A promise that resolves with the metadata for this object. If this
 * object doesn't exist or metadata cannot be retreived, the promise is
 * rejected.
 * @public
 * @param ref - Storage Reference to get metadata from.
 */
export async function getMetadata(ref: Reference): Promise<Metadata> {
  ref._throwIfRoot('getMetadata');
  const authToken = await ref.storage.getAuthToken();
  const requestInfo = requestsGetMetadata(
    ref.storage,
    ref._location,
    getMappings()
  );
  return ref.storage.makeRequest(requestInfo, authToken).getPromise();
}

/**
 * Updates the metadata for this object.
 * @public
 * @param ref - Storage Reference to update metadata for.
 * @param metadata - The new metadata for the object.
 *     Only values that have been explicitly set will be changed. Explicitly
 *     setting a value to null will remove the metadata.
 * @returns A promise that resolves
 *     with the new metadata for this object.
 *     See `firebaseStorage.Reference.prototype.getMetadata`
 */
export async function updateMetadata(
  ref: Reference,
  metadata: Metadata
): Promise<Metadata> {
  ref._throwIfRoot('updateMetadata');
  const authToken = await ref.storage.getAuthToken();
  const requestInfo = requestsUpdateMetadata(
    ref.storage,
    ref._location,
    metadata,
    getMappings()
  );
  return ref.storage.makeRequest(requestInfo, authToken).getPromise();
}

/**
 * Returns the download URL for the given Reference.
 * @public
 * @returns A promise that resolves with the download
 *     URL for this object.
 */
export async function getDownloadURL(ref: Reference): Promise<string> {
  ref._throwIfRoot('getDownloadURL');
  const authToken = await ref.storage.getAuthToken();
  const requestInfo = requestsGetDownloadUrl(
    ref.storage,
    ref._location,
    getMappings()
  );
  return ref.storage
    .makeRequest(requestInfo, authToken)
    .getPromise()
    .then(url => {
      if (url === null) {
        throw noDownloadURL();
      }
      return url;
    });
}

/**
 * Deletes the object at this location.
 * @public
 * @param ref - Storage Reference for object to delete.
 * @returns A promise that resolves if the deletion succeeds.
 */
export async function deleteObject(ref: Reference): Promise<void> {
  ref._throwIfRoot('deleteObject');
  const authToken = await ref.storage.getAuthToken();
  const requestInfo = requestsDeleteObject(ref.storage, ref._location);
  return ref.storage.makeRequest(requestInfo, authToken).getPromise();
}

/**
 * Returns reference for object obtained by appending `childPath` to `ref`.
 * @internal
 *
 * @param ref - Storage Reference to get child of.
 * @param childPath - Child path from provided ref.
 * @returns A reference to the object obtained by
 * appending childPath, removing any duplicate, beginning, or trailing
 * slashes.
 */
export function getChild(ref: Reference, childPath: string): Reference {
  const newPath = child(ref._location.path, childPath);
  const location = new Location(ref._location.bucket, newPath);
  return new Reference(ref.storage, location);
}
