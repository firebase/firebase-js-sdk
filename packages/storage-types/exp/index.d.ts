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

import { FirebaseApp, _FirebaseService } from '@firebase/app-types-exp';
import { CompleteFn, FirebaseError, NextFn, Unsubscribe } from '@firebase/util';

export interface StorageService {
  readonly app: FirebaseApp;
  maxUploadRetryTime: number;
  maxOperationRetryTime: number;
}

export interface StorageReference {
  /**
   * @returns The URL for the bucket and path this object references,
   *     in the form gs://<bucket>/<object-path>
   * @override
   */
  toString(): string;
  /**
   * @returns An reference to the root of this
   *     object's bucket.
   */
  root: StorageReference;
  bucket: string;
  fullPath: string;
  name: string;
  storage: StorageService;
  parent: StorageReference | null;
}

/**
 * The options `list()` accepts.
 */
export interface ListOptions {
  maxResults?: number | null;
  pageToken?: string | null;
}

/**
 * Result returned by list().
 */
export interface ListResult {
  prefixes: StorageReference[];
  items: StorageReference[];
  nextPageToken?: string;
}

/**
 * The full set of object metadata, including read-only properties.
 */
export interface Metadata {
  bucket: string;
  fullPath: string;
  generation: string;
  metageneration: string;
  name: string;
  size: number;
  timeCreated: string;
  updated: string;
  type: string | undefined;
  md5Hash: string | undefined;
  cacheControl: string | undefined;
  contentDisposition: string | undefined;
  contentEncoding: string | undefined;
  contentLanguage: string | undefined;
  contentType: string | undefined;
  downloadTokens: string[] | undefined;
  customMetadata:
    | {
        [key: string]: string;
      }
    | undefined;
  ref: StorageReference | undefined;
  [prop: string]: unknown;
}

export type StringFormat = string;
export type TaskEvent = string;
export type TaskState = string;

interface FirebaseStorageError extends FirebaseError {
  serverResponse: string | null;
}

export interface StorageObserver<T> {
  next?: NextFn<T> | null;
  error?: (error: FirebaseStorageError) => void | null;
  complete?: CompleteFn | null;
}

export interface UploadTask {
  cancel(): boolean;
  catch(onRejected: (error: FirebaseStorageError) => any): Promise<any>;
  on(
    event: TaskEvent,
    nextOrObserver?:
      | StorageObserver<UploadTaskSnapshot>
      | null
      | ((snapshot: UploadTaskSnapshot) => any),
    error?: ((a: FirebaseStorageError) => any) | null,
    complete?: Unsubscribe | null
  ): Function;
  pause(): boolean;
  resume(): boolean;
  snapshot: UploadTaskSnapshot;
  then(
    onFulfilled?: ((snapshot: UploadTaskSnapshot) => any) | null,
    onRejected?: ((error: FirebaseStorageError) => any) | null
  ): Promise<any>;
}

export interface UploadTaskSnapshot {
  bytesTransferred: number;
  metadata: Metadata;
  ref: StorageReference;
  state: TaskState;
  task: UploadTask;
  totalBytes: number;
}

export interface UploadResult {
  readonly metadata: Metadata;
  readonly ref: StorageReference;
}

export class FirebaseStorage {
  private constructor();

  app: FirebaseApp;
  maxOperationRetryTime: number;
  maxUploadRetryTime: number;
  ref(path?: string): StorageReference;
  refFromURL(url: string): StorageReference;
  setMaxOperationRetryTime(time: number): void;
  setMaxUploadRetryTime(time: number): void;
}

declare module '@firebase/component' {
  interface NameServiceMapping {
    'storage-exp': StorageService;
  }
}
