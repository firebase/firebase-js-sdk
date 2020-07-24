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
import * as errorsExports from './implementation/error';
import { Location } from './implementation/location';
import * as metadata from './implementation/metadata';
import * as path from './implementation/path';
import * as requests from './implementation/requests';
import {
  StringFormat,
  formatValidator,
  dataFromString
} from './implementation/string';
import * as type from './implementation/type';
import { Metadata } from './metadata';
import { StorageService } from './service';
import { UploadTask } from './task';
import { ListOptions, ListResult } from './list';
import {
  listOptionSpec,
  stringSpec,
  validate,
  metadataSpec,
  uploadDataSpec
} from './implementation/args';

/**
 * Provides methods to interact with a bucket in the Firebase Storage service.
 * @param location An fbs.location, or the URL at
 *     which to base this object, in one of the following forms:
 *         gs://<bucket>/<object-path>
 *         http[s]://firebasestorage.googleapis.com/
 *                     <api-version>/b/<bucket>/o/<object-path>
 *     Any query or fragment strings will be ignored in the http[s]
 *     format. If no value is passed, the storage object will use a URL based on
 *     the project ID of the base firebase.App instance.
 */
export class Reference {
  protected location: Location;

  constructor(protected service: StorageService, location: string | Location) {
    if (location instanceof Location) {
      this.location = location;
    } else {
      this.location = Location.makeFromUrl(location);
    }
  }

  /**
   * @return The URL for the bucket and path this object references,
   *     in the form gs://<bucket>/<object-path>
   * @override
   */
  toString(): string {
    validate('toString', [], arguments);
    return 'gs://' + this.location.bucket + '/' + this.location.path;
  }

  protected newRef(service: StorageService, location: Location): Reference {
    return new Reference(service, location);
  }

  protected mappings(): metadata.Mappings {
    return metadata.getMappings();
  }

  /**
   * @return A reference to the object obtained by
   *     appending childPath, removing any duplicate, beginning, or trailing
   *     slashes.
   */
  child(childPath: string): Reference {
    validate('child', [stringSpec()], arguments);
    const newPath = path.child(this.location.path, childPath);
    const location = new Location(this.location.bucket, newPath);
    return this.newRef(this.service, location);
  }

  /**
   * @return A reference to the parent of the
   *     current object, or null if the current object is the root.
   */
  get parent(): Reference | null {
    const newPath = path.parent(this.location.path);
    if (newPath === null) {
      return null;
    }
    const location = new Location(this.location.bucket, newPath);
    return this.newRef(this.service, location);
  }

  /**
   * @return An reference to the root of this
   *     object's bucket.
   */
  get root(): Reference {
    const location = new Location(this.location.bucket, '');
    return this.newRef(this.service, location);
  }

  get bucket(): string {
    return this.location.bucket;
  }

  get fullPath(): string {
    return this.location.path;
  }

  get name(): string {
    return path.lastComponent(this.location.path);
  }

  get storage(): StorageService {
    return this.service;
  }

  /**
   * Uploads a blob to this object's location.
   * @param data The blob to upload.
   * @return An UploadTask that lets you control and
   *     observe the upload.
   */
  put(
    data: Blob | Uint8Array | ArrayBuffer,
    metadata: Metadata | null = null
  ): UploadTask {
    validate('put', [uploadDataSpec(), metadataSpec(true)], arguments);
    this.throwIfRoot_('put');
    return new UploadTask(
      this,
      this.service,
      this.location,
      this.mappings(),
      new FbsBlob(data),
      metadata
    );
  }

  /**
   * Uploads a string to this object's location.
   * @param value The string to upload.
   * @param format The format of the string to upload.
   * @return An UploadTask that lets you control and
   *     observe the upload.
   */
  putString(
    value: string,
    format: StringFormat = StringFormat.RAW,
    metadata?: Metadata
  ): UploadTask {
    validate(
      'putString',
      [stringSpec(), stringSpec(formatValidator, true), metadataSpec(true)],
      arguments
    );
    this.throwIfRoot_('putString');
    const data = dataFromString(format, value);
    const metadataClone = Object.assign({}, metadata);
    if (
      !type.isDef(metadataClone['contentType']) &&
      type.isDef(data.contentType)
    ) {
      metadataClone['contentType'] = data.contentType!;
    }
    return new UploadTask(
      this,
      this.service,
      this.location,
      this.mappings(),
      new FbsBlob(data.data, true),
      metadataClone
    );
  }

