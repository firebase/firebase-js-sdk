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
import { debounceTime, map, shareReplay } from 'rxjs/operators';

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
    // emit the current state of the task
    progress(task.snapshot);
    // emit progression of the task
    const unsubscribeFromOnStateChanged = task.on('state_changed', progress);
    // use the promise form of task, to get the last success snapshot
    task.then(
      snapshot => {
        progress(snapshot);
        complete();
      },
      e => {
        progress(task.snapshot);
        error(e);
      }
    );
    // the unsubscribe method returns by storage isn't typed in the
    // way rxjs expects, Function vs () => void, so wrap it
    return function unsubscribe() {
      unsubscribeFromOnStateChanged();
    };
  }).pipe(
    // since we're emitting first the current snapshot and then progression
    // it's possible that we could double fire synchronously; namely when in
    // a terminal state (success, error, canceled). Debounce to address.
    debounceTime(0)
  );
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
  return new Observable<UploadTaskSnapshot>(subscriber => {
    const task = ref.put(data, metadata);
    return fromTask(task).subscribe(subscriber).add(task.cancel);
  }).pipe(shareReplay({ bufferSize: 1, refCount: true }));
}

export function putString(
  ref: Reference,
  data: string,
  format?: StringFormat,
  metadata?: UploadMetadata
): Observable<UploadTaskSnapshot> {
  return new Observable<UploadTaskSnapshot>(subscriber => {
    const task = ref.putString(data, format, metadata);
    return fromTask(task).subscribe(subscriber).add(task.cancel);
  }).pipe(shareReplay({ bufferSize: 1, refCount: true }));
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
