/**
* Copyright 2017 Google Inc.
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
import * as args from './implementation/args';
import { AuthWrapper } from './implementation/authwrapper';
import { FbsBlob } from './implementation/blob';
import * as errorsExports from './implementation/error';
import { errors } from './implementation/error';
import { Location } from './implementation/location';
import * as metadata from './implementation/metadata';
import * as object from './implementation/object';
import * as path from './implementation/path';
import * as requests from './implementation/requests';
import * as fbsString from './implementation/string';
import { StringFormat } from './implementation/string';
import * as type from './implementation/type';
import { Metadata } from './metadata';
import { Service } from './service';
import { UploadTask } from './task';

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

  constructor(protected authWrapper: AuthWrapper, location: string | Location) {
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
    args.validate('toString', [], arguments);
    return 'gs://' + this.location.bucket + '/' + this.location.path;
  }

  protected newRef(authWrapper: AuthWrapper, location: Location): Reference {
    return new Reference(authWrapper, location);
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
    args.validate('child', [args.stringSpec()], arguments);
    let newPath = path.child(this.location.path, childPath);
    let location = new Location(this.location.bucket, newPath);
    return this.newRef(this.authWrapper, location);
  }

  /**
   * @return A reference to the parent of the
   *     current object, or null if the current object is the root.
   */
  get parent(): Reference | null {
    let newPath = path.parent(this.location.path);
    if (newPath === null) {
      return null;
    }
    let location = new Location(this.location.bucket, newPath);
    return this.newRef(this.authWrapper, location);
  }

  /**
   * @return An reference to the root of this
   *     object's bucket.
   */
  get root(): Reference {
    let location = new Location(this.location.bucket, '');
    return this.newRef(this.authWrapper, location);
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

  get storage(): Service {
    return this.authWrapper.service();
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
    args.validate(
      'put',
      [args.uploadDataSpec(), args.metadataSpec(true)],
      arguments
    );
    this.throwIfRoot_('put');
    return new UploadTask(
      this,
      this.authWrapper,
      this.location,
      this.mappings(),
      new FbsBlob(data),
      metadata
    );
  }

  /**
   * Uploads a string to this object's location.
   * @param string The string to upload.
   * @param opt_format The format of the string to upload.
   * @return An UploadTask that lets you control and
   *     observe the upload.
   */
  putString(
    string: string,
    format: StringFormat = StringFormat.RAW,
    opt_metadata?: Metadata
  ): UploadTask {
    args.validate(
      'putString',
      [
        args.stringSpec(),
        args.stringSpec(fbsString.formatValidator, true),
        args.metadataSpec(true)
      ],
      arguments
    );
    this.throwIfRoot_('putString');
    let data = fbsString.dataFromString(format, string);
    let metadata = object.clone<Metadata>(opt_metadata);
    if (!type.isDef(metadata['contentType']) && type.isDef(data.contentType)) {
      metadata['contentType'] = data.contentType;
    }
    return new UploadTask(
      this,
      this.authWrapper,
      this.location,
      this.mappings(),
      new FbsBlob(data.data, true),
      metadata
    );
  }

  /**
   * Deletes the object at this location.
   * @return A promise that resolves if the deletion succeeds.
   */
  delete(): Promise<void> {
    args.validate('delete', [], arguments);
    this.throwIfRoot_('delete');
    let self = this;
    return this.authWrapper.getAuthToken().then(function(authToken) {
      let requestInfo = requests.deleteObject(self.authWrapper, self.location);
      return self.authWrapper.makeRequest(requestInfo, authToken).getPromise();
    });
  }

  /**
   *     A promise that resolves with the metadata for this object. If this
   *     object doesn't exist or metadata cannot be retreived, the promise is
   *     rejected.
   */
  getMetadata(): Promise<Metadata> {
    args.validate('getMetadata', [], arguments);
    this.throwIfRoot_('getMetadata');
    let self = this;
    return this.authWrapper.getAuthToken().then(function(authToken) {
      let requestInfo = requests.getMetadata(
        self.authWrapper,
        self.location,
        self.mappings()
      );
      return self.authWrapper.makeRequest(requestInfo, authToken).getPromise();
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
    args.validate('updateMetadata', [args.metadataSpec()], arguments);
    this.throwIfRoot_('updateMetadata');
    let self = this;
    return this.authWrapper.getAuthToken().then(function(authToken) {
      let requestInfo = requests.updateMetadata(
        self.authWrapper,
        self.location,
        metadata,
        self.mappings()
      );
      return self.authWrapper.makeRequest(requestInfo, authToken).getPromise();
    });
  }

  /**
   * @return A promise that resolves with the download
   *     URL for this object.
   */
  getDownloadURL(): Promise<string> {
    args.validate('getDownloadURL', [], arguments);
    this.throwIfRoot_('getDownloadURL');
    return this.getMetadata().then(function(metadata) {
      let url = (metadata['downloadURLs'] as string[])[0];
      if (type.isDef(url)) {
        return url;
      } else {
        throw errorsExports.noDownloadURL();
      }
    });
  }

  private throwIfRoot_(name: string) {
    if (this.location.path === '') {
      throw errorsExports.invalidRootOperation(name);
    }
  }
}