  /**
   * Deletes the object at this location.
   * @return A promise that resolves if the deletion succeeds.
   */
  delete(): Promise<void> {
    validate('delete', [], arguments);
    this.throwIfRoot_('delete');
    return this.service.getAuthToken().then(authToken => {
      const requestInfo = requests.deleteObject(this.service, this.location);
      return this.service.makeRequest(requestInfo, authToken).getPromise();
    });
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
   * @return A Promise that resolves with all the items and prefixes under
   *      the current storage reference. `prefixes` contains references to
   *      sub-directories and `items` contains references to objects in this
   *      folder. `nextPageToken` is never returned.
   */
  listAll(): Promise<ListResult> {
    validate('listAll', [], arguments);
    const accumulator = {
      prefixes: [],
      items: []
    };
    return this.listAllHelper(accumulator).then(() => accumulator);
  }

  private async listAllHelper(
    accumulator: ListResult,
    pageToken?: string
  ): Promise<void> {
    const opt: ListOptions = {
      // maxResults is 1000 by default.
      pageToken
    };
    const nextPage = await this.list(opt);
    accumulator.prefixes.push(...nextPage.prefixes);
    accumulator.items.push(...nextPage.items);
    if (nextPage.nextPageToken != null) {
      await this.listAllHelper(accumulator, nextPage.nextPageToken);
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
   *
   * @param options See ListOptions for details.
   * @return A Promise that resolves with the items and prefixes.
   *      `prefixes` contains references to sub-folders and `items`
   *      contains references to objects in this folder. `nextPageToken`
   *      can be used to get the rest of the results.
   */
  list(options?: ListOptions | null): Promise<ListResult> {
    validate('list', [listOptionSpec(true)], arguments);
    const self = this;
    return this.service.getAuthToken().then(authToken => {
      const op = options || {};
      const requestInfo = requests.list(
        self.service,
        self.location,
        /*delimiter= */ '/',
        op.pageToken,
        op.maxResults
      );
      return self.service.makeRequest(requestInfo, authToken).getPromise();
    });
  }

  /**
   *     A promise that resolves with the metadata for this object. If this
   *     object doesn't exist or metadata cannot be retreived, the promise is
   *     rejected.
   */
  getMetadata(): Promise<Metadata> {
    validate('getMetadata', [], arguments);
    this.throwIfRoot_('getMetadata');
    return this.service.getAuthToken().then(authToken => {
      const requestInfo = requests.getMetadata(
        this.service,
        this.location,
        this.mappings()
      );
      return this.service.makeRequest(requestInfo, authToken).getPromise();
    });
  }

  /**
   * Updates the metadata for this object.
   * @param metadata The new metadata for the object.
   *     Only values that have been explicitly set will be changed. Explicitly
   *     setting a value to null will remove the metadata.
   * @return A promise that resolves
   *     with the new metadata for this object.
   *     @see firebaseStorage.Reference.prototype.getMetadata
   */
  updateMetadata(metadata: Metadata): Promise<Metadata> {
    validate('updateMetadata', [metadataSpec()], arguments);
    this.throwIfRoot_('updateMetadata');
    return this.service.getAuthToken().then(authToken => {
      const requestInfo = requests.updateMetadata(
        this.service,
        this.location,
        metadata,
        this.mappings()
      );
      return this.service.makeRequest(requestInfo, authToken).getPromise();
    });
  }

  /**
   * @return A promise that resolves with the download
   *     URL for this object.
   */
  getDownloadURL(): Promise<string> {
    validate('getDownloadURL', [], arguments);
    this.throwIfRoot_('getDownloadURL');
    return this.service.getAuthToken().then(authToken => {
      const requestInfo = requests.getDownloadUrl(
        this.service,
        this.location,
        this.mappings()
      );
      return this.service
        .makeRequest(requestInfo, authToken)
        .getPromise()
        .then(url => {
          if (url === null) {
            throw errorsExports.noDownloadURL();
          }
          return url;
        });
    });
  }

  private throwIfRoot_(name: string): void {
    if (this.location.path === '') {
      throw errorsExports.invalidRootOperation(name);
    }
  }
}
