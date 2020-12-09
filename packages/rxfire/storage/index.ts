/**
 * @license
 * Copyright 2018 Google LLC
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

import firebase from 'firebase/app';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

type UploadTaskSnapshot = firebase.storage.UploadTaskSnapshot;
type Reference = firebase.storage.Reference;
type UploadMetadata = firebase.storage.UploadMetadata;
type StringFormat = firebase.storage.StringFormat;
type UploadTask = firebase.storage.UploadTask;

export function fromTask(
  task: firebase.storage.UploadTask
): Observable<UploadTaskSnapshot> {
  return new Observable<UploadTaskSnapshot>(subscriber => {
    const progress = (snap: UploadTaskSnapshot): void => subscriber.next(snap);
    const error = (e: Error): void => subscriber.error(e);
    const complete = (): void => subscriber.complete();
    task.on('state_changed', progress, error, complete);
    return () => task.cancel();
  });
}

export function getDownloadURL(ref: Reference): Observable<string> {
  return from(ref.getDownloadURL());
}

// TODO: fix storage typing in firebase, then apply the same fix here
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getMetadata(ref: Reference): Observable<any> {
  return from(ref.getMetadata());
}

export function put(
  ref: Reference,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any,
  metadata?: UploadMetadata
): Observable<UploadTaskSnapshot> {
  return fromTask(ref.put(data, metadata));
}

export function putString(
  ref: Reference,
  data: string,
  format?: StringFormat,
  metadata?: UploadMetadata
): Observable<UploadTaskSnapshot> {
  return fromTask(ref.putString(data, format, metadata));
}

export function percentage(
  task: UploadTask
): Observable<{
  progress: number;
  snapshot: UploadTaskSnapshot;
}> {
  return fromTask(task).pipe(
    map(s => ({
      progress: (s.bytesTransferred / s.totalBytes) * 100,
      snapshot: s
    }))
  );
}
