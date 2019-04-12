/**
 * @license
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

import { FirebaseApp, FirebaseNamespace } from '@firebase/app-types';
import { Observer, Unsubscribe } from '@firebase/util';

export interface FullMetadata extends UploadMetadata {
  bucket: string;
  fullPath: string;
  generation: string;
  metageneration: string;
  name: string;
  size: number;
  timeCreated: string;
  updated: string;
}

export interface Reference {
  bucket: string;
  child(path: string): Reference;
  delete(): Promise<void>;
  fullPath: string;
  getDownloadURL(): Promise<string>;
  getMetadata(): Promise<FullMetadata>;
  name: string;
  parent: Reference | null;
  put(
    data: Blob | Uint8Array | ArrayBuffer,
    metadata?: UploadMetadata
  ): UploadTask;
  putString(
    data: string,
    format?: StringFormat,
    metadata?: UploadMetadata
  ): UploadTask;
  root: Reference;
  storage: Storage;
  toString(): string;
  updateMetadata(metadata: SettableMetadata): Promise<FullMetadata>;
}

export interface SettableMetadata {
  cacheControl?: string | null;
  contentDisposition?: string | null;
  contentEncoding?: string | null;
  contentLanguage?: string | null;
  contentType?: string | null;
  customMetadata?: {
    [/* warning: coerced from ? */ key: string]: string;
  } | null;
}

export type StringFormat = string;
export type TaskEvent = string;
export type TaskState = string;

export interface UploadMetadata extends SettableMetadata {
  md5Hash?: string | null;
}

export interface UploadTask {
  cancel(): boolean;
  catch(onRejected: (a: Error) => any): Promise<any>;
  on(
    event: TaskEvent,
    nextOrObserver?:
      | Observer<UploadTaskSnapshot>
      | null
      | ((a: UploadTaskSnapshot) => any),
    error?: ((a: Error) => any) | null,
    complete?: (Unsubscribe) | null
  ): Function;
  pause(): boolean;
  resume(): boolean;
  snapshot: UploadTaskSnapshot;
  then(
    onFulfilled?: ((a: UploadTaskSnapshot) => any) | null,
    onRejected?: ((a: Error) => any) | null
  ): Promise<any>;
}

export interface UploadTaskSnapshot {
  bytesTransferred: number;
  metadata: FullMetadata;
  ref: Reference;
  state: TaskState;
  task: UploadTask;
  totalBytes: number;
}

export class FirebaseStorage {
  private constructor();

  app: FirebaseApp;
  maxOperationRetryTime: number;
  maxUploadRetryTime: number;
  ref(path?: string): Reference;
  refFromURL(url: string): Reference;
  setMaxOperationRetryTime(time: number): void;
  setMaxUploadRetryTime(time: number): void;
}
